// Optional compass heading for the nearest-house arrow. Basic nearest works without it.
let handler = null;
let heading = null;

const lowPass = (previous, next, alpha = 0.2) => {
  if (previous == null) return next;
  const [a, b] = [previous * Math.PI / 180, next * Math.PI / 180];
  const x = (1 - alpha) * Math.cos(a) + alpha * Math.cos(b), y = (1 - alpha) * Math.sin(a) + alpha * Math.sin(b);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

export const compassSupported = () => 'DeviceOrientationEvent' in window;
export const currentHeading = () => heading;

/** Must be called from a user gesture (iOS permission prompt). Resolves true when heading data arrives. */
export async function startCompass(onHeading) {
  if (!compassSupported()) return false;
  try {
    const request = window.DeviceOrientationEvent.requestPermission;
    if (typeof request === 'function' && (await request.call(window.DeviceOrientationEvent)) !== 'granted') return false;
  } catch { return false; }
  return new Promise(resolve => {
    const timer = setTimeout(() => { stopCompass(); resolve(false); }, 3000);
    handler = event => {
      let raw = event.webkitCompassHeading;
      if (raw == null && event.absolute !== false && event.alpha != null) raw = (360 - event.alpha) % 360;
      if (raw == null) return;
      raw = (raw + (screen.orientation?.angle ?? 0)) % 360;
      heading = lowPass(heading, raw);
      clearTimeout(timer); resolve(true); onHeading(heading);
    };
    window.addEventListener('deviceorientationabsolute', handler, true);
    window.addEventListener('deviceorientation', handler, true);
  });
}

export function stopCompass() {
  if (handler) { window.removeEventListener('deviceorientationabsolute', handler, true); window.removeEventListener('deviceorientation', handler, true); }
  handler = null; heading = null;
}
