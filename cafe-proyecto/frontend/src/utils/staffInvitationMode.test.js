import test from 'node:test';
import assert from 'node:assert/strict';
import { staffInvitationMode } from './staffInvitationMode.js';

test('solo permite activar invitaciones con la cuenta del mismo backend', () => {
  assert.equal(staffInvitationMode(true, true), 'django');
  assert.equal(staffInvitationMode(false, false), 'express');
  assert.equal(staffInvitationMode(true, false), 'unavailable');
  assert.equal(staffInvitationMode(false, true), 'unavailable');
});
