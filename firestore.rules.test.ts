import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TASK_CONSTRAINTS, SUBTASK_CONSTRAINTS } from './src/types/tasks';

const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('./firebase-blueprint.json', 'utf8'));

// Dirty Dozen Security Rule Verification Suite
test('Security Invariant 1-3: Default deny, verified user check, and strict key allowlists', () => {
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
});

test('Security Invariant 4-5: Relational Master Gate on subtasks', () => {
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/tasks\/\$\(taskId\)\)/);
  assert.match(
    rulesContent,
    /get\(\/databases\/\$\(database\)\/documents\/tasks\/\$\(taskId\)\)\.data\.ownerId == request\.auth\.uid/
  );
});

test('Security Invariant 6-8: Immutability and server timestamps on create/update', () => {
  assert.match(rulesContent, /incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
});

test('Security Invariant 9-12: Blueprint volumetric synchronicity and query enforcer', () => {
  assert.equal(blueprint.entities.Task.properties.title.maxLength, TASK_CONSTRAINTS.TITLE_MAX_LEN);
  assert.equal(
    blueprint.entities.Subtask.properties.title.maxLength,
    SUBTASK_CONSTRAINTS.TITLE_MAX_LEN
  );
  assert.match(rulesContent, /allow list: if isSignedIn\(\) && existing\(\)\.ownerId == request\.auth\.uid/);
});
