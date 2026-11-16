import test from 'node:test';
import assert from 'node:assert/strict';
import {drawingTitle} from '../src/lib/drawing-presentation.mjs';

test('names unique candidate IDs in supplied order, independently of versions',()=>{
 const candidates=[{planId:'a'},{planId:'a'},{planId:'b'},{planId:'c'}];
 assert.equal(drawingTitle({planId:'b',version:3},candidates),'Concept 2 · Version 3');
 assert.equal(drawingTitle({planId:'a',version:1},candidates),'Concept 1 · Version 1');
 assert.equal(drawingTitle({planId:'c',version:2},candidates),'Concept 3 · Version 2');
 assert.equal(drawingTitle({planId:'other',version:7},candidates),'Saved drawing · Version 7');
 assert.equal(drawingTitle({planId:'a'},candidates),'Concept 1');
 assert.equal(drawingTitle({planId:'a',version:NaN},candidates),'Concept 1');
 assert.equal(drawingTitle(null,candidates),'Saved drawing');
 assert.equal(drawingTitle({planId:'a',version:2}),'Saved drawing · Version 2');
});
