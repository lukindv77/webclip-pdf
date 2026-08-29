# RECENT COMMITS TO CLASSIFY FIRST

Control baseline before handoff package: `e42e4bbb08f00b6717b59e3ec94693e03eb1cda6`.

- `e42e4bbb08f00b6717b59e3ec94693e03eb1cda6` — docs: bound deleted comment capacity across backup
- `ab2aec8d206ae0bcea93985d7276b03b3c1c0227` — docs: classify yandex mutation timeout as unknown
- `9d229698c5ff33d355a07d3cbbea4c8767fdfe51` — docs: bind trash move to yandex account generation
- `6897ffacc21ce91b5921add8b16cd7a786d7d247` — docs: bind read-later move to yandex account generation
- `91e03a6947d7dc1dae95f3ba266a5d982905e9e1` — docs: bind journal apply to SPA generation
- `27bea6bf84016856da8047dfb8cc83532f1e5f0d` — docs: bind retry cache to application generation
- `91848ea1aea714fb1670dc0ebaf2073bf5293797` — docs: bind save confirmation to SPA generation
- `053cff0322b422c9c17e803defb3832dce8fd4ef` — older full handoff package (superseded by 2026-08-29)
- `53c8b18634cdd5d807363a85c6ff40efc266fa66` — docs: keep journal apply behind upload generation lock
- `a56796186da77a04928bbc6ef0693e08dbb8253e` — docs: keep start selection behind upload generation lock
- `e83546add824ee52b2389872c589f2a67bbddba8` — docs: align popup and context selection start semantics
- `a2871e2a8a65f42e218e2c455b4b672748fd38ad` — docs: correct backup lease expiry proof
- `51235adf507c2117fb4d7bc0b3d38c1dda3f6757` — docs: keep backup lease live through remote phase
- `c6bdd2a7e6712e03b57f76a0ca9c38078693fb6a` — docs: fence destructive yandex move to auth generation
- `0baaa84eaa34e4b1eac73ee308e0caffa83faf5c` — docs: reconcile yandex disconnect partial commit
- `3c1b16574b51eec2667194f1d99bd94e73370fff` — docs: reconcile create-folder result after transport loss
- `472153e05e6a846bdae4eebe3d22c0d96c6bc4ac` — docs: fence folder tree creation to auth generation
- `a40ea6f962da39552a52840c1db67b545b9c6ac7` — docs: bind root save result to verified generation
- `ebceffe03b25dcbbbffcb5ef72d2f6a608fb5459` — docs: reconcile scheduler after root partial commit
- `e0156a4d27eedb02dc582e83ca45b2c5b5c04ce5` — docs: bind folder picker to yandex account generation
- `eb1bc7ba2ff4a396e7a2cec9dd005d119bb5a7a8` — docs: fence selection across SPA navigation generation
- `1eeb997ac062e7f5af67a5108c9907b04a538497` — docs: retain known download id across bind failure

Always fetch commits newer than the handoff package itself before taking new audit ownership. This list is a convenience index, not a substitute for current `git log`/GitHub history.
