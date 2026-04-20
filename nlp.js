'use strict';

const { getCodeByName } = require('./countries');

const GENDER_MALE   = ['male', 'males', 'man', 'men', 'boy', 'boys', 'gentleman', 'gentlemen'];
const GENDER_FEMALE = ['female', 'females', 'woman', 'women', 'girl', 'girls', 'lady', 'ladies'];
const AGE_GROUPS    = ['child', 'children', 'kid', 'kids', 'teenager', 'teenagers', 'teen', 'teens',
                       'adolescent', 'adolescents', 'adult', 'adults', 'senior', 'seniors', 'elderly', 'elder'];

const GROUP_MAP = {
  child: 'child', children: 'child', kid: 'child', kids: 'child',
  teenager: 'teenager', teenagers: 'teenager', teen: 'teenager', teens: 'teenager',
  adolescent: 'teenager', adolescents: 'teenager',
  adult: 'adult', adults: 'adult',
  senior: 'senior', seniors: 'senior', elderly: 'senior', elder: 'senior',
};

function parseQuery(q) {
  if (!q || !q.trim()) return null;

  const filters = {};
  const lower   = q.toLowerCase().trim();
  const words   = lower.split(/\s+/);

  // gender — if both male and female words appear, skip gender filter
  const hasMale   = words.some(w => GENDER_MALE.includes(w));
  const hasFemale = words.some(w => GENDER_FEMALE.includes(w));
  if (hasMale && !hasFemale)  filters.gender = 'male';
  if (hasFemale && !hasMale) filters.gender = 'female';

  // "young" → special age range 16-24 (NOT an age_group)
  if (words.includes('young') && !words.includes('younger')) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  // age_group keywords (only if "young" didn't already set a range)
  for (const w of words) {
    if (GROUP_MAP[w]) {
      filters.age_group = GROUP_MAP[w];
      break;
    }
  }

  // age modifiers: above/over/older than X → min_age, below/under/younger than X → max_age
  const aboveMatch = lower.match(/(?:above|over|older than|at least)\s+(\d+)/);
  const belowMatch = lower.match(/(?:below|under|younger than|at most)\s+(\d+)/);
  const betweenMatch = lower.match(/between\s+(\d+)\s+and\s+(\d+)/);

  if (betweenMatch) {
    filters.min_age = parseInt(betweenMatch[1], 10);
    filters.max_age = parseInt(betweenMatch[2], 10);
  } else {
    if (aboveMatch) filters.min_age = parseInt(aboveMatch[1], 10);
    if (belowMatch) filters.max_age = parseInt(belowMatch[1], 10);
  }

  // country: "from <country>" or "in <country>"
  const countryMatch = lower.match(/(?:from|in)\s+([a-z\s]+?)(?:\s+(?:who|where|with|above|below|over|under|aged?|and|$)|$)/);
  if (countryMatch) {
    const candidate = countryMatch[1].trim();
    // try progressively shorter phrases (handles trailing noise)
    const parts = candidate.split(' ');
    let found = null;
    for (let len = parts.length; len >= 1; len--) {
      const phrase = parts.slice(0, len).join(' ');
      const code   = getCodeByName(phrase);
      if (code) { found = code; break; }
    }
    if (found) filters.country_id = found;
  }

  // nothing parsed → uninterpretable
  if (Object.keys(filters).length === 0) return null;

  return filters;
}

module.exports = { parseQuery };
