'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id                  TEXT PRIMARY KEY,
      name                VARCHAR NOT NULL UNIQUE,
      gender              VARCHAR NOT NULL,
      gender_probability  FLOAT NOT NULL,
      age                 INT NOT NULL,
      age_group           VARCHAR NOT NULL,
      country_id          VARCHAR(2) NOT NULL,
      country_name        VARCHAR NOT NULL,
      country_probability FLOAT NOT NULL,
      created_at          TEXT NOT NULL
    )
  `);

  // indexes for fast filtered queries
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_gender      ON profiles(gender)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_age_group   ON profiles(age_group)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_country_id  ON profiles(country_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_age         ON profiles(age)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_created_at  ON profiles(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_gender_prob ON profiles(gender_probability)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_country_prob ON profiles(country_probability)`);
}

const ALLOWED_SORT   = new Set(['age', 'created_at', 'gender_probability']);
const ALLOWED_ORDER  = new Set(['asc', 'desc']);

async function findAll(opts = {}) {
  const {
    gender, age_group, country_id,
    min_age, max_age,
    min_gender_probability, min_country_probability,
    sort_by = 'created_at', order = 'asc',
    page = 1, limit = 10,
  } = opts;

  const conditions = [];
  const values     = [];
  let   i          = 1;

  if (gender)                  { conditions.push(`LOWER(gender) = $${i++}`);            values.push(gender.toLowerCase()); }
  if (age_group)               { conditions.push(`LOWER(age_group) = $${i++}`);         values.push(age_group.toLowerCase()); }
  if (country_id)              { conditions.push(`UPPER(country_id) = $${i++}`);        values.push(country_id.toUpperCase()); }
  if (min_age   !== undefined) { conditions.push(`age >= $${i++}`);                     values.push(Number(min_age)); }
  if (max_age   !== undefined) { conditions.push(`age <= $${i++}`);                     values.push(Number(max_age)); }
  if (min_gender_probability !== undefined)  { conditions.push(`gender_probability >= $${i++}`);  values.push(Number(min_gender_probability)); }
  if (min_country_probability !== undefined) { conditions.push(`country_probability >= $${i++}`); values.push(Number(min_country_probability)); }

  const where    = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeSort = ALLOWED_SORT.has(sort_by)  ? sort_by  : 'created_at';
  const safeOrd  = ALLOWED_ORDER.has(order)   ? order    : 'asc';
  const offset   = (page - 1) * limit;

  const countRes = await pool.query(`SELECT COUNT(*) FROM profiles ${where}`, values);
  const total    = parseInt(countRes.rows[0].count, 10);

  const dataRes  = await pool.query(
    `SELECT * FROM profiles ${where} ORDER BY ${safeSort} ${safeOrd} LIMIT $${i++} OFFSET $${i++}`,
    [...values, limit, offset]
  );

  return { total, rows: dataRes.rows };
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByName(name) {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE name = $1', [name]);
  return rows[0] || null;
}

async function insert(profile) {
  await pool.query(
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
}

async function deleteById(id) {
  const { rowCount } = await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { init, findAll, findById, findByName, insert, deleteById, pool };
