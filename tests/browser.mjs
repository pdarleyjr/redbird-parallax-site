// Run against npm run dev. Fixtures are local test data, never production files.
import { chromium, webkit } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { buildPage, root } from '../scripts/build.mjs';
const require=createRequire(import.meta.url);
const url=process.env.TEST_URL||'http://127.0.0.1:4173/redbird-parallax-site/';
const event=JSON.parse(await readFile(`${root}/data/event-2026.json`,'utf8'));
const roster=JSON.parse(await readFile(`${root}/data/houses-2026.json`,'utf8'));
const out=process.env.QA_OUTPUT_DIR ? `${root}/${process.env.QA_OUTPUT_DIR}` : `${root}/docs/qa`; await mkdir(out,{recursive:true});
const results=[];
async function check(name, fn){
  try{const details=await fn();results.push({name,status:'PASS',details});console.log(`PASS ${name}`)}
  catch(e){results.push({name,status:'FAIL',error:e.stack});console.error(`FAIL ${name}: ${e.message}`)}
}
async function loaded(page){await page.goto(url);await page.locator('.house-card').first().waitFor();await page.evaluate(()=>document.fonts.ready)}
async function allImages(page){
  await page.evaluate(async()=>{
    document.querySelectorAll('img[loading="lazy"]').forEach(img=>img.loading='eager');
    await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  });
}
const browser=await chromium.launch();
const publicContext=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await publicContext.newPage();
page.setDefaultTimeout(15000);
const errors=[],badResponses=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)badResponses.push(`${r.status()} ${r.url()}`)});
page.on('request',r=>requests.push(r.url()));
await check('Approved public content and historical-content exclusion',async()=>{
  await loaded(page);const text=await page.locator('body').innerText();
  assert.match(text,/Saturday, October 31, 2026/);assert.match(text,/6 PM–9 PM/);
  assert.doesNotMatch(text,/2024|2025|Book Now|shipping|discount|Bedimcode/i);
  assert.equal(await page.locator('.house-card').count(),31);
  assert.equal(await page.locator('iframe,video,a[href*="jotform"]').count(),0);
  const actual=await page.locator('.house-card').evaluateAll(cards=>cards.map(c=>({name:c.querySelector('h3').textContent,address:c.querySelector('p').textContent})));
  assert.deepEqual(actual,roster.houses.map(h=>({name:h.name,address:h.address})));
});
for(const [width,height] of [[320,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,1000],[1920,1080],[844,390]]){
  await check(`Chromium responsive ${width}x${height}`,async()=>{
    await page.setViewportSize({width,height});await loaded(page);await allImages(page);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),ids:[...document.querySelectorAll('[id]')].map(e=>e.id)}));
    assert.ok(layout.overflow<=1,`horizontal overflow ${layout.overflow}`);assert.deepEqual(layout.broken,[]);assert.equal(new Set(layout.ids).size,layout.ids.length);
    const title=await page.locator('h1').boundingBox();assert.ok(title.width<=width&&title.x>=0);
    const cta=await page.locator('.hero .button-primary').boundingBox();assert.ok(cta.height>=44&&cta.width>=44);
    if(width>=375&&width<=430)assert.ok(cta.y+cta.height<height,'Useful hero action must be visible on phone');
    await page.screenshot({path:`${out}/chromium-${width}x${height}.png`,fullPage:true});
    if([390,1440].includes(width))await page.screenshot({path:`${out}/hero-${width}.png`});
    return layout;
  });
}
await check('Mobile menu touch, Escape, close, navigation, focus and resize',async()=>{
  await page.setViewportSize({width:390,height:844});await loaded(page);
  const toggle=page.locator('#menu-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#site-nav a').first().evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);
  await toggle.press('Enter');await page.locator('#menu-close').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();await page.locator('#site-nav a[href="#map"]').click();await page.waitForURL('**/#map');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();await page.setViewportSize({width:1024,height:768});await page.waitForFunction(()=>document.querySelector('#menu-toggle').getAttribute('aria-expanded')==='false');assert.equal(await page.locator('#site-nav').isVisible(),true);
  await page.setViewportSize({width:390,height:844});await page.locator('#site-nav').waitFor({state:'hidden'});
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
});
await check('All section anchors and keyboard skip link',async()=>{
  await page.setViewportSize({width:1440,height:1000});await loaded(page);
  const missing=await page.locator('a[href^="#"]').evaluateAll(links=>links.filter(l=>!document.getElementById(l.hash.slice(1))).map(l=>l.href));assert.deepEqual(missing,[]);
  await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Enter');assert.match(page.url(),/#main$/);
  for(const href of ['#hero','#how-it-works','#what-to-expect','#map','#featured-houses']){await page.locator(`#site-nav a[href="${href}"]`).click();assert.equal(new URL(page.url()).hash,href)}
});
await check('Search filters the actual count and handles no matches',async()=>{
  await loaded(page);await page.locator('#house-search').fill('5792');assert.equal(await page.locator('.house-card').count(),1);
  assert.match(await page.locator('#house-status').innerText(),/1 of 31/);
  await page.locator('#house-search').fill('NONEXISTENT LOCAL TEST FIXTURE');assert.equal(await page.locator('.house-card').count(),0);assert.equal(await page.locator('#house-empty').isVisible(),true);
  await page.locator('#house-search').fill('');assert.equal(await page.locator('.house-card').count(),31);
});
await check('Map preview and full-resolution image opening',async()=>{
  await loaded(page);await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('#map-preview').evaluate(img=>img.decode());
  const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator('#map-actions a').first().click()]);await popup.waitForLoadState('domcontentloaded');assert.ok(popup.url().endsWith('/assets/maps/redbird-trail-2026.png'));
  await popup.locator('img').evaluate(img=>img.decode());assert.equal(await popup.locator('img').evaluate(img=>img.naturalWidth),6000);await popup.close();
});
await check('PNG download preserves the exact supplied master and filename',async()=>{
  await loaded(page);await page.locator('#map').scrollIntoViewIfNeeded();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('a[download]').click()]);assert.equal(download.suggestedFilename(),'redbird-trail-2026.png');
  const downloaded=await readFile(await download.path());const master=await readFile(`${root}/assets/maps/redbird-trail-2026.png`);assert.equal(createHash('sha256').update(downloaded).digest('hex'),createHash('sha256').update(master).digest('hex'));
});
await check('Printable PDF link requests the correct file and delivers the exact master',async()=>{
  await loaded(page);await page.locator('#map').scrollIntoViewIfNeeded();
  const pdfURL=await page.locator('#map-actions a[href$=".pdf"]').getAttribute('href');const pdf=await page.request.get(new URL(pdfURL,url).href);assert.equal(pdf.status(),200);assert.match(pdf.headers()['content-type'],/application\/pdf/);assert.equal((await pdf.body()).subarray(0,5).toString(),'%PDF-');
  assert.deepEqual(await pdf.body(),await readFile(`${root}/assets/maps/redbird-trail-2026.pdf`));
  const requested=page.context().waitForEvent('request',{predicate:r=>r.url().endsWith('/redbird-trail-2026.pdf'),timeout:10000});
  const [request]=await Promise.all([requested,page.locator('#map-actions a[href$=".pdf"]').click()]);assert.ok(request.url().endsWith('/redbird-trail-2026.pdf'));
  for(const popup of page.context().pages())if(popup!==page)await popup.close();
});
await check('WCAG 2.2 AA automated accessibility',async()=>{
  await loaded(page);await allImages(page);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}}));
  await writeFile(`${out}/axe-desktop.json`,JSON.stringify(result,null,2));assert.deepEqual(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length})),[]);
  return {passes:result.passes.length,violations:result.violations.length};
});
await check('No uncaught exceptions, missing resources, external runtime dependencies',async()=>{
  await loaded(page);await allImages(page);assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(requests.filter(r=>!r.startsWith('http://127.0.0.1:4173/')),[]);
});
await check('Domain-root preview also resolves all assets',async()=>{
  await page.goto('http://127.0.0.1:4173/');await page.locator('.house-card').first().waitFor();await allImages(page);assert.equal(await page.locator('.house-card').count(),31);
  assert.deepEqual(await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)),[]);
});
const baseHouse={id:'fixture-1',name:'Clearly labeled local test fixture',address:'Local test fixture address',mapNumber:1,order:1,status:'approved'};
const fixtures=[
  ['empty roster',[] ,0],['one approved house',[baseHouse],1],
  ['multiple approved houses',[baseHouse,{...baseHouse,id:'fixture-2',mapNumber:2,order:2}],2],
  ['duplicate house IDs',[baseHouse,{...baseHouse}],0],
  ['unapproved and malformed addresses',[{...baseHouse,status:'pending'},{...baseHouse,id:'bad',address:null}],0],
  ['missing image',[{...baseHouse,image:'assets/img/missing-local-test-fixture.webp'}],1],
  ['long names and HTML special characters',[{...baseHouse,name:'Local test <img src=x onerror=window.INJECTED=true> & '+ 'Long name '.repeat(25)}],1],
];
for(const [name,houses,count] of fixtures){await check(`Local fixture: ${name}`,async()=>{
  const context=await browser.newContext({viewport:{width:320,height:740}});const p=await context.newPage();
  await p.route('**/data/houses-2026.json',route=>route.fulfill({json:{year:2026,status:'approved',houses}}));
  await p.goto(url);await p.waitForFunction(()=>!document.querySelector('#house-status').textContent.includes('loading'));
  await allImages(p);assert.equal(await p.locator('.house-card').count(),count);
  assert.equal(await p.evaluate(()=>window.INJECTED),undefined);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(name==='missing image')assert.equal(await p.locator('.house-card img').count(),0);
  await context.close();
})}
await check('Local fixtures: malformed JSON and historical roster are withheld',async()=>{
  for(const body of ['{"invalid":',JSON.stringify({year:2025,status:'approved',houses:[baseHouse]})]){
    const p=await browser.newPage();await p.route('**/data/houses-2026.json',route=>route.fulfill({body,contentType:'application/json'}));await p.goto(url);
    await p.waitForFunction(()=>!document.querySelector('#house-status').textContent.includes('loading'));assert.equal(await p.locator('.house-card').count(),0);await p.close();
  }
});
await check('Local fixture: no supplied map or unconfirmed hours',async()=>{
  const p=await browser.newPage();const html=await buildPage({...event,map:{status:'pending'},houses:{status:'pending'},hours:{status:'pending'}});
  await p.route(url,route=>route.fulfill({body:html,contentType:'text/html'}));await p.goto(url);
  assert.equal(await p.locator('#map-unavailable').isVisible(),true);assert.equal(await p.locator('[data-map-file]').count(),0);assert.equal(await p.locator('.house-card').count(),0);
  assert.match(await p.locator('.event-line').innerText(),/Event hours will be announced/);await p.close();
});
await check('Local fixture: failed map image hides downloads',async()=>{
  const p=await browser.newPage();await p.route('**/assets/maps/*',route=>route.fulfill({status:404,body:'Local missing-map test fixture'}));await loaded(p);await p.locator('#map').scrollIntoViewIfNeeded();await p.locator('#map-unavailable').waitFor({state:'visible'});
  assert.equal(await p.locator('#map-actions').isVisible(),false);assert.equal(await p.locator('#map-unavailable').isVisible(),true);await p.close();
});
await check('Local fixture: missing PDF exposes no broken PDF action',async()=>{
  const p=await browser.newPage();await p.route('**/assets/maps/*.pdf',route=>route.fulfill({status:404,body:'Local missing-PDF test fixture'}));await loaded(p);
  await p.locator('#map-actions a[href$=".pdf"]').waitFor({state:'hidden'});assert.equal(await p.locator('#map-actions a').first().isVisible(),true);await p.close();
});
await check('JavaScript disabled: date, map and essential navigation remain usable',async()=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const p=await context.newPage();await p.goto(url);
  assert.equal(await p.locator('h1').isVisible(),true);assert.equal(await p.locator('a[download]').isVisible(),true);assert.equal(await p.locator('#site-nav a[href="#map"]').isVisible(),true);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
});
await check('Reduced motion and mobile accessibility',async()=>{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await loaded(p);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
  await p.locator('#menu-toggle').click();await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const result=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}}));
  await writeFile(`${out}/axe-mobile.json`,JSON.stringify(result,null,2));assert.deepEqual(result.violations.map(v=>v.id),[]);await p.close();
});
await browser.close();
const safari=await webkit.launch();
for(const [width,height] of [[390,844],[844,390],[1440,1000]])await check(`WebKit responsive and map/menu ${width}x${height}`,async()=>{
  const context=await safari.newContext({viewport:{width,height},hasTouch:width<900});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await loaded(p);await allImages(p);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await p.locator('.house-card').count(),31);
  if(width<960){await p.locator('#menu-toggle').tap();await p.keyboard.press('Escape');assert.equal(await p.locator('#menu-toggle').getAttribute('aria-expanded'),'false')}
  await p.locator('#map').scrollIntoViewIfNeeded();assert.ok(await p.locator('#map-preview').evaluate(i=>i.naturalWidth>0));assert.deepEqual(errors,[]);
  const png=await p.request.get(new URL(event.map.image,url).href);assert.equal(png.status(),200);assert.match(png.headers()['content-type'],/image\/png/);
  await p.screenshot({path:`${out}/webkit-${width}x${height}.png`,fullPage:true});await context.close();
});
await safari.close();
await writeFile(`${out}/browser-results.json`,JSON.stringify({date:new Date().toISOString(),url,results},null,2));
console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} browser checks passed.`);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
