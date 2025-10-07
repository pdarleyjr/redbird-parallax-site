#!/usr/bin/env python3

content = """const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');

async function snap(outPath, w, h) {
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const page = await browser.newPage();
  await page.setViewport({width:w,height:h,deviceScaleFactor:2});
  await page.goto('file://'+path.resolve(__dirname,'map_template.html'), {waitUntil:'networkidle0'});
  await new Promise(resolve => setTimeout(resolve, 600)); // tiles settle
  const buf = await page.screenshot({type:'jpeg',quality:85});
  await fs.writeFile(outPath, buf);
  await browser.close();
}

(async ()=>{
  const outDir = path.resolve(__dirname,'..','assets','maps');
  await fs.mkdir(outDir,{recursive:true});
  await snap(path.join(outDir,'trail_map_mobile.jpg'), 1080, 1920);
  await snap(path.join(outDir,'trail_map_desktop.jpg'), 1920, 1080);
  console.log('Static maps written.');
})();"""

with open('render_static_map.js', 'w') as f:
    f.write(content)

print('Successfully wrote render_static_map.js')