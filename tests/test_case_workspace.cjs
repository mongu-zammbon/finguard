const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const records = require('../web/case-records.js');

function workspace() {
  const listeners = {};
  const context = vm.createContext({
    FinGuardRecords: records, Blob, Date, FormData,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { addEventListener() {}, body: { append() {} }, createElement: () => ({ click() {}, remove() {} }) },
    window: { addEventListener: (type, callback) => { listeners[type] = callback; }, setTimeout() {} },
    state: {}, navigate() {}, render() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../web/case-workspace.js'), 'utf8'), context);
  return { context, session: vm.runInContext('recordSession', context), listeners };
}

test('selected HTML export still warns before losing unexported original material', () => {
  const { context, session, listeners } = workspace();
  context.startFrozenRecord('합성 원문 A');
  session.frozen = records.addEvidence(session.frozen, { title: '제외 자료', kind: 'message', source: '합성', occurredAt: '2026-09-05T09:00:00+09:00', text: '제외할 원문' });
  session.frozen = records.setEvidenceIncluded(session.frozen, session.frozen.evidence[1].id, false);
  context.exportRecord('frozen');
  let prevented = false;
  listeners.beforeunload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('new Gate case is isolated and prior case can be explicitly restored', () => {
  const { context, session } = workspace();
  context.startFrozenRecord('합성 사건 A');
  const aId = session.frozen.id;
  session.frozen = records.reviewFact(session.frozen, session.frozen.facts[0].id, { text: 'A에서 확인함', status: 'confirmed', note: 'A 확인 이력' });
  session.drafts.frozen = { title: 'A 미완성 자료' };
  context.startFrozenRecord('합성 사건 B');
  assert.notEqual(session.frozen.id, aId);
  assert.equal(session.frozen.evidence.length, 1);
  assert.equal(session.frozen.evidence[0].text, '합성 사건 B');
  assert.equal(session.frozen.history.length, 0);
  assert.equal(Object.keys(session.drafts.frozen).length, 0);
  assert.equal(session.frozenCases.length, 1);
  context.handleRecordAction({ dataset: { action: 'record-switch-case', recordKind: 'frozen', recordCaseIndex: '0' } });
  assert.equal(session.frozen.id, aId);
  assert.equal(session.frozen.facts[0].text, 'A에서 확인함');
  assert.equal(session.frozen.history.length, 1);
  assert.equal(session.drafts.frozen.title, 'A 미완성 자료');
  assert.equal(session.frozenCases[0].record.evidence[0].text, '합성 사건 B');
});
