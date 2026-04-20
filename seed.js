'use strict';

const axios          = require('axios');
const { v7: uuidv7 } = require('uuid');
const { init, insert, pool } = require('./db');
const { getNameByCode }      = require('./countries');

const SEED_URL = process.env.SEED_URL || process.argv[2];

function classifyAge(a) { return a<=12?'child':a<=19?'teenager':a<=59?'adult':'senior'; }
function utcNow()       { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }

async function seed() {
  if (!SEED_URL) {
    console.error('Usage: SEED_URL=<url> npm run seed   OR   node seed.js <url>');
    process.exit(1);
  }

  console.log('Initialising database...');
  await init();

  console.log(`Fetching seed data from: ${SEED_URL}`);
  const { data } = await axios.get(SEED_URL);
  const profiles  = Array.isArray(data) ? data : data.profiles || data.data;

  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.error('No profiles found in seed file.');
    process.exit(1);
  }

  console.log(`Seeding ${profiles.length} profiles...`);
  let inserted = 0;
  let skipped  = 0;

  for (const p of profiles) {
    const country_id   = p.country_id || p.countryId || '';
    const country_name = p.country_name || p.countryName || getNameByCode(country_id) || country_id;
    const age          = p.age ?? 0;

    const profile = {
      id:                  p.id || uuidv7(),
      name:                (p.name || '').toLowerCase().trim(),
      gender:              p.gender || '',
      gender_probability:  p.gender_probability ?? p.genderProbability ?? 0,
      age,
      age_group:           p.age_group || p.ageGroup || classifyAge(age),
      country_id:          country_id.toUpperCase(),
      country_name,
      country_probability: p.country_probability ?? p.countryProbability ?? 0,
      created_at:          p.created_at || p.createdAt || utcNow(),
    };

    if (!profile.name) { skipped++; continue; }

    try {
      const res = await pool.query(
        `INSERT INTO profiles
           (id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (name) DO NOTHING`,
        [
          profile.id, profile.name, profile.gender, profile.gender_probability,
          profile.age, profile.age_group, profile.country_id, profile.country_name,
          profile.country_probability, profile.created_at,
        ]
      );
      if (res.rowCount > 0) inserted++; else skipped++;
    } catch (e) {
      console.warn(`Skipping "${profile.name}": ${e.message}`);
      skipped++;
    }
  }

  console.log(`Done. Inserted: ${inserted} | Skipped/duplicate: ${skipped}`);
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
