import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { approvedHouses, localAsset, registrationURL, eventLabels } from '../assets/js/content.js';
import { buildPage, root } from '../scripts/build.mjs';

const event = JSON.parse(await readFile(`${root}/data/event-2026.json`,'utf8'));
const roster = JSON.parse(await readFile(`${root}/data/houses-2026.json`,'utf8'));
const house = { id:'test-1', mapNumber:1, name:'Test fixture house', address:'Test fixture address', status:'approved', order:1 };
const fixture = houses => ({year:2026,status:'approved',houses});

test('only relative local asset paths are allowed',()=>{
  assert.equal(localAsset('assets/img/trail/ghost.webp'),'assets/img/trail/ghost.webp');
  for(const value of ['https://example.com/x','/assets/x','assets/../data/x','assets//x','assets/./x','assets/a?b','javascript:alert(1)',null]) assert.equal(localAsset(value),null);
});
test('the approved supplied directory contains exactly 31 numbered stops',()=>{
  const houses=approvedHouses(roster,2026); assert.equal(houses.length,31);
  assert.deepEqual(houses.map(h=>h.mapNumber),Array.from({length:31},(_,i)=>i+1));
  assert.equal(houses[4].address,'5792 SW 39th Street');
  assert.equal(houses[29].name,'The Goalkeeper’s Graveyard');
});
test('empty, pending, malformed and historical rosters publish no houses',()=>{
  for(const data of [fixture([]),{},null,{...fixture([house]),year:2025},{...fixture([house]),status:'pending'}, {...fixture([]),houses:{}}]) assert.deepEqual(approvedHouses(data,2026),[]);
});
test('one approved house stays one house with no cemetery appended',()=>assert.equal(approvedHouses(fixture([house]),2026).length,1));
test('multiple approved houses sort in display order',()=>{
  const data=fixture([{...house,id:'b',order:2},{...house,id:'a',order:1}]);
  assert.deepEqual(approvedHouses(data,2026).map(h=>h.id),['a','b']);
});
test('all entries with duplicate IDs are withheld',()=>{
  assert.equal(approvedHouses(fixture([house,{...house}, {...house,id:'unique'}]),2026).length,1);
});
test('unapproved entries and invalid addresses do not publish',()=>{
  const invalid=[null,{...house,status:'pending'},{...house,address:''},{...house,address:null},{...house,address:'  '},{...house,address:'x\nprivate'}, {...house,mapNumber:0},{...house,order:'1'}];
  for(const value of invalid) assert.equal(approvedHouses(fixture([value]),2026).length,0);
});
test('optional, missing, and unsafe images never fabricate an icon',()=>{
  for(const image of [undefined,'javascript:alert(1)','../../x.png']) assert.equal(approvedHouses(fixture([{...house,image}]),2026)[0].image,null);
});
test('long names and special characters are preserved as text',()=>{
  const name='A & B <img src=x onerror=alert(1)> '+ 'Long name '.repeat(35);
  assert.equal(approvedHouses(fixture([{...house,name}]),2026)[0].name,name.trim());
});
test('registration is withheld until confirmed and uses HTTPS',()=>{
  for(const data of [{status:'pending',url:'https://www.jotform.com/252478605926063'}, {status:'confirmed',url:'javascript:alert(1)'},{status:'confirmed',url:'https://user:pass@example.com'},{}]) assert.equal(registrationURL(data),null);
  assert.equal(registrationURL({status:'confirmed',url:'https://example.com/approved-fixture'}),'https://example.com/approved-fixture');
});
test('event date, timezone and confirmed hours match the organizer',()=>{
  assert.deepEqual(eventLabels(event),{day:'Saturday, October 31',fullDate:'Saturday, October 31, 2026',hours:'6 PM–9 PM'});
  assert.equal(event.timeZone,'America/New_York');
});
test('historical or unknown hours remain pending',()=>assert.equal(eventLabels({...event,hours:{status:'pending',start:'18:00',end:'21:00'}}).hours,'Event hours will be announced'));
test('invalid dates and confirmed hours fail the build',()=>{
  for(const date of ['2025-10-31','2026-02-30','invalid']) assert.throws(()=>eventLabels({...event,date}));
  assert.throws(()=>eventLabels({...event,hours:{status:'confirmed',start:'25:00',end:'21:00'}}));
});
test('a pending map renders an intentional empty state with no download links',async()=>{
  const html=await buildPage({...event,map:{status:'pending'}});
  assert.match(html,/2026 Trail Map Coming Soon/); assert.doesNotMatch(html,/data-map-file|id="map-preview"/);
});
test('a published map without a real master fails rather than creating broken links',async()=>{
  await assert.rejects(buildPage({...event,map:{...event.map,image:'assets/maps/missing-local-fixture.png'}}));
});
test('the generated page remains synchronized and has no historical registration',async()=>{
  const html=await buildPage(event); assert.equal(html,await readFile(`${root}/index.html`,'utf8'));
  assert.doesNotMatch(html,/2024|2025|252478605926063|google.com\/maps|innerHTML|Swiper|ScrollReveal/);
  assert.match(html,/redbird-trail-2026.pdf/);
});
