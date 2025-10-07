css_content = ''':root{
  --bg:#0b0e1d; --ink:#fff; --muted:#a8b0c0; --accent:#ff7a1a; --accent2:#ffb54d;
  --pad:clamp(16px,2.5vw,28px); --max:1100px;
}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,Segoe UI,Inter}
img{max-width:100%;height:auto;display:block}

.topnav{position:sticky;top:0;z-index:50;display:flex;gap:16px;align-items:center;justify-content:space-between;padding:10px var(--pad);background:linear-gradient(180deg,rgba(0,0,0,.65),transparent)}
.topnav a{color:#fff;text-decoration:none;font-weight:700}
.topnav nav a{opacity:.85;margin-left:16px}

.panel{position:relative;min-height:clamp(70svh,90svh,900px);display:grid;place-items:center;overflow:hidden}
.panel .content{position:relative;z-index:2;text-align:center;padding:var(--pad);max-width:var(--max)}
.panel .bg,.panel .image-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
.panel .image-bg{background:url("../assets/img/flyer.png") center/cover no-repeat}
.hero h1{font-size:clamp(2rem,6vw,4rem);margin:0 0 .5rem}
h2{font-size:clamp(1.5rem,4vw,2.4rem);margin:.2rem 0 1rem}
.cta{display:inline-block;background:var(--accent);color:#111;padding:.8rem 1.2rem;border-radius:999px;font-weight:800;text-decoration:none}
.cta.alt{background:var(--accent2)}
.deadline{margin-left:12px;color:var(--muted)}

.section.content-wrap{padding:48px var(--pad);max-width:var(--max);margin-inline:auto}
.cards{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
.card{background:rgba(255,255,255,.06);border-radius:18px;padding:18px;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.25)}
.card .icon{font-size:30px;margin-bottom:6px}
.card.media{padding:0;overflow:hidden}
.card.media video{display:block;width:100%;height:auto;aspect-ratio:16/9}

.trailmap{display:block;border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.25);margin:10px 0 18px}

.footer{padding:28px var(--pad);color:var(--muted);text-align:center}

@media (max-width:900px){
  .cards{grid-template-columns:1fr}
}

@media (prefers-reduced-motion: reduce){
  .panel{min-height:auto}
}'''

with open('css/styles.css', 'w', encoding='utf-8') as f:
    f.write(css_content)
print('css/styles.css updated successfully')