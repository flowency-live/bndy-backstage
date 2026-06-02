import { describe, test, expect } from 'vitest';
import {
  isPointInCircle,
  isPointInPolygon,
  calculateDistance,
} from '../polygon';

// Test coordinates for known UK locations
const CONGLETON = { lat: 53.1622, lng: -2.2128 };
const MACCLESFIELD = { lat: 53.2587, lng: -2.1257 };
const MANCHESTER = { lat: 53.4808, lng: -2.2426 };
const STOKE = { lat: 53.0027, lng: -2.1794 };
const LONDON = { lat: 51.5074, lng: -0.1278 };

describe('calculateDistance', () => {
  test('should return 0 for same point', () => {
    const distance = calculateDistance(
      CONGLETON.lat,
      CONGLETON.lng,
      CONGLETON.lat,
      CONGLETON.lng
    );
    expect(distance).toBe(0);
  });

  test('should calculate distance between two nearby points in miles', () => {
    // Congleton to Macclesfield is approximately 7 miles
    const distance = calculateDistance(
      CONGLETON.lat,
      CONGLETON.lng,
      MACCLESFIELD.lat,
      MACCLESFIELD.lng
    );
    expect(distance).toBeGreaterThan(6);
    expect(distance).toBeLessThan(8);
  });

  test('should calculate distance for longer distances', () => {
    // Congleton to London is approximately 144 miles (as-the-crow-flies)
    const distance = calculateDistance(
      CONGLETON.lat,
      CONGLETON.lng,
      LONDON.lat,
      LONDON.lng
    );
    expect(distance).toBeGreaterThan(140);
    expect(distance).toBeLessThan(150);
  });

  test('should be symmetric (A to B equals B to A)', () => {
    const distanceAB = calculateDistance(
      CONGLETON.lat,
      CONGLETON.lng,
      MANCHESTER.lat,
      MANCHESTER.lng
    );
    const distanceBA = calculateDistance(
      MANCHESTER.lat,
      MANCHESTER.lng,
      CONGLETON.lat,
      CONGLETON.lng
    );
    expect(distanceAB).toBeCloseTo(distanceBA, 10);
  });
});

