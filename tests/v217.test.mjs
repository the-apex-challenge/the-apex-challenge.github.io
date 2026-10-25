import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('src/app.mjs');const css=read('styles.css');const html=read('index.html');
test('Clean two-Mirage artwork bundled and displayed without painted UI or duplicate overlays',()=>{
 assert.ok(statSync(new URL('../assets/decor/mirage-clean-final.webp',import.meta.url)).size>200_000);
 const b=app.slice(app.indexOf('function home(){'),app.indexOf('function homeLegacy(){'));
 assert.ok(b.includes('gtp222-layout') && b.includes('gtp239-reward-details'));
 assert.ok(!b.includes('haunted-hero.webp')&&!b.includes('gtp216-mirage-left'));
 assert.ok(css.includes("url('./assets/decor/mirage-clean-final.webp')"));
});
test('Live controls retain real five modes and wheel',()=>{
 const b=app.slice(app.indexOf('function home(){'),app.indexOf('function homeLegacy(){'));
 for(const m of ['classic','pixel','quote','ability','emoji'])assert.ok(b.includes("'"+m+"'"));
 assert.ok(b.includes('todayHub(')&&b.includes('data-action="intel-open"'));
 assert.ok(b.includes('data-action="wheel"')&&app.includes('data-action="leaderboard"'));
 assert.ok(app.includes('data-action="audio"')&&app.includes('data-action="profile"'));
});
test('Cache busters synchronized, responsive legacy layout retained',()=>{
 const v=html.match(/styles\.css\?v=(\d+\.\d+\.\d+)/)?.[1];
 assert.equal(v,'2.43.0');
 assert.ok(html.includes('app.mjs?v='+v));
 assert.ok(app.includes('leaderboard.mjs?v='+v));
 assert.ok(app.includes('function homeLegacy()') && css.includes('.gtp217-mobile{display:block!important}'));
});
