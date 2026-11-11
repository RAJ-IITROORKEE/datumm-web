import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdminEmail, adminEmails} from '../src/lib/admin-access.mjs';

// @lat: [[contracts#Hosted contract tests#Admin email gate]]
test('admin gate matches the primary email case-insensitively and defaults to the owner',()=>{
  assert.deepEqual(adminEmails(undefined),['rajrabidas001@gmail.com']);
  assert.deepEqual(adminEmails('  '),['rajrabidas001@gmail.com']);
  assert.equal(isAdminEmail('RajRabidas001@Gmail.com',undefined),true);
  assert.equal(isAdminEmail('a@x.io','a@x.io, B@y.io'),true);
  assert.equal(isAdminEmail('b@y.io','a@x.io, B@y.io'),true);
  assert.equal(isAdminEmail('rajrabidas001@gmail.com','a@x.io'),false);
  assert.equal(isAdminEmail(null,undefined),false);
  assert.equal(isAdminEmail('',undefined),false);
});
