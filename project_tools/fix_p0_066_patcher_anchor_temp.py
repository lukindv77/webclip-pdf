#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).with_name('apply_p0_066_durable_url_policy.py')
s = p.read_text(encoding='utf-8')

old_anchor = "s = replace_once(s, '(db, tx) => {\\n      let store;', '(db, tx, event) => {\\n      let store;', 'journal upgrade signature')"
new_anchor = "s = replace_once(s, \"JOURNAL_DB_VERSION,\\n    (db, tx) => {\\n      let store;\", \"JOURNAL_DB_VERSION,\\n    (db, tx, event) => {\\n      let store;\", 'journal upgrade signature')"
if s.count(old_anchor) != 1:
    raise SystemExit(f'patcher anchor fix expected once, found {s.count(old_anchor)}')
s = s.replace(old_anchor, new_anchor, 1)

old_tests = '''# Revalidate injection-order regression contracts without weakening their owner assertions.
for name in [
    'project_tools/test_p0_064_frame_proxy_budget.js',
    'project_tools/test_p0_068_inert_frame_proxy.js',
    'project_tools/test_p0_067_host_control_activation_guard.js',
]:
    t = load(name)
    t = t.replace("'host-control-activation-guard.js', 'content.js'", "'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    t = t.replace("'frame-proxy-inert-guard.js', 'content.js'", "'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    t = t.replace("'frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'content.js'", "'frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'")
    # Regex source assertions in these tests use escaped dots and optional whitespace.
    t = t.replace("'host-control-activation-guard\\\\.js',\\\\s*'content\\\\.js'", "'host-control-activation-guard\\\\.js',\\\\s*'durable-url-policy\\\\.js',\\\\s*'content\\\\.js'")
    t = t.replace("'frame-proxy-inert-guard\\\\.js',\\\\s*'content\\\\.js'", "'frame-proxy-inert-guard\\\\.js',\\\\s*'host-control-activation-guard\\\\.js',\\\\s*'durable-url-policy\\\\.js',\\\\s*'content\\\\.js'")
    save(name, t)
'''
new_tests = '''# Revalidate injection-order regression contracts without weakening their owner assertions.
for name in [
    'project_tools/test_p0_064_frame_proxy_budget.js',
    'project_tools/test_p0_068_inert_frame_proxy.js',
    'project_tools/test_p0_067_host_control_activation_guard.js',
]:
    t = load(name)
    multiline_old = "    'host-control-activation-guard.js',\\n    'content.js'"
    multiline_new = "    'host-control-activation-guard.js',\\n    'durable-url-policy.js',\\n    'content.js'"
    if multiline_old in t:
        t = t.replace(multiline_old, multiline_new)
    inline_old = "'host-control-activation-guard.js', 'content.js'"
    inline_new = "'host-control-activation-guard.js', 'durable-url-policy.js', 'content.js'"
    if inline_old in t:
        t = t.replace(inline_old, inline_new)
    save(name, t)
'''
if s.count(old_tests) != 1:
    raise SystemExit(f'adjacent regression patch block expected once, found {s.count(old_tests)}')
s = s.replace(old_tests, new_tests, 1)

p.write_text(s, encoding='utf-8')
print('P0-066 patcher anchors fixed')