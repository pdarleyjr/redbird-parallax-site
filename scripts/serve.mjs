import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const prefix = '/redbird-parallax-site/';
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.woff2':'font/woff2' };
const server=createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (pathname === '/redbird-parallax-site') { res.writeHead(301,{Location:prefix}); res.end(); return; }
    if (pathname.startsWith(prefix)) pathname=pathname.slice(prefix.length);
    else pathname=pathname.slice(1);
    if (!pathname || pathname.endsWith('/')) pathname+='index.html';
    const target=path.resolve(root,pathname);
    if (!target.startsWith(root+path.sep) || pathname.split('/').some(p=>p.startsWith('.')) || /^(node_modules|tests|scripts|docs)\//.test(pathname)) { res.writeHead(404); res.end(); return; }
    const s=await stat(target);
    if (!s.isFile()) throw new Error('Not a file');
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Length':s.size,'Cache-Control':'no-cache'});
    res.end(req.method==='HEAD' ? undefined : await readFile(target));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Red Bird preview: http://127.0.0.1:${port}${prefix}`));
