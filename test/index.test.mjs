import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiUrl } from '../src/index.mjs';

test('resolveApiUrl builds the deploy endpoint', () => {
  assert.equal(
    resolveApiUrl('https://api.coswarm.com'),
    'https://api.coswarm.com/api/v1/apps/deploy',
  );
});

test('resolveApiUrl strips trailing slashes', () => {
  assert.equal(
    resolveApiUrl('https://api.coswarm.com///'),
    'https://api.coswarm.com/api/v1/apps/deploy',
  );
});

test('resolveApiUrl preserves a base path', () => {
  assert.equal(
    resolveApiUrl('https://api.coswarm.com/prefix'),
    'https://api.coswarm.com/prefix/api/v1/apps/deploy',
  );
});

test('resolveApiUrl throws when base-url is missing', () => {
  assert.throws(() => resolveApiUrl(''), /base-url must be provided/);
  assert.throws(() => resolveApiUrl(undefined), /base-url must be provided/);
});
