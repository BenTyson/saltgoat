import { logger } from '$lib/server/logger';
/**
 * GPX Parser Utility
 * Parses GPX files to GeoJSON and calculates elevation statistics
 */

import { gpx } from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';

export interface TrailGeometry {
  type: 'LineString';
  coordinates: [number, number, number][]; // [lon, lat, elevation]
  properties: {
    elevationGain: number;
    elevationLoss: number;
    minElevation: number;
    maxElevation: number;
    totalDistanceMiles: number;
  };
}

export interface ElevationStats {
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
}

/**
 * Parse GPX content string to TrailGeometry
 */
export function parseGPX(gpxContent: string): TrailGeometry | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxContent, 'application/xml');

    const geoJson = gpx(doc);

    // Find the first LineString feature (track or route)
    const lineFeature = geoJson.features.find(
      (f) => f.geometry.type === 'LineString'
    );

    if (!lineFeature || lineFeature.geometry.type !== 'LineString') {
      // Try to find MultiLineString and flatten
      const multiLineFeature = geoJson.features.find(
        (f) => f.geometry.type === 'MultiLineString'
      );

      if (multiLineFeature && multiLineFeature.geometry.type === 'MultiLineString') {
        // Flatten MultiLineString to single LineString
        const allCoords = multiLineFeature.geometry.coordinates.flat();
        const coords = allCoords as [number, number, number][];

        if (coords.length < 2) return null;

        const stats = calculateElevationStats(coords);
        const distance = calculateTotalDistance(coords);

        return {
          type: 'LineString',
          coordinates: coords,
          properties: {
            ...stats,
            totalDistanceMiles: distance
          }
        };
      }

      return null;
    }

    const coords = lineFeature.geometry.coordinates as [number, number, number][];

    if (coords.length < 2) return null;

    // Ensure all coordinates have elevation (default to 0 if missing)
    const coordsWithElevation = coords.map(c => [
      c[0],
      c[1],
      c[2] ?? 0
    ]) as [number, number, number][];

    const stats = calculateElevationStats(coordsWithElevation);
    const distance = calculateTotalDistance(coordsWithElevation);

    return {
      type: 'LineString',
      coordinates: coordsWithElevation,
      properties: {
        ...stats,
        totalDistanceMiles: distance
      }
    };
  } catch (error) {
    logger.error('Error parsing GPX', { error: error });
    return null;
  }
}

/**
 * Calculate elevation statistics from coordinates
 */
export function calculateElevationStats(
  coords: [number, number, number][]
): ElevationStats {
  if (coords.length === 0) {
    return {
      elevationGain: 0,
      elevationLoss: 0,
      minElevation: 0,
      maxElevation: 0
    };
  }

  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = coords[0][2];
  let maxElevation = coords[0][2];

  // Use smoothing to filter out GPS noise
  const SMOOTHING_THRESHOLD = 10; // feet - ignore changes smaller than this
  let lastSignificantElevation = coords[0][2];

  for (let i = 1; i < coords.length; i++) {
    const elevation = coords[i][2];

    // Track min/max
    if (elevation < minElevation) minElevation = elevation;
    if (elevation > maxElevation) maxElevation = elevation;

    // Calculate gain/loss with smoothing
    const diff = elevation - lastSignificantElevation;

    if (Math.abs(diff) >= SMOOTHING_THRESHOLD) {
      if (diff > 0) {
        elevationGain += diff;
      } else {
        elevationLoss += Math.abs(diff);
      }
      lastSignificantElevation = elevation;
    }
  }

  return {
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation)
  };
}

/**
 * Calculate total distance in miles using Haversine formula
 */
export function calculateTotalDistance(
  coords: [number, number, number][]
): number {
  let totalMeters = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];

    totalMeters += haversineDistance(lat1, lon1, lat2, lon2);
  }

  // Convert meters to miles
  const miles = totalMeters / 1609.344;
  return Math.round(miles * 10) / 10; // Round to 1 decimal
}

/**
 * Haversine distance between two points (returns meters)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Simplify coordinates to reduce point count while preserving shape
 * Uses Douglas-Peucker algorithm
 */
export function simplifyCoordinates(
  coords: [number, number, number][],
  tolerance: number = 0.0001
): [number, number, number][] {
  if (coords.length <= 2) return coords;

  // Find the point with maximum distance from the line
  let maxDist = 0;
  let maxIndex = 0;

  const start = coords[0];
  const end = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = perpendicularDistance(coords[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyCoordinates(coords.slice(0, maxIndex + 1), tolerance);
    const right = simplifyCoordinates(coords.slice(maxIndex), tolerance);

    // Combine results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  }

  // Return just the endpoints
  return [start, end];
}

function perpendicularDistance(
  point: [number, number, number],
  lineStart: [number, number, number],
  lineEnd: [number, number, number]
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get cumulative distance at each point for elevation profile
 */
export function getCumulativeDistances(
  coords: [number, number, number][]
): number[] {
  const distances = [0];
  let cumulative = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];

    const segmentMeters = haversineDistance(lat1, lon1, lat2, lon2);
    const segmentMiles = segmentMeters / 1609.344;

    cumulative += segmentMiles;
    distances.push(Math.round(cumulative * 100) / 100);
  }

  return distances;
}
