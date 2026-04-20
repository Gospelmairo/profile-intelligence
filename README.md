# Profile Intelligence API

Insighta Labs — demographic intelligence query engine. Supports advanced filtering, sorting, pagination, and natural language search over 2026+ demographic profiles.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/profiles` | Create profile (calls Genderize, Agify, Nationalize) |
| `GET` | `/api/profiles` | List profiles with filters, sorting, pagination |
| `GET` | `/api/profiles/search?q=` | Natural language search |
| `GET` | `/api/profiles/:id` | Get single profile |
| `DELETE` | `/api/profiles/:id` | Delete profile |

---

## GET /api/profiles — filters & options

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | `male` or `female` |
| `age_group` | string | `child`, `teenager`, `adult`, `senior` |
| `country_id` | string | ISO 2-letter code e.g. `NG` |
| `min_age` | number | Minimum age (inclusive) |
| `max_age` | number | Maximum age (inclusive) |
| `min_gender_probability` | float | e.g. `0.9` |
| `min_country_probability` | float | e.g. `0.5` |
| `sort_by` | string | `age`, `created_at`, `gender_probability` |
| `order` | string | `asc` or `desc` (default `asc`) |
| `page` | number | Page number (default `1`) |
| `limit` | number | Results per page (default `10`, max `50`) |

---

## GET /api/profiles/search — natural language parsing

### How it works

The parser tokenises the query string, then applies keyword matching rules in order. No AI or LLMs are used.

### Supported keywords and mappings

| Keyword(s) | Maps to |
|---|---|
| `male`, `males`, `man`, `men`, `boy`, `boys` | `gender=male` |
| `female`, `females`, `woman`, `women`, `girl`, `girls` | `gender=female` |
| `male and female` (both present) | no gender filter |
| `child`, `children`, `kid`, `kids` | `age_group=child` |
| `teenager`, `teen`, `teens`, `adolescent` | `age_group=teenager` |
| `adult`, `adults` | `age_group=adult` |
| `senior`, `seniors`, `elderly`, `elder` | `age_group=senior` |
| `young` | `min_age=16` + `max_age=24` (not a stored group) |
| `above N`, `over N`, `older than N`, `at least N` | `min_age=N` |
| `below N`, `under N`, `younger than N`, `at most N` | `max_age=N` |
| `between N and M` | `min_age=N` + `max_age=M` |
| `from <country>`, `in <country>` | `country_id=<ISO code>` |

### Example queries

```
young males from nigeria         → gender=male, min_age=16, max_age=24, country_id=NG
females above 30                 → gender=female, min_age=30
people from angola               → country_id=AO
adult males from kenya           → gender=male, age_group=adult, country_id=KE
male and female teenagers above 17 → age_group=teenager, min_age=17
seniors in japan                 → age_group=senior, country_id=JP
```

### Limitations

- **Country matching** requires the full English country name after `from` or `in`. Adjectives like "Nigerian" or "Kenyan" are not supported.
- **"young"** is a special keyword mapping to ages 16–24. It cannot be combined with an explicit age group keyword in the same query.
- **Compound conditions** like "males over 30 but under 50" parse the first numeric match per direction — `above 30` and `under 50` both work together, but ambiguous phrasing may produce unexpected results.
- **No stemming or fuzzy matching** — typos (e.g. "femal") return an uninterpretable error.
- **"people", "person", "individuals"** are neutral words — they do not set a gender filter, which is correct.
- Queries where no keyword is recognised return `{ "status": "error", "message": "Unable to interpret query" }`.

---

## Deployment

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SSL` | Set `false` to disable SSL for local Postgres |
| `PORT` | HTTP port (default `3000`) |

### Seed the database

```bash
SEED_URL=https://your-seed-file.json npm run seed
```

Re-running seed is safe — duplicates are skipped via `ON CONFLICT DO NOTHING`.

### Deploy to Vercel

1. Push repo to GitHub (public)
2. Import in Vercel → add `DATABASE_URL` environment variable
3. Deploy — table and indexes are created automatically on first request
