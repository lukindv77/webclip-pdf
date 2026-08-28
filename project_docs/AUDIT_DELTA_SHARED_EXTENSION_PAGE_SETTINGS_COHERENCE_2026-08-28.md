# Audit delta — shared extension-page settings coherence / stale-form writes — 2026-08-28

Source-of-truth `main` immediately before this write: `73e0db08944310ccf7c9660182297df4e937073e`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh multi-page audit refines existing **P1-157 — shared extension-page Chrome API/settings mutation ownership**.

Existing P1-157 already records one concrete shared-key race: `journal.js` writes `webclipJournalGroupByUrl` directly while service-worker user-settings import writes the same key in its bundled settings commit. This pass proves a broader stale-form/lost-update class even when every individual worker mutation is physically serialized correctly.

Adjacent owners:

- **P1-141** — read-only single-flight freshness across mutation epochs;
- **P1-008** — user-settings import marker/generation and bundled commit;
- **P0-074/P0-078** — Yandex config and publication-policy generations used by long/remote operations;
- **P1-209** — old extension-page generation after extension update;
- **P1-206** — coherent Journal data render revision;
- **P1-210** — unknown outer mutation settlement before retry;
- **P1-121** — OperationLog retention setting ordering where applicable.

No new P1-211 item is needed. The root cause is that the worker serializes writes but extension pages do not carry an **expected shared-settings revision/edit receipt**, so a logically stale form can perform a perfectly serialized overwrite of newer fields.

## Physical serialization is not logical concurrency control

`updateYandexConfig(mutator, ...)` provides a valuable actual-settlement serialized mutation chain. Each turn fresh-reads current `yandexConfig`, applies a mutator and writes the result. A later physical Chrome Storage call cannot overtake an earlier unresolved one.

That protects write ordering.

It does **not** prove the mutation payload was based on current UI/state. If a stale Options page sends several fields copied from an old form, the worker's current-state fresh read merely gives that stale payload a clean place to overwrite those fields.

The missing primitive is either:

- an expected config/settings revision; or
- patch-only mutation semantics where the page sends only fields the user actually edited against a known current revision.

## Concrete lost update — backup settings form sends all fields every time

Options `saveBackupSettings` reads and sends all three values together:

- `enabled: backupEnabled.checked`;
- `intervalMinutes`;
- `retryMinutes`.

The worker `saveJournalBackupSettings(settings)` updates every property that is present. Since all three are always present, every Save is a whole-subform overwrite of those three current config fields.

### Deterministic two-Options-tab schedule

1. Options A and Options B both load backup settings:
   - enabled=true;
   - interval=1440;
   - retry=60.
2. B changes interval to 720 and saves. Worker serially commits current config interval=720.
3. A has received no shared-state invalidation and its form still shows interval=1440.
4. A changes only enabled to false from the user's perspective.
5. A clicks Save.
6. A sends `{enabled:false, intervalMinutes:1440, retryMinutes:60}`.
7. Worker fresh-reads current config containing B's 720, then deliberately applies A's payload and writes 1440 back.

B's newer interval change is lost even though Chrome Storage serialization worked perfectly.

This is a logical stale-editor overwrite, not physical write overtaking.

## Options has no `chrome.storage.onChanged` listener

Fresh `options.js` review finds no `chrome.storage.onChanged.addListener(...)`.

Therefore another Options page, Journal page or settings import can change shared settings while the current Options form remains indefinitely stale until some explicit refresh path happens to replace the controls.

For backup settings, `renderBackupStatus(status)` does correctly refresh all three form fields when this page itself obtains a status/result. The problem is **cross-page/background mutation visibility**.

A second tab can remain editable with a historical snapshot and later overwrite newer fields.

## User-settings import makes the stale-page problem systematic

P1-008 user-settings import intentionally writes one bundled allowlisted settings state containing, among other fields:

- Yandex config values;
- backup interval/retry/enabled;
- Journal `groupByUrl`;
- OperationLog retention.

After import commits, already-open extension pages are not automatically required to re-read that exact imported settings revision before allowing edits.

Therefore:

