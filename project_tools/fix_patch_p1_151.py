from pathlib import Path
import re

path = Path('project_tools/patch_p1_151.py')
text = path.read_text(encoding='utf-8')
pattern = re.compile(
    r"content = replace_once\(\n\s+content,\n\s+\"      if \(!frame \|\| frame\.isConnected === false \|\| unique\.has\(frame\)\) continue;\\n\",\n\s+\"      if \(!frame \|\| frame\.isConnected === false \|\| unique\.has\(frame\)\) continue;\\n\"\n\s+\"      if \(\(state\.flattenedFramePrintProxies \|\| \[\]\)\.some\(\(item\) => item\?\.frame === frame\)\) continue;\\n\",\n\s+'skip flattened frame stabilization'\n\)"
)
replacement = '''stabilize_anchor = "  function stabilizeSelectedFramePrintHeights(reason = 'prepared') {\\n"
stabilize_pos = content.find(stabilize_anchor)
if stabilize_pos < 0:
    raise SystemExit('stabilize function anchor not found')
guard = "      if (!frame || frame.isConnected === false || unique.has(frame)) continue;\\n"
guard_pos = content.find(guard, stabilize_pos)
if guard_pos < 0:
    raise SystemExit('stabilize guard not found')
skip = "      if ((state.flattenedFramePrintProxies || []).some((item) => item?.frame === frame)) continue;\\n"
content = content[:guard_pos + len(guard)] + skip + content[guard_pos + len(guard):]'''
new_text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'patch guard repair count={count}')
path.write_text(new_text, encoding='utf-8')
print('P1-151 patch guard repaired')
