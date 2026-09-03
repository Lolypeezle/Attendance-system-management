// Default FUOYE Main Campus Coordinates (Oye-Ekiti, Ekiti State, Nigeria)
export const FUOYE_CAMPUS_LAT = 7.7983;
export const FUOYE_CAMPUS_LNG = 5.2974;
export const DEFAULT_CAMPUS_RADIUS_METERS = 2000; // 2km radius to accommodate faculty buildings

/**
 * Calculates the great-circle distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if a given coordinate is within FUOYE campus boundary
 */
export function isWithinFuoyeCampus(
  lat: number,
  lng: number,
  campusLat = FUOYE_CAMPUS_LAT,
  campusLng = FUOYE_CAMPUS_LNG,
  maxRadiusMeters = DEFAULT_CAMPUS_RADIUS_METERS
): { within: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistanceMeters(lat, lng, campusLat, campusLng);
  return {
    within: distanceMeters <= maxRadiusMeters,
    distanceMeters: Math.round(distanceMeters),
  };
}