describe('isPointInCircle', () => {
  test('should return true for center point', () => {
    const result = isPointInCircle(
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      10
    );
    expect(result).toBe(true);
  });

  test('should return true for point within radius', () => {
    // Macclesfield is ~7 miles from Congleton
    const result = isPointInCircle(
      { lat: MACCLESFIELD.lat, lng: MACCLESFIELD.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      10 // 10 mile radius
    );
    expect(result).toBe(true);
  });

  test('should return false for point outside radius', () => {
    // Macclesfield is ~7 miles from Congleton
    const result = isPointInCircle(
      { lat: MACCLESFIELD.lat, lng: MACCLESFIELD.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      5 // 5 mile radius - too small
    );
    expect(result).toBe(false);
  });

  test('should return false for distant point', () => {
    const result = isPointInCircle(
      { lat: LONDON.lat, lng: LONDON.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      50 // 50 miles - not enough for London
    );
    expect(result).toBe(false);
  });

  test('should handle zero radius', () => {
    const result = isPointInCircle(
      { lat: MACCLESFIELD.lat, lng: MACCLESFIELD.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      0
    );
    expect(result).toBe(false);
  });

  test('should return true for point exactly on boundary', () => {
    // Manchester is ~22 miles from Congleton
    const distanceToManchester = calculateDistance(
      CONGLETON.lat,
      CONGLETON.lng,
      MANCHESTER.lat,
      MANCHESTER.lng
    );
    const result = isPointInCircle(
      { lat: MANCHESTER.lat, lng: MANCHESTER.lng },
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      distanceToManchester // Exact distance
    );
    expect(result).toBe(true);
  });
});

describe('isPointInPolygon', () => {
  // Define a simple square polygon around Congleton
  const squareAroundCongleton = [
    { lat: 53.2, lng: -2.3 }, // NW
    { lat: 53.2, lng: -2.1 }, // NE
    { lat: 53.1, lng: -2.1 }, // SE
    { lat: 53.1, lng: -2.3 }, // SW
  ];

  // Triangle polygon
  const trianglePolygon = [
    { lat: 53.3, lng: -2.2 }, // Top
    { lat: 53.1, lng: -2.4 }, // Bottom left
    { lat: 53.1, lng: -2.0 }, // Bottom right
  ];

  test('should return true for point inside square polygon', () => {
    const result = isPointInPolygon(
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      squareAroundCongleton
    );
    expect(result).toBe(true);
  });

  test('should return false for point outside square polygon', () => {
    const result = isPointInPolygon(
      { lat: LONDON.lat, lng: LONDON.lng },
      squareAroundCongleton
    );
    expect(result).toBe(false);
  });

  test('should return false for point just outside polygon', () => {
    const result = isPointInPolygon(
      { lat: 53.25, lng: -2.2 }, // Just north of the square
      squareAroundCongleton
    );
    expect(result).toBe(false);
  });

  test('should work with triangle polygon', () => {
    // Point inside triangle
    const inside = isPointInPolygon(
      { lat: 53.15, lng: -2.2 },
      trianglePolygon
    );
    expect(inside).toBe(true);

    // Point outside triangle
    const outside = isPointInPolygon(
      { lat: 53.05, lng: -2.2 },
      trianglePolygon
    );
    expect(outside).toBe(false);
  });

  test('should return false for empty polygon', () => {
    const result = isPointInPolygon(
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      []
    );
    expect(result).toBe(false);
  });

  test('should return false for polygon with less than 3 points', () => {
    const result = isPointInPolygon(
      { lat: CONGLETON.lat, lng: CONGLETON.lng },
      [{ lat: 53.2, lng: -2.3 }, { lat: 53.2, lng: -2.1 }]
    );
    expect(result).toBe(false);
  });

  test('should handle concave polygon', () => {
    // L-shaped polygon
    const lShapedPolygon = [
      { lat: 53.3, lng: -2.4 }, // Top left
      { lat: 53.3, lng: -2.2 }, // Top middle
      { lat: 53.2, lng: -2.2 }, // Inner corner
      { lat: 53.2, lng: -2.0 }, // Right extension
      { lat: 53.1, lng: -2.0 }, // Bottom right
      { lat: 53.1, lng: -2.4 }, // Bottom left
    ];

    // Point in the main body
    const inBody = isPointInPolygon(
      { lat: 53.15, lng: -2.35 },
      lShapedPolygon
    );
    expect(inBody).toBe(true);

    // Point in the cutout area (should be outside)
    const inCutout = isPointInPolygon(
      { lat: 53.25, lng: -2.15 },
      lShapedPolygon
    );
    expect(inCutout).toBe(false);
  });

  test('should treat point on edge as inside', () => {
    const result = isPointInPolygon(
      { lat: 53.2, lng: -2.2 }, // On the top edge
      squareAroundCongleton
    );
    // Edge cases can be implementation-dependent, but typically treated as inside
    expect(result).toBe(true);
  });

  test('should treat vertex as inside', () => {
    const result = isPointInPolygon(
      { lat: 53.2, lng: -2.3 }, // NW vertex
      squareAroundCongleton
    );
    expect(result).toBe(true);
  });
});

describe('integration: filtering venues by selection method', () => {
  const venues = [
    { id: 'v1', name: 'Venue in Congleton', lat: 53.162, lng: -2.213 },
    { id: 'v2', name: 'Venue in Macclesfield', lat: 53.259, lng: -2.126 },
    { id: 'v3', name: 'Venue in Manchester', lat: 53.481, lng: -2.243 },
    { id: 'v4', name: 'Venue in Stoke', lat: 53.003, lng: -2.179 },
    { id: 'v5', name: 'Venue in London', lat: 51.507, lng: -0.128 },
  ];

  test('should filter venues by circle', () => {
    const center = { lat: CONGLETON.lat, lng: CONGLETON.lng };
    // 10 mile radius includes Congleton and Macclesfield (~7mi)
    // but excludes Stoke (~11mi), Manchester (~22mi), and London (~144mi)
    const radiusMiles = 10;

    const venuesInCircle = venues.filter((v) =>
      isPointInCircle({ lat: v.lat, lng: v.lng }, center, radiusMiles)
    );

    expect(venuesInCircle.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  test('should filter venues by polygon', () => {
    // Polygon covering Congleton, Macclesfield, and Manchester
    const coveragePolygon = [
      { lat: 53.5, lng: -2.5 }, // NW
      { lat: 53.5, lng: -2.0 }, // NE
      { lat: 53.1, lng: -2.0 }, // SE
      { lat: 53.1, lng: -2.5 }, // SW
    ];

    const venuesInPolygon = venues.filter((v) =>
      isPointInPolygon({ lat: v.lat, lng: v.lng }, coveragePolygon)
    );

    expect(venuesInPolygon.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
  });
});
