/**
 * Similarity utilities for duplicate detection.
 * - cosine: vector similarity for embeddings
 * - jaccard: token-set overlap for text comparison
 * - tokenize: Unicode-safe tokenizer (preserves Bangla tokens)
 * - haversine: coordinate-based distance between two geolocated reports
 */

/**
 * Tokenize a string into normalized lowercase tokens.
 * Keeps Unicode letters (\p{L}) so Bangla tokens survive.
 * @param s - Raw text to tokenize.
 * @returns Array of normalized tokens.
 */
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Jaccard similarity between two strings (token-set overlap).
 * @param a - First text.
 * @param b - Second text.
 * @returns Similarity score between 0 and 1.
 */
export function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 0;

  const intersection = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Cosine similarity between two numeric vectors.
 * @param a - First vector.
 * @param b - Second vector (must be same length).
 * @returns Similarity score between -1 and 1 (typically 0-1 for normalized embeddings).
 */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Haversine distance between two geographic coordinates.
 * @param lat1 - Latitude of point 1 (degrees).
 * @param lon1 - Longitude of point 1 (degrees).
 * @param lat2 - Latitude of point 2 (degrees).
 * @param lon2 - Longitude of point 2 (degrees).
 * @returns Distance in kilometers.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a Haversine distance (km) into a 0-1 similarity score.
 * Uses an exponential decay: 0 km → 1.0, 1 km → ~0.61, 5 km → ~0.08.
 * @param distanceKm - Distance in kilometers.
 * @returns Similarity score between 0 and 1.
 */
export function locationSimilarity(distanceKm: number): number {
  // Exponential decay with a 2km half-distance
  return Math.exp(-distanceKm / 2);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
