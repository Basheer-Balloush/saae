/* City centres, [longitude, latitude], rather than decorative map samples.
 * GeoNames (CC BY 4.0): https://www.geonames.org/SY/largest-cities-in-syria.html
 * https://www.geonames.org/advanced-search.html?country=SY
 * Labels may be offset for legibility; the geographic anchors never move.
 * These are representative cities, not governorate boundaries or office locations.
 */
export const SYRIA_CITIES = [
  { id: 'aleppo', en: 'Aleppo', ar: 'حلب', lon: 37.1612, lat: 36.2012, label: [0.35, 0.48] },
  { id: 'idlib', en: 'Idlib', ar: 'إدلب', lon: 36.6339, lat: 35.9306, label: [-0.36, 0.36] },
  { id: 'latakia', en: 'Latakia', ar: 'اللاذقية', lon: 35.7915, lat: 35.5313, label: [-0.38, 0.05] },
  { id: 'tartus', en: 'Tartus', ar: 'طرطوس', lon: 35.8866, lat: 34.8890, label: [-0.38, 0.05] },
  { id: 'hama', en: 'Hama', ar: 'حماة', lon: 36.7578, lat: 35.1318, label: [0.36, 0.16] },
  { id: 'homs', en: 'Homs', ar: 'حمص', lon: 36.7256, lat: 34.7241, label: [0.36, -0.12] },
  { id: 'raqqa', en: 'Raqqa', ar: 'الرقة', lon: 39.0079, lat: 35.9528, label: [0.35, 0.40] },
  { id: 'hasakah', en: 'Al-Hasakah', ar: 'الحسكة', lon: 40.7477, lat: 36.5024, label: [-0.35, 0.28] },
  { id: 'qamishli', en: 'Qamishli', ar: 'القامشلي', lon: 41.2314, lat: 37.0522, label: [-0.35, 0.40] },
  { id: 'deir', en: 'Deir ez-Zor', ar: 'دير الزور', lon: 40.1408, lat: 35.3359, label: [0.35, -0.36] },
  { id: 'palmyra', en: 'Palmyra', ar: 'تدمر', lon: 38.2840, lat: 34.5624, label: [0.35, 0.05] },
  { id: 'damascus', en: 'Damascus', ar: 'دمشق', lon: 36.2913, lat: 33.5102, label: [0.36, 0.20] },
  { id: 'quneitra', en: 'Quneitra', ar: 'القنيطرة', lon: 35.8246, lat: 33.1259, label: [-0.38, 0.03] },
  { id: 'daraa', en: 'Daraa', ar: 'درعا', lon: 36.1021, lat: 32.6189, label: [-0.35, -0.28] },
  { id: 'suwayda', en: 'As-Suwayda', ar: 'السويداء', lon: 36.5695, lat: 32.7090, label: [0.36, 0.0] }
];

/* A connected mesh with regional links. No single city is the hub.
 * These are illustrative connections, not roads or claimed service routes. */
export const SYRIA_LINKS = [
  ['aleppo', 'idlib'], ['idlib', 'latakia'], ['latakia', 'tartus'],
  ['tartus', 'homs'], ['idlib', 'hama'], ['hama', 'homs'],
  ['aleppo', 'raqqa'], ['hama', 'raqqa'], ['raqqa', 'hasakah'],
  ['hasakah', 'qamishli'], ['hasakah', 'deir'], ['raqqa', 'deir'],
  ['deir', 'palmyra'], ['palmyra', 'homs'], ['homs', 'damascus'],
  ['palmyra', 'damascus'], ['damascus', 'quneitra'],
  ['quneitra', 'daraa'], ['damascus', 'suwayda'], ['daraa', 'suwayda']
];
