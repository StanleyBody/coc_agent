import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './html.ts';

test('escapeHtml', () => {
  assert.equal(escapeHtml(`<b>"A" & 'B'</b>`), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
  assert.equal(escapeHtml('加農炮'), '加農炮');
});