1. Options A loaded settings revision A;
2. user imports settings revision B from another page/tab;
3. B is durable and scheduler reconciliation may already run;
4. Options A still displays A;
5. A later saves a multi-field form;
6. A can overwrite selected parts of imported B with old values from A.

P1-008 ensures import itself is atomic/recoverable. It cannot prevent a later stale page from authoritatively writing old values unless shared writer admission carries revision/CAS semantics.

## Journal `groupByUrl` direct write remains the clearest cross-writer bypass

`journal.js` handles its grouping checkbox by:

1. immediately assigning local `groupByUrl = Boolean(groupByUrlInput.checked)`;
2. resetting pagination state;
3. directly awaiting `chrome.storage.local.set({webclipJournalGroupByUrl: groupByUrl})` inside `try/catch`;
4. swallowing any error;
5. rendering the new local mode regardless.

### Consequence 1 — UI can diverge from durable setting after write failure/unknown result

If the Storage write rejects or has ambiguous late settlement, Journal still renders using the locally chosen value and gives no indication that persistence failed.

On reload/new Journal page the persisted value may differ.

This is P1-157 direct-write settlement plus P1-210-style state truth at a lower-severity preference surface.

### Consequence 2 — import vs stale Journal tab

Journal's storage listener watches only `webclipJournalRevision`, not `webclipJournalGroupByUrl`.

User-settings import can therefore change the durable `groupByUrl` preference without notifying/reconciling an already-open Journal page.

The old Journal tab continues to display/edit its historical preference. A later checkbox change performs a direct write outside the service-worker settings mutation contract and can overwrite the imported preference.

This is exactly the shared-writer race already named by P1-157, now with the missing cross-page invalidation schedule made explicit.

## Journal data revision events do not repair preference revision

Journal does have strong(er) cross-page data invalidation mechanisms:

- runtime `WEBCLIP_JOURNAL_CHANGED` handling;
- `chrome.storage.onChanged` for `webclipJournalRevision`;
- scheduled reload with scroll preservation.

Those are about Journal **data revision**.

They do not imply that `webclipJournalGroupByUrl` or other user-settings state is current. A Journal entry mutation can refresh data while the grouping preference remains a stale local variable from another settings generation.

Do not overload Journal data revision as the settings revision.

## P1-141 read freshness composes but does not solve stale editor admission

P1-141 already requires an Options read single-flight to stop reusing a pre-mutation actual read as though it were a new post-mutation snapshot.

Suppose that is fully fixed and every explicit refresh obtains genuinely current settings. A stale page can still sit idle without refreshing and later submit historical form fields.

Therefore two independent layers are needed:

- **read epoch** — P1-141: a refresh must actually observe state after the mutation it is intended to confirm;
- **write expected revision/edit capability** — P1-157: a form loaded from revision A cannot silently overwrite revision B unless the product explicitly applies conflict/merge policy.

## P1-209 extension-version refresh is another stale-page source, not the shared-setting owner

P1-209 requires open Journal/Options pages to prove they have reloaded into the current extension version before the worker marks refresh complete.

An old-version page that remains alive can obviously make the stale-editor problem worse because it may also use old schema/mutation semantics.

However even two pages running the same current extension version can reproduce the backup-settings lost update above. Therefore P1-157 needs its own shared settings revision regardless of P1-209.

## Publication privacy setting has better patch shape but still needs current-generation truth

`createPublicLinks` is changed by a dedicated preference mutation containing only that field. It therefore does not accidentally overwrite backup interval/retry values from a stale form.

This is a positive pattern: narrow patch minimizes unrelated lost updates.

However P0-078/P1-210 still require:

- exact publication-policy generation;
- after unknown write result, fresh durable state before the checkbox claims enabled/disabled;
- old save generations cannot regain publication authority merely because a stale page later toggles the boolean.

So patch-only is necessary but not sufficient for privacy-critical settings.

## Root save is also narrow, but long-operation generation remains P0-074

Root path save sends a dedicated root value rather than the full Yandex config object. This avoids unrelated stale-field overwrite.

The remaining root problem is long-operation generation: remote service-folder verification must remain tied to the exact root/config generation that was committed. That remains P0-074.

Again, narrow patch is the correct shared-settings foundation.

