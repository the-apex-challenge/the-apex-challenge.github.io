import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const h=app.slice(app.indexOf('function home(){'),app.indexOf('function getVisual('));
const intel=app.slice(app.indexOf('function homeIntelPanel(){'),app.indexOf('function homeFeatureDock(){'));
test('featured chest in first row and daily switch below it',()=>{
 assert.ok(h.indexOf('${homeIntelPanel()}') < h.indexOf('gtp27-session-picker'));
 assert.ok(h.indexOf('gtp27-session-picker') < h.indexOf('gtp212-cascade'));
 assert.equal(h.match(/\$\{homeIntelPanel\(\)\}/g)?.length,1);
 assert.ok(intel.includes('gtp215-intel-art'));
 assert.ok(intel.includes('vault-chest')&&intel.includes('vault-lid')&&intel.includes('vault-box'));
});
test('retains working intel progression and reward interaction',()=>{
 assert.ok(intel.includes('data-action="intel-open"'));
 assert.ok(intel.includes('intelState(1)'));
 assert.ok(intel.includes('complete/total*100'));
 assert.ok(intel.includes('aria-valuenow="${complete}"'));
});
test('new first-row layout responsive without altering game data',()=>{
 assert.ok(css.includes('.nova27-home .gtp215-intel-feature{'));
 assert.ok(css.includes('grid-template-columns:205px minmax(0,1fr)'));
 assert.ok(css.includes('@media (max-width:740px){'));
 assert.ok(css.includes('gtp215-intel-art .vault-chest'));
});
