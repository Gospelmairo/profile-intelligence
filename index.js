'use strict';

const express        = require('express');
const axios          = require('axios');
const cors           = require('cors');
const { v7: uuidv7 } = require('uuid');
const db             = require('./db');
const { parseQuery } = require('./nlp');
const { getNameByCode } = require('./countries');

const app = express();
app.use(cors({ origin: '*' }));
app.use((_, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); });
app.use(express.json());

function utcNow()      { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function err(msg)      { return { status: 'error', message: msg }; }
function classifyAge(a){ return a<=12?'child':a<=19?'teenager':a<=59?'adult':'senior'; }

function fmt(p) {
  return {
    id:                  p.id,
    name:                p.name,
    gender:              p.gender,
    gender_probability:  Number(p.gender_probability),
    age:                 Number(p.age),
    age_group:           p.age_group,
    country_id:          p.country_id,
    country_name:        p.country_name,
    country_probability: Number(p.country_probability),
    created_at:          p.created_at,
  };
}

function parsePagination(query) {
  let page  = parseInt(query.page,  10) || 1;
  let limit = parseInt(query.limit, 10) || 10;
  if (page  < 1)  page  = 1;
  if (limit < 1)  limit = 10;
  if (limit > 50) limit = 50;
  return { page, limit };
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.json({ status: 'success', message: 'Profile Intelligence API' }));

// ── GET /api/profiles/search  (must be before /:id route) ────────────────────
app.get('/api/profiles/search', async (req, res) => {
  const q = req.query.q;
  if (!q || !q.trim()) {
    return res.status(400).json(err('Missing query parameter: q'));
  }

  const filters = parseQuery(q);
  if (!filters) {
    return res.status(400).json(err('Unable to interpret query'));
  }

  const { page, limit } = parsePagination(req.query);

  try {
    const { total, rows } = await db.findAll({ ...filters, page, limit });
    return res.json({ status: 'success', page, limit, total, data: rows.map(fmt) });
  } catch (e) {
    console.error(e);
    return res.status(500).json(err('Internal server error'));
  }
});

// ── GET /api/profiles ─────────────────────────────────────────────────────────
app.get('/api/profiles', async (req, res) => {
  const VALID_PARAMS = new Set([
    'gender','age_group','country_id','min_age','max_age',
    'min_gender_probability','min_country_probability',
    'sort_by','order','page','limit',
  ]);

  const unknown = Object.keys(req.query).filter(k => !VALID_PARAMS.has(k));
  if (unknown.length) {
    return res.status(400).json(err('Invalid query parameters'));
  }

  const { sort_by, order } = req.query;
  const ALLOWED_SORT  = ['age','created_at','gender_probability'];
  const ALLOWED_ORDER = ['asc','desc'];
  if (sort_by && !ALLOWED_SORT.includes(sort_by))   return res.status(400).json(err('Invalid query parameters'));
  if (order   && !ALLOWED_ORDER.includes(order))    return res.status(400).json(err('Invalid query parameters'));

  const { page, limit } = parsePagination(req.query);

  const opts = {
    gender:                  req.query.gender      || undefined,
    age_group:               req.query.age_group   || undefined,
    country_id:              req.query.country_id  || undefined,
    min_age:                 req.query.min_age      !== undefined ? Number(req.query.min_age)      : undefined,
    max_age:                 req.query.max_age      !== undefined ? Number(req.query.max_age)      : undefined,
    min_gender_probability:  req.query.min_gender_probability  !== undefined ? Number(req.query.min_gender_probability)  : undefined,
    min_country_probability: req.query.min_country_probability !== undefined ? Number(req.query.min_country_probability) : undefined,
    sort_by:  sort_by || 'created_at',
    order:    order   || 'asc',
    page,
    limit,
  };

  try {
    const { total, rows } = await db.findAll(opts);
    return res.json({ status: 'success', page, limit, total, data: rows.map(fmt) });
  } catch (e) {
    console.error(e);
    return res.status(500).json(err('Internal server error'));
  }
});

// ── GET /api/profiles/:id ─────────────────────────────────────────────────────
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await db.findById(req.params.id);
    if (!profile) return res.status(404).json(err('Profile not found'));
    return res.json({ status: 'success', data: fmt(profile) });
  } catch (e) {
    console.error(e);
    return res.status(500).json(err('Internal server error'));
  }
});

// ── POST /api/profiles ────────────────────────────────────────────────────────
app.post('/api/profiles', async (req, res) => {
  const { name } = req.body;

  if (name === undefined || name === null || name === '') {
    return res.status(400).json(err('Name is required'));
  }
  if (typeof name !== 'string') {
    return res.status(422).json(err('Name must be a string'));
  }

  const norm = name.trim().toLowerCase();
  if (!norm) return res.status(400).json(err('Name must not be blank'));

  try {
    const existing = await db.findByName(norm);
    if (existing) {
      return res.status(200).json({ status: 'success', message: 'Profile already exists', data: fmt(existing) });
    }
  } catch (e) {
    return res.status(500).json(err('Internal server error'));
  }

  let gData, aData, nData;
  try {
    const [g, a, n] = await Promise.all([
      axios.get(`https://api.genderize.io/?name=${encodeURIComponent(norm)}`),
      axios.get(`https://api.agify.io/?name=${encodeURIComponent(norm)}`),
      axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(norm)}`),
    ]);
    gData = g.data; aData = a.data; nData = n.data;
  } catch (e) {
    return res.status(502).json(err('External API returned an error'));
  }

  if (!gData.gender || gData.count === 0) return res.status(502).json(err('Genderize returned an invalid response'));
  if (aData.age == null)                  return res.status(502).json(err('Agify returned an invalid response'));
  if (!nData.country || !nData.country.length) return res.status(502).json(err('Nationalize returned an invalid response'));

  const top         = nData.country.reduce((b, c) => c.probability > b.probability ? c : b);
  const country_id  = top.country_id;
  const profile     = {
    id: uuidv7(), name: norm,
    gender: gData.gender, gender_probability: gData.probability, sample_size: gData.count,
    age: aData.age, age_group: classifyAge(aData.age),
    country_id, country_name: getNameByCode(country_id), country_probability: top.probability,
    created_at: utcNow(),
  };

  try {
    await db.insert(profile);
  } catch (e) {
    return res.status(500).json(err('Internal server error'));
  }

  return res.status(201).json({ status: 'success', data: fmt(profile) });
});

// ── DELETE /api/profiles/:id ──────────────────────────────────────────────────
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const deleted = await db.deleteById(req.params.id);
    if (!deleted) return res.status(404).json(err('Profile not found'));
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json(err('Internal server error'));
  }
});

// ── DB init (lazy, runs once per cold start) ──────────────────────────────────
let dbReady = false;
app.use(async (req, res, next) => {
  if (!dbReady) {
    try {
      await db.init();
      dbReady = true;
    } catch (e) {
      console.error('DB init failed:', e.message);
      return res.status(500).json(err('Database connection failed: ' + e.message));
    }
  }
  next();
});

// ── Start (local only) ────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  db.init().then(() => app.listen(PORT, () => console.log(`Listening on ${PORT}`))).catch(e => { console.error(e); process.exit(1); });
}

module.exports = app;
