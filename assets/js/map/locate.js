// Geolocation: stays on the device. No coordinates are ever sent anywhere.
import { inBoundary } from '../../../shared/geo.mjs';

export const MESSAGES = {
  denied: 'Location is off for this site. You can still browse the map and the house list. To turn it on, allow location for this site in your browser settings.',
  unavailable: 'We couldn’t find your location. Check that location services are on, then try again.',
  timeout: 'Finding your location is taking a while. Try again outdoors.',
  unsupported: 'This device can’t share its location with the browser. You can still browse the map and the house list.',
  outside: 'You appear to be outside the Red Bird trail area.'
};

export function createLocator({ ring, onPosition, onStatus }) {
  let watchId = null, last = 0;
  const handle = pos => {
    const now = Date.now();
    if (now - last < 1000) return;
    last = now;
    const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    if (point.accuracy > 75) onStatus(`Your location is approximate (±${Math.round(point.accuracy * 3.28084 / 10) * 10} ft).`);
    else if (!inBoundary(point, ring, 400)) onStatus(MESSAGES.outside);
    else onStatus('');
    onPosition(point);
  };
  const fail = error => {
    onStatus(error.code === 1 ? MESSAGES.denied : error.code === 3 ? MESSAGES.timeout : MESSAGES.unavailable);
    if (error.code === 1) stop();
  };
  function start() {
    if (!('geolocation' in navigator)) { onStatus(MESSAGES.unsupported); return false; }
    if (watchId != null) return true;
    watchId = navigator.geolocation.watchPosition(handle, fail, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return true;
  }
  function stop() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; }
  return { start, stop, active: () => watchId != null };
}
