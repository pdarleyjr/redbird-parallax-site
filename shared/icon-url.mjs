// Where a house icon's picture lives. Built-in icons are files of this site; uploaded icons (keys start with "up-") are served by the
// public API from versioned URLs, so they can be cached for a year. Call configureIcons(apiBase) once the page knows its API address.
let api = null;

export const isUploadedIcon = key => typeof key === 'string' && key.startsWith('up-');
export const configureIcons = apiBase => { api = apiBase ? String(apiBase).replace(/\/$/, '') : null; };

/** @param {string} key icon key  @param {string} root site root URL ending in "/"  @param {{small?: boolean}} [options] small = the 128 px file of an uploaded icon */
export function iconURL(key, root, { small = false } = {}) {
  if (isUploadedIcon(key) && api) return `${api}/v1/icons/${small ? '128/' : ''}${key}.webp`;
  return `${root}assets/img/markers/${key}.webp`;
}
