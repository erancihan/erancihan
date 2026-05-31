/**
 * camera_db.js - Shared camera knowledge base
 *
 * Loaded by both background.js and content.js.
 * Contains specs, new prices, and model identification logic.
 */

// eslint-disable-next-line no-unused-vars
const CAMERA_DB = {
  "A7 II":     { year: 2014, mp: 24.3, ibis: true,  maxISO: 25600,  newPrice: 1698, af: 117,  video: "1080p", gen: 2, family: "A7",   brand: "Sony" },
  "A7 III":    { year: 2018, mp: 24.2, ibis: true,  maxISO: 51200,  newPrice: 1999, af: 693,  video: "4K",    gen: 3, family: "A7",   brand: "Sony" },
  "A7 IV":     { year: 2021, mp: 33,   ibis: true,  maxISO: 51200,  newPrice: 2499, af: 759,  video: "4K60",  gen: 4, family: "A7",   brand: "Sony" },
  "A7C":       { year: 2020, mp: 24.2, ibis: true,  maxISO: 51200,  newPrice: 1799, af: 693,  video: "4K",    gen: 3, family: "A7C",  brand: "Sony" },
  "A7C II":    { year: 2023, mp: 33,   ibis: true,  maxISO: 51200,  newPrice: 2099, af: 759,  video: "4K60",  gen: 4, family: "A7C",  brand: "Sony" },
  "A7CR":      { year: 2023, mp: 61,   ibis: true,  maxISO: 32000,  newPrice: 2999, af: 693,  video: "4K60",  gen: 4, family: "A7C",  brand: "Sony" },
  "A7R II":    { year: 2015, mp: 42.4, ibis: false, maxISO: 25600,  newPrice: 3198, af: 399,  video: "4K",    gen: 2, family: "A7R",  brand: "Sony" },
  "A7R III":   { year: 2017, mp: 42.4, ibis: true,  maxISO: 32000,  newPrice: 3199, af: 399,  video: "4K",    gen: 3, family: "A7R",  brand: "Sony" },
  "A7R IV":    { year: 2019, mp: 61,   ibis: true,  maxISO: 32000,  newPrice: 3499, af: 567,  video: "4K",    gen: 4, family: "A7R",  brand: "Sony" },
  "A7R V":     { year: 2022, mp: 61,   ibis: true,  maxISO: 32000,  newPrice: 3899, af: 693,  video: "4K60",  gen: 5, family: "A7R",  brand: "Sony" },
  "EOS RP":    { year: 2019, mp: 26.2, ibis: false, maxISO: 40000,  newPrice: 1299, af: 4779, video: "4K",    gen: 1, family: "EOSR", brand: "Canon" },
  "EOS R":     { year: 2018, mp: 30.3, ibis: false, maxISO: 40000,  newPrice: 2299, af: 5655, video: "4K",    gen: 1, family: "EOSR", brand: "Canon" },
  "EOS R6":    { year: 2020, mp: 20.1, ibis: true,  maxISO: 102400, newPrice: 2499, af: 6072, video: "4K60",  gen: 2, family: "EOSR", brand: "Canon" },
  "EOS R6 II": { year: 2022, mp: 24.2, ibis: true,  maxISO: 102400, newPrice: 2499, af: 6072, video: "4K60",  gen: 3, family: "EOSR", brand: "Canon" },
  "EOS R8":    { year: 2023, mp: 24.2, ibis: false, maxISO: 102400, newPrice: 1699, af: 6072, video: "4K60",  gen: 3, family: "EOSR", brand: "Canon" },
  "Z5":        { year: 2020, mp: 24.3, ibis: true,  maxISO: 51200,  newPrice: 1399, af: 273,  video: "4K",    gen: 1, family: "Z",    brand: "Nikon" },
  "Z6":        { year: 2018, mp: 24.5, ibis: true,  maxISO: 51200,  newPrice: 1999, af: 273,  video: "4K",    gen: 1, family: "Z",    brand: "Nikon" },
  "Z6 II":     { year: 2020, mp: 24.5, ibis: true,  maxISO: 51200,  newPrice: 1999, af: 273,  video: "4K",    gen: 2, family: "Z",    brand: "Nikon" },
  "Z6 III":    { year: 2024, mp: 24.5, ibis: true,  maxISO: 64000,  newPrice: 2499, af: 299,  video: "4K120", gen: 3, family: "Z",    brand: "Nikon" },
  "Z7":        { year: 2018, mp: 45.7, ibis: true,  maxISO: 25600,  newPrice: 3399, af: 493,  video: "4K",    gen: 1, family: "Z",    brand: "Nikon" },
  "Z7 II":     { year: 2020, mp: 45.7, ibis: true,  maxISO: 25600,  newPrice: 2999, af: 493,  video: "4K",    gen: 2, family: "Z",    brand: "Nikon" },
};

/**
 * Identify camera model from listing name.
 * Returns the key from CAMERA_DB or null.
 */
// eslint-disable-next-line no-unused-vars
function identifyModel(name) {
  const normalized = name
    .toUpperCase()
    .replace(/MK\s*/g, "")
    .replace(/MARK\s*/g, "");

  const orderedKeys = Object.keys(CAMERA_DB).sort((a, b) => b.length - a.length);

  for (const key of orderedKeys) {
    const pattern = key.toUpperCase().replace(/\s+/g, "\\s*");
    const regex = new RegExp("\\b" + pattern + "\\b");
    if (regex.test(normalized)) {
      return key;
    }
  }
  return null;
}

/**
 * Compute value score for an item with known model.
 */
// eslint-disable-next-line no-unused-vars
function computeValueScore(price, conditionStars, specs) {
  if (!price || !specs) return null;

  const discountRatio = 1 - price / specs.newPrice;
  const conditionFactor = conditionStars / 5;
  const agePenalty = Math.max(0, 1 - (2026 - specs.year) * 0.05);

  const specScore =
    (specs.mp / 61) * 0.15 +
    (specs.ibis ? 0.15 : 0) +
    (specs.maxISO / 102400) * 0.1 +
    (specs.af / 6072) * 0.1 +
    (specs.video.includes("4K") ? 0.1 : 0) +
    (specs.video.includes("60") ? 0.05 : 0);

  return Math.round(
    (discountRatio * 30 + conditionFactor * 25 + agePenalty * 20 + specScore * 25) * 10
  ) / 10;
}
