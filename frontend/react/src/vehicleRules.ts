// Add Vehicle form rules (D-5, D-6, D-8, D-9). The server repeats the VIN and Carfax checks.

/** Makes shown first in the make dropdown, matched to the catalog ignoring case. */
const POPULAR_MAKES = [
  'TOYOTA', 'HONDA', 'FORD', 'CHEVROLET', 'NISSAN', 'HYUNDAI', 'KIA', 'MAZDA', 'SUBARU', 'VOLKSWAGEN',
  'JEEP', 'RAM', 'GMC', 'DODGE', 'TESLA', 'BMW', 'MERCEDES-BENZ', 'AUDI', 'LEXUS',
];

/** Splits catalog makes into the popular group (in POPULAR_MAKES order) and the full list. */
export function groupMakes(makes: string[]) {
  const byUpper = new Map(makes.map(m => [m.toUpperCase(), m]));
  const popular = POPULAR_MAKES.map(m => byUpper.get(m)).filter((m): m is string => !!m);
  return { popular, all: makes };
}

// Production years of common make/model pairs in North America: [first, last?]; no last means
// still built. Pairs not listed fall back to the full year range.
const MODEL_YEARS: Record<string, [number, number?]> = {
  'TOYOTA|COROLLA': [1968], 'TOYOTA|CAMRY': [1983], 'TOYOTA|RAV4': [1996], 'TOYOTA|HIGHLANDER': [2001],
  'TOYOTA|TACOMA': [1995], 'TOYOTA|TUNDRA': [2000], 'TOYOTA|SIENNA': [1998], 'TOYOTA|PRIUS': [2001],
  'TOYOTA|4RUNNER': [1984],
  'HONDA|CIVIC': [1973], 'HONDA|ACCORD': [1976], 'HONDA|CR-V': [1997], 'HONDA|HR-V': [2016],
  'HONDA|PILOT': [2003], 'HONDA|ODYSSEY': [1995], 'HONDA|FIT': [2007, 2020], 'HONDA|RIDGELINE': [2006],
  'FORD|F-150': [1975], 'FORD|ESCAPE': [2001], 'FORD|EXPLORER': [1991], 'FORD|MUSTANG': [1965],
  'FORD|EDGE': [2007, 2024], 'FORD|FOCUS': [2000, 2018], 'FORD|FUSION': [2006, 2020],
  'CHEVROLET|SILVERADO': [1999], 'CHEVROLET|EQUINOX': [2005], 'CHEVROLET|CRUZE': [2011, 2019],
  'CHEVROLET|TAHOE': [1995], 'CHEVROLET|TRAVERSE': [2009], 'CHEVROLET|BOLT EV': [2017, 2023],
  'NISSAN|ROGUE': [2008], 'NISSAN|ALTIMA': [1993], 'NISSAN|SENTRA': [1982], 'NISSAN|LEAF': [2011],
  'HYUNDAI|ELANTRA': [1991], 'HYUNDAI|TUCSON': [2005], 'HYUNDAI|SANTA FE': [2001], 'HYUNDAI|KONA': [2018],
  'KIA|SORENTO': [2003], 'KIA|SPORTAGE': [1995], 'KIA|FORTE': [2010], 'KIA|SOUL': [2010],
  'MAZDA|CX-5': [2013], 'MAZDA|MAZDA3': [2004], 'MAZDA|3': [2004], 'MAZDA|CX-30': [2020],
  'SUBARU|OUTBACK': [1995], 'SUBARU|FORESTER': [1998], 'SUBARU|CROSSTREK': [2013],
  'TESLA|MODEL S': [2012], 'TESLA|MODEL X': [2016], 'TESLA|MODEL 3': [2017], 'TESLA|MODEL Y': [2020],
  'JEEP|WRANGLER': [1987], 'JEEP|GRAND CHEROKEE': [1993], 'JEEP|COMPASS': [2007],
  'RAM|1500': [2011], 'GMC|SIERRA': [1999], 'DODGE|GRAND CARAVAN': [1984, 2020],
  'VOLKSWAGEN|JETTA': [1980], 'VOLKSWAGEN|TIGUAN': [2009],
};

/** Newest-first model years for the make and model, or `fallback` when the pair is not in the table. */
export function modelYearsFor(make: string, model: string, fallback: number[]): number[] {
  const range = MODEL_YEARS[`${make.trim().toUpperCase()}|${model.trim().toUpperCase()}`];
  if (!range) return fallback;
  const [first, last] = range;
  return fallback.filter(y => y >= first && (last == null || y <= last));
}

// Model-year codes of the VIN's 10th character for 1980-2009; the cycle repeats every 30 years.
const VIN_YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/** D-8: an error message when the VIN's model-year code does not match the year, else ''. */
export function vinYearError(vin: string, modelYear: number): string {
  if (vin.length !== 17 || !Number.isInteger(modelYear) || modelYear < 1980) return '';
  const code = vin[9].toUpperCase();
  if (code === VIN_YEAR_CODES[(modelYear - 1980) % 30]) return '';
  const index = VIN_YEAR_CODES.indexOf(code);
  return index < 0
    ? `VIN character 10 '${code}' is not a model-year code. Check the VIN.`
    : `VIN does not match the model year: character 10 '${code}' means ${1980 + index} or ${2010 + index}, not ${modelYear}.`;
}

/** D-9: true for an https link on carfax.com or carfax.ca, or one of their subdomains. */
export function isCarfaxUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (host === 'carfax.com' || host === 'carfax.ca'
      || host.endsWith('.carfax.com') || host.endsWith('.carfax.ca'));
  } catch {
    return false;
  }
}
