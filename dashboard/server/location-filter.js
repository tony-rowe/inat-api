const PNW_BOUNDS = Object.freeze({
  minLatitude: 41.95,
  maxLatitude: 49.05,
  minLongitude: -124.9,
  maxLongitude: -116.35
});

function hasCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function isWithinPnwBounds(latitude, longitude) {
  if (!hasCoordinates(latitude, longitude)) return false;
  return (
    latitude >= PNW_BOUNDS.minLatitude &&
    latitude <= PNW_BOUNDS.maxLatitude &&
    longitude >= PNW_BOUNDS.minLongitude &&
    longitude <= PNW_BOUNDS.maxLongitude
  );
}

export {
  PNW_BOUNDS,
  hasCoordinates,
  isWithinPnwBounds
};
