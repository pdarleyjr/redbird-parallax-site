// Lazy-load the self-hosted MapLibre GL JS 6.14.0 (ESM + module worker; keep both files together).
const base = new URL('../../vendor/maplibre-gl-6.14.0/', import.meta.url);
let loading = null;

export function webgl2Available() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

export function loadMapLibre() {
  loading ??= (async () => {
    if (!document.querySelector('link[data-maplibre-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = new URL('maplibre-gl.css', base).href; link.dataset.maplibreCss = '';
      document.head.append(link);
    }
    const mod = await import(new URL('maplibre-gl.mjs', base).href);
    return mod.Map ? mod : mod.default;
  })();
  return loading;
}
