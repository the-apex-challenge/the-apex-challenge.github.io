import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const app=read('src/app.mjs'),css=read('styles.css'),html=read('index.html');
const home=app.split('function home(){')[1].split('function homeLegacy(){')[0];
test('clean character backdrop is bundled and uniquely used by live homepage',()=>{
 assert.ok(statSync(new URL('../assets/decor/mirage-clean-final.webp',import.meta.url)).size>150000);
 assert.ok(css.includes('mirage-clean-final.webp'));
 assert.ok(home.includes('gtp219-backdrop'));
 for(const old of ['gtp218-wallpaper','gtp217-graphic','gtp216-mirage-left','haunted-hero.webp'])assert.ok(!home.includes(old));
});
test('game mode cards real HTML and correct five actions, no cropped screenshot art',()=>{
 for(const m of ['classic','pixel','quote','ability','emoji'])assert.ok(home.includes(`'${m}'`));
 for(const marker of ['gtp222-orbit-card','gtp238-mode-card','gtp222-orbit-copy','data-mode=','data-session='])assert.ok(home.includes(marker));
 assert.ok(app.includes('function modeHostBadge(mode)'));
 assert.ok(!home.includes('gtp218-mode-classic.webp'));
});
test('both daily checkpoints and all main interactive surfaces wired',()=>{
 for(const action of ['intel-open','wheel'])assert.ok(home.includes(`data-action="${action}"`));
 assert.ok(home.includes('todayHub(')&&home.includes('todayHub(')&&app.includes('data-action="home-session"'));
 assert.ok(home.includes('gtp219-rewards'));assert.ok(home.includes('tac258-portrait'));assert.ok(app.includes('data-action="leaderboard"'));assert.ok(app.includes('data-action="profile"'));
});
test('browse portraits use verified local full-body sources where available',()=>{
 assert.ok(css.includes('#app .gtp2-picker .picker-legend .portrait-holder'));
 assert.ok(css.includes('object-fit:contain!important'));
 assert.ok(app.includes('localPortraitFiles[slug]'));
 const manifest=read('src/portrait_media_manifest.mjs'); for(const slug of ['alter','axle','ballistic','catalyst','conduit','sparrow'])assert.ok(manifest.includes('cutout-'+slug+'.png'));
});
test('mode accents and stable release cache versions',()=>{
 for(const m of ['classic','pixel','quote','ability','emoji'])assert.ok(css.includes(`[data-mode="${m}"]`));
 assert.ok(html.includes('styles.css?v=2.43.0'));
 assert.ok(html.includes('app.mjs?v=2.43.0'));
 assert.ok(app.includes("app.dataset.mode=screen==='game'?active:''"));
});
