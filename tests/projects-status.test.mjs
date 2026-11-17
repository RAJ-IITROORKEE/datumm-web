import test from 'node:test';
import assert from 'node:assert/strict';
import {projectsStatus} from '../src/lib/projects-status.mjs';

test('a 404 or 405 from projects means unsupported',()=>{
  assert.equal(projectsStatus('unknown',{status:404}),'unsupported');
  assert.equal(projectsStatus('unknown',{status:405}),'unsupported');
});

test('a network error or 5xx never means unsupported',()=>{
  assert.equal(projectsStatus('unknown',{}),'unknown');
  assert.equal(projectsStatus('unknown',{status:503}),'unknown');
  assert.equal(projectsStatus('supported',{}),'supported');
});

test('success means supported, and recovers from unknown or unsupported',()=>{
  assert.equal(projectsStatus('unknown',null),'supported');
  assert.equal(projectsStatus('unsupported',null),'supported');
});
