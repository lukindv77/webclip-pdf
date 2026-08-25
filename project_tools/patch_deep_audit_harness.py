from pathlib import Path


def patch_common(path_name, label):
    path = Path(path_name)
    text = path.read_text('utf-8')
    old = "  const operationLogJson = { textContent: '', classList: { remove() {} } };"
    new = """  const operationLogJson = {
    textContent: '',
    hidden: false,
    classList: {
      add(name) { if (name === 'hidden') operationLogJson.hidden = true; },
      remove(name) { if (name === 'hidden') operationLogJson.hidden = false; },
      contains(name) { return name === 'hidden' ? operationLogJson.hidden : false; }
    }
  };"""
    if text.count(old) != 1:
        raise SystemExit(f'{label}: operationLogJson harness anchor mismatch: {text.count(old)}')
    text = text.replace(old, new, 1)

    old = r"let selectedOperationLogId = 'previous';\nlet operationLogDetailGeneration = 0;"
    new = r"let selectedOperationLogId = 'previous';\nlet selectedOperationLogValue = null;\nlet selectedOperationLogJsonText = '';\nlet operationLogDetailGeneration = 0;"
    if text.count(old) != 1:
        raise SystemExit(f'{label}: OperationLog VM declaration anchor mismatch: {text.count(old)}')
    text = text.replace(old, new, 1)
    path.write_text(text, 'utf-8')


patch_common('project_tools/test_operation_log_ui_race.js', 'UI race')
path = Path('project_tools/test_operation_log_ui_race.js')
text = path.read_text('utf-8')
old = """  assert.strictEqual(operationLogTitle.textContent, 'B title');
  assert.strictEqual(shown.length, 0);"""
new = """  assert.strictEqual(operationLogTitle.textContent, 'B title');
  assert.strictEqual(operationLogJson.textContent, '', 'large raw JSON must remain unmaterialized after detail selection');
  assert.strictEqual(operationLogJson.hidden, true, 'raw JSON area is lazy/collapsed until explicit Show');
  assert.strictEqual(toggle.textContent, 'Показать JSON лога');
  assert.strictEqual(shown.length, 0);"""
if text.count(old) != 1:
    raise SystemExit(f'UI race: OperationLog lazy assertions anchor mismatch: {text.count(old)}')
text = text.replace(old, new, 1)
path.write_text(text, 'utf-8')

patch_common('project_tools/test_p1_145_operation_log_latest_wins.js', 'P1-145')
print('deep audit OperationLog harnesses patched')
