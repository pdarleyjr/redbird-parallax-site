// The only place that builds map-app links. Destination only: the visitor's position is never included.
export function directionsURL({ lat, lng }, apple) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Directions need finite coordinates.');
  return apple
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}
export const isApplePlatform = (ua, platform = '') => /iPhone|iPad|iPod|Macintosh/.test(ua) || /Mac|iPhone|iPad/.test(platform);
