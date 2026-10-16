// Tiny template engine: {{>partial}} includes, {{key}} (HTML-escaped) and {{keyHTML}}/{{keyJSON}} (raw).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
export const jsonForScript = value => JSON.stringify(value).replace(/</g, '\\u003c').split(LS).join("").split(PS).join("");
const RAW = /(HTML|JSON)$/;

export async function render(templatesDir, name, values) {
  const load = async file => readFile(path.join(templatesDir, file), 'utf8');
  let source = await load(name);
  for (let depth = 0; /\{\{>\w+\}\}/.test(source); depth++) {
    if (depth > 4) throw new Error('Partials nested too deeply.');
    const matches = [...new Set([...source.matchAll(/\{\{>(\w+)\}\}/g)].map(m => m[1]))];
    for (const partial of matches) source = source.replaceAll(`{{>${partial}}}`, (await load(`partials/${partial}.html`)).replace(/\n$/, ''));
  }
  return source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template value: ${key} (in ${name})`);
    return RAW.test(key) ? String(values[key]) : escapeHTML(values[key]);
  });
}
