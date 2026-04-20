'use strict';

const COUNTRIES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AO: 'Angola', AR: 'Argentina',
  AM: 'Armenia', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas',
  BH: 'Bahrain', BD: 'Bangladesh', BY: 'Belarus', BE: 'Belgium', BJ: 'Benin',
  BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', CM: 'Cameroon', CA: 'Canada',
  CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CO: 'Colombia', CG: 'Congo', CD: 'Democratic Republic of the Congo',
  CR: 'Costa Rica', HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic',
  DK: 'Denmark', DJ: 'Djibouti', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', ET: 'Ethiopia', FI: 'Finland', FR: 'France', GA: 'Gabon',
  GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana', GR: 'Greece',
  GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau', HT: 'Haiti', HN: 'Honduras',
  HU: 'Hungary', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan',
  JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KW: 'Kuwait', KG: 'Kyrgyzstan',
  LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libya', LT: 'Lithuania', LU: 'Luxembourg', MG: 'Madagascar', MW: 'Malawi',
  MY: 'Malaysia', ML: 'Mali', MR: 'Mauritania', MX: 'Mexico', MD: 'Moldova',
  MN: 'Mongolia', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia',
  NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua', NE: 'Niger',
  NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan', PA: 'Panama',
  PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru', PH: 'Philippines',
  PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RU: 'Russia',
  RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SL: 'Sierra Leone',
  SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka',
  SD: 'Sudan', SZ: 'Eswatini', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria',
  TW: 'Taiwan', TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TG: 'Togo',
  TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan', UG: 'Uganda', UA: 'Ukraine',
  AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States',
  UY: 'Uruguay', UZ: 'Uzbekistan', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen',
  ZM: 'Zambia', ZW: 'Zimbabwe',
};

// name → ISO (lowercase keys for case-insensitive lookup)
const NAME_TO_CODE = {};
for (const [code, name] of Object.entries(COUNTRIES)) {
  NAME_TO_CODE[name.toLowerCase()] = code;
}

// extra aliases
const ALIASES = {
  'usa': 'US', 'united states of america': 'US', 'america': 'US',
  'uk': 'GB', 'britain': 'GB', 'england': 'GB',
  'uae': 'AE', 'emirates': 'AE',
  'drc': 'CD', 'congo dr': 'CD', 'dr congo': 'CD',
  'russia': 'RU', 'iran': 'IR', 'south korea': 'KR', 'north korea': 'KP',
  'korea': 'KR', 'ivory coast': 'CI', "cote d'ivoire": 'CI',
  'tanzania': 'TZ', 'czechia': 'CZ',
};

function getCodeByName(name) {
  const lower = name.toLowerCase().trim();
  return ALIASES[lower] || NAME_TO_CODE[lower] || null;
}

function getNameByCode(code) {
  return COUNTRIES[code.toUpperCase()] || code;
}

module.exports = { getCodeByName, getNameByCode, COUNTRIES };
