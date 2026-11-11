import assert from 'node:assert/strict';
import test from 'node:test';
import {shareToken,shareUrl,sharedView,svgDataUri,validToken} from '../src/lib/share.mjs';

// @lat: [[contracts#Hosted contract tests#Share helpers]]
test('share link, token and data URI',()=>{
 assert.equal(shareUrl('https://x.app','abc_DEF-1234'),'https://x.app/share/abc_DEF-1234');
 assert.equal(shareToken({token:null}),null);
 assert.equal(shareToken({token:'abc_DEF-1234'}),'abc_DEF-1234');
 assert.equal(validToken('../etc'),false);
 assert.ok(svgDataUri('<svg a="b"/>').startsWith('data:image/svg+xml;charset=utf-8,%3Csvg'));
});

test('shared payload is normalised and unsafe parts dropped',()=>{
 const view=sharedView({title:' ',messages:[{role:'user',text:'hi',at:'t'},{role:'x',text:''},{role:'assistant',text:'yo'}],steps:[{title:'A',status:'done'},{}],sources:[{title:'ok',url:'https://a.b'},{title:'bad',url:'javascript:alert(1)'}],plan:{svg:'<div/>'}});
 assert.equal(view.title,'Shared chat');
 assert.deepEqual(view.messages.map(m=>m.role),['user','assistant']);
 assert.equal(view.steps.length,1);
 assert.deepEqual(view.sources.map(s=>s.url),['https://a.b']);
 assert.equal(view.svg,null);
 assert.equal(sharedView({plan:{svg:'<svg viewBox="0 0 1 1"/>'}}).svg,'<svg viewBox="0 0 1 1"/>');
 assert.equal(sharedView(null),null);
});
