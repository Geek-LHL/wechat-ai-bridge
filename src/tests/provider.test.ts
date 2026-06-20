import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleStreamLine, type StreamParserState } from '../claude/provider.js';

function freshState(): StreamParserState {
  return { sessionId: '', textParts: [], trackingSkill: false, skillInputAccum: '' };
}

test('handleStreamLine: system init 设置 sessionId', () => {
  const state = freshState();
  handleStreamLine(
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-123' }),
    state,
    {},
  );
  assert.equal(state.sessionId, 'sess-123');
});

test('handleStreamLine: text_delta 触发 onText', () => {
  const calls: string[] = [];
  handleStreamLine(
    JSON.stringify({
      type: 'stream_event',
      event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hello' } },
    }),
    freshState(),
    { onText: (t) => calls.push(t) },
  );
  assert.deepEqual(calls, ['hello']);
});

test('handleStreamLine: content_block_stop 触发 onBlockEnd', () => {
  let called = 0;
  handleStreamLine(
    JSON.stringify({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 } }),
    freshState(),
    { onBlockEnd: () => called++ },
  );
  assert.equal(called, 1);
});

test('handleStreamLine: assistant 消息文本累积到 textParts', () => {
  const state = freshState();
  handleStreamLine(
    JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '回复内容' }] },
    }),
    state,
    {},
  );
  assert.deepEqual(state.textParts, ['回复内容']);
});

test('handleStreamLine: 空行和非法 JSON 静默跳过', () => {
  const state = freshState();
  handleStreamLine('', state, {});
  handleStreamLine('not json', state, {});
  handleStreamLine('   ', state, {});
  assert.deepEqual(state.textParts, []);
});
