import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {PIXEL_PORTRAIT_SLUGS,pixelPortraitSources} from '../src/pixel_portraits281.mjs';import {legends} from '../src/data.mjs';import {paintPixelScene} from '../src/pixel_scene.mjs';
const app=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
test('every Legend uses a local 256 square portrait from the same Pixel family',()=>{
 assert.equal(PIXEL_PORTRAIT_SLUGS.length,legends.length);for(const l of legends){assert.deepEqual(pixelPortraitSources(l.slug),['./assets/pixel-portraits/'+l.slug+'.png']);const b=readFileSync(new URL('../assets/pixel-portraits/'+l.slug+'.png',import.meta.url));assert.equal(b.readUInt32BE(16),256,l.slug);assert.equal(b.readUInt32BE(20),256,l.slug);}assert.deepEqual(pixelPortraitSources('missing'),[]);
});
test('uniform Pixel sources have identical compositor placement for all Legends',()=>{
 let placement;for(const slug of PIXEL_PORTRAIT_SLUGS){const draw=[];const gradient={addColorStop(){}};const ctx={createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},restore(){},drawImage:(...v)=>draw.push(v.slice(1))};assert.equal(paintPixelScene({getContext:()=>ctx},{naturalWidth:256,naturalHeight:256},{resolution:900}),true);if(!placement)placement=draw[0];assert.deepEqual(draw[0],placement,slug);}
});
test('generic mode buttons always open Free Play and replay persists its session',()=>{
 assert.ok(app.includes("else if(action==='open'){openMode(button.dataset.mode,button.dataset.session||'unlimited');}"));
 const body=app.slice(app.indexOf('function randomPractice('),app.indexOf('function portrait('));let saved;
 const c={active:'pixel',store:{practice:{},settings:{playStyle:'full'}},legends:[{name:'A'},{name:'B'}],localAbilitySlugs:[],newRound:(answer)=>({answer}),sync:()=>saved=c.store.settings.session,render(){},sound(){},Math};vm.createContext(c);vm.runInContext(body+"randomPractice('pixel')",c);assert.equal(c.session,'unlimited');assert.equal(saved,'unlimited');
});
test('Pixel losses fully reveal the answer and offer the expanded image too',()=>{
 const fn=app.slice(app.indexOf('function getVisual('),app.indexOf('function quickModeLinks('));
 for(const guesses of [[],['A','B','C','D','E'],['A','B','C','D','E','F']]){const html=vm.runInNewContext(fn+'getVisual(round,target)',{active:'pixel',round:{finished:true,won:false,guesses,mode:'full'},target:{name:'Sparrow',slug:'sparrow',role:'Recon',title:'Tracker',signature:'Tracking',emoji:'a b c'},portrait:()=>'<img>',maxGuesses:()=>5,esc:s=>s});assert.match(html,/pixel-revealed/);assert.match(html,/data-resolution="900"/);assert.match(html,/FULLY REVEALED/);assert.match(html,/data-action="pixel-full"/);}
});