## Backup settings need dirty-field or revision/CAS semantics

Possible safe models:

### Option A — expected revision + merge

When Options loads backup settings it receives `settingsRevision = R`.

Save sends:

- expected revision R;
- only changed fields or full intended subdocument.

Worker transaction/serialized mutation:

- fresh-reads current revision;
- if still R, applies change and advances revision;
- if changed, returns conflict/current state;
- UI asks user to review/merge rather than silently overwriting.

### Option B — patch only fields touched by this edit session

Track per-control dirty state in Options.

If user only toggled enabled, send only `{enabled:false}`. Worker fresh-read preserves concurrently changed interval/retry.

This significantly reduces lost updates, but still needs a revision when multiple writers edit the **same** field or when grouped settings have cross-field invariants.

### Option C — worker-issued edit receipt

Load returns a short-lived edit receipt bound to the settings generation. Save consumes/compares it. This can align with P1-198-style worker-issued provenance but should remain a settings-specific capability rather than reuse an unrelated operation log id.

## Cross-page invalidation

All current extension pages that display editable shared settings need a way to learn that their snapshot is stale.

Acceptable mechanisms:

- `chrome.storage.onChanged` for versioned settings revision;
- worker runtime broadcast with revision only/small patch;
- visibility/pageshow fresh-read when page returns to foreground;
- explicit stale banner after known other-page/import mutation.

The worker remains authoritative: a missed notification cannot make a stale expected revision valid.

## Unknown mutation settlement

P1-210 applies to shared settings too:

- if the page loses the mutation response after Chrome Storage may have committed, do not immediately reset its expected revision as though the write failed;
- mark editor state pending/unknown;
- reconcile current revision/value from the worker/actual settlement owner;
- only then allow the next edit generation.

Otherwise a lost result can produce both duplicate mutation and stale-revision overwrite.

## Required deterministic regressions

1. Options A/B load backup settings R0; B changes interval and commits R1; A changes only enabled -> interval from B remains 720 or A gets explicit conflict; it never silently returns to stale 1440.
2. Same with retryMinutes changed in B and enabled changed in A.
3. A and B both edit the same field from R0 -> deterministic conflict/latest explicit policy, not invisible lost update.
4. User-settings import commits backup settings B while Options A is open -> A is marked stale/refreshed; a later Save cannot overwrite imported fields from old snapshot without conflict.
5. Journal A is open with `groupByUrl=false`; user-settings import commits true -> Journal A receives/obtains current preference or is marked stale before it can write.
6. Direct Journal group preference Storage write rejects -> local checkbox/render does not silently claim durable success; state is reconciled or visibly unsaved.
7. Journal preference write settles late after import -> old generation cannot overwrite imported new generation without expected-revision match.
8. Two Journal tabs change grouping preference concurrently -> one coherent last-confirmed revision/explicit conflict semantics; no hidden stale physical overwrite.
9. P1-141 stale pre-mutation read A is not accepted as post-B current revision.
10. P1-209 old-version page cannot write shared settings after new worker/page generation declares it stale.
11. Public-link dedicated patch does not overwrite unrelated backup/root fields; P0-078 generation tests remain independent.
12. Root dedicated patch does not overwrite public-link/backup fields; P0-074 remote verification still uses exact committed root generation.
13. OperationLog retention imported while stale Options is open -> later unrelated settings save does not revert retention; direct retention edit uses expected current revision or explicit conflict.
14. Cross-page settings notification may be missed without corrupting state because worker expected-revision CAS remains authoritative.
15. Unknown outer mutation settlement keeps edit state pending until exact current revision is reconciled; no blind retry with stale form.

## Duplicate check / numbering

No new P-number is assigned.

- **P1-157** is the primary shared-settings writer/edit-revision owner.
- **P1-141** remains read single-flight freshness.
- **P1-008** remains atomic user-settings import/reconciliation marker.
- **P1-209** remains extension-page version-generation refresh.
- **P1-206** remains Journal data snapshot coherence.
- **P1-210** remains outer mutation result reconciliation.
- **P0-074/P0-078** remain stronger Yandex config/privacy operation generations.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
