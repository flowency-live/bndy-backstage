// Geometry utilities for venue coverage selection
// Point-in-circle and point-in-polygon calculations

export interface Point {
  lat: number;
  lng: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two points using the Haversine formula
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a point is within a circle defined by center and radius
 * @param point The point to check
 * @param center The center of the circle
 * @param radiusMiles The radius in miles
 * @returns true if point is inside or on the boundary of the circle
 */
export function isPointInCircle(
  point: Point,
  center: Point,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(point.lat, point.lng, center.lat, center.lng);
  return distance <= radiusMiles;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point The point to check
 * @param polygon Array of points defining the polygon vertices
 * @returns true if point is inside or on the boundary of the polygon
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  // Need at least 3 points to form a polygon
  if (polygon.length < 3) {
    return false;
  }

  const { lat: y, lng: x } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    // Check if point is on an edge (approximately)
    const onEdge = isPointOnLineSegment(x, y, xi, yi, xj, yj);
    if (onEdge) {
      return true;
    }

    // Ray casting algorithm
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point lies on a line segment (with small tolerance for floating point)
 */
function isPointOnLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const tolerance = 1e-9;

  // Check if point is within the bounding box of the segment
  const minX = Math.min(x1, x2) - tolerance;
  const maxX = Math.max(x1, x2) + tolerance;
  const minY = Math.min(y1, y2) - tolerance;
  const maxY = Math.max(y1, y2) + tolerance;

  if (px < minX || px > maxX || py < minY || py > maxY) {
    return false;
  }

  // Check if point is on the line (using cross product)
  const crossProduct = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  return Math.abs(crossProduct) < tolerance;
}
