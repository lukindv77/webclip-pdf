# Audit delta — bulk Journal destructive result loss must reconcile before retry — 2026-08-28

Source-of-truth `main` before this checkpoint includes `4333acb79cd01fa8ea587e64a5d5e569a5f7f775`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh proof extends **P1-210** outer transport-loss reconciliation to **P0-010/P0-076 bulk destructive Journal replace/clear**. It composes with the same-session target-revision confirmation delta, but the two are distinct:

- target-revision confirmation protects against Journal changing **before the first destructive commit**;
- P1-210 protects against retry when the first destructive commit may already have happened but its response was lost.

## Current import/clear UI treats outer rejection as ordinary failure

Current `journal.js` sends destructive RPCs directly:

- `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED`;
- `WEBCLIP_JOURNAL_CLEAR` for a site/domain scope;
- `WEBCLIP_JOURNAL_CLEAR` for the complete Journal.

After `await chrome.runtime.sendMessage(...)`, the page calls `requireOk(result)` and then refreshes the Journal.

If the outer message Promise rejects or the response channel disappears after the worker committed the destructive transaction, the catch path only displays an error. There is no exact durable status read proving whether the operation was:

- never admitted;
- admitted but not committed;
- fully committed;
- committed but post-commit stats/log/UI housekeeping incomplete;
- genuinely unknown because worker lifecycle ended around the commit boundary.

## Deterministic import response-loss schedule

1. Page P previews staged backup A and receives the required user confirmation.
2. P sends import operation C1.
3. Worker enters its exclusive Journal destructive mutation and atomically replaces the entries store with A, advancing Journal generation to G1.
4. Before the successful response reaches P, the runtime response channel is lost / page context disconnects / worker lifecycle breaks the outer result delivery.
5. P reports an error even though C1's destructive commit already occurred.
6. User later sees/reopens Journal. New save R is appended after G1, producing G2.
7. User interprets the old error as “import did not happen” and retries the same backup as C2.
8. C2 again performs a full replace and deletes R.

C2 is not a harmless idempotent replay. The same backup bytes produce a new destructive effect because the **target Journal generation has changed since C1**.

## Full/site clear has the same property

A successful clear C1 followed by lost response can be repeated after new entries appear.

For whole-Journal clear:

- C1 clears G0 -> G1;
- response is lost;
- new entry R appears in G2;
- user retries because UI previously reported failure;
- C2 clears R.

For site/domain clear, the same schedule deletes newly created entries in that scope.

Therefore a destructive bulk command cannot use ordinary “retry the command” semantics after outer result loss.

## Worker exclusivity does not solve result loss

`runExclusiveJournalDestructiveMutation()` prevents two destructive mutations from executing simultaneously in one live worker.

It does not answer, after C1's response disappears, whether C1 committed before the worker lock was released/lost. Nor can a future worker infer exact C1 completion from the absence of an in-memory lock.

A fresh worker therefore needs durable result evidence, not merely a new lock.

## OperationLog alone is insufficient

P1-210 already requires authoritative durable subsystem state instead of OperationLog as sole proof.

For full replace/clear this is especially important:

- logs may be pruned;
- log write can fail after the Journal transaction committed;
- operation id is currently caller-generated and P1-198 still requires stronger worker-issued identity;
- a log event saying “started” is not proof of commit;
- a missing “complete” event is not proof that commit did not occur.

Correctness evidence should live at the Journal transaction/generation boundary.

## Required bulk-operation receipt

A destructive Journal operation should have a worker-issued immutable receipt binding at least:

- operation generation/id;
- command kind (`import-replace`, `clear-all`, `clear-site`, etc.);
- exact expected target Journal revision from the user's confirmation;
- import staging/content generation where applicable;
- normalized clear scope where applicable;
- post-commit Journal revision/generation when commit succeeds;
- commit phase/status.

The authoritative Journal transaction should durably record enough of the receipt/result atomically with, or safely ordered around, the destructive commit so a restarted worker can answer status without replaying the command.

## UI behavior after outer result loss

Do not display transport rejection as proven “ничего не изменилось / импорт не выполнен”.

Instead:

1. enter `result unknown / checking operation` state;
2. perform one bounded read-only reconciliation by exact operation receipt;
3. if `committed`, refresh Journal and report the already-completed result;
4. if `not-admitted` is proven, a fresh destructive attempt may be offered and must receive a fresh target-revision confirmation;
5. if outcome remains unknown, do not offer blind repeat;
6. if the user deliberately chooses a new destructive attempt after unresolved state, require explicit new confirmation against the **current** Journal generation and preserve evidence for the old operation.

## Staging cleanup must not erase commit evidence

The imported bytes can be safely discarded after a proven commit or user cancellation according to their own lifetime contract.

But deleting staging after an outer failure cannot be treated as evidence that import did not commit. Conversely, retaining staging cannot mean it is safe to replay replace.

`staging/content receipt` and `target Journal commit receipt` are separate dimensions.

## Relationship to target-revision confirmation

The sibling `AUDIT_DELTA_JOURNAL_BULK_CONFIRMATION_REVISION_AUTHORITY_2026-08-28.md` requires C1 to prove expected target generation G0 before committing.

P1-210 then requires the result to remain reconcilable after C1:

- C1 expected G0 and committed -> durable result says committed G1;
- new R creates G2;
- an old transport error cannot authorize C2 against G2;
- any intentional C2 must receive a new confirmation for G2.

Together these form one end-to-end destructive operation receipt: observed target -> admitted command -> commit generation -> delivered/reconciled result.

## Required regressions

1. Import C1 commits, response lost, no later mutations -> status reconciliation returns committed; no second replace is issued.
2. C1 commits, response lost, new entry R appears -> old UI/retry cannot delete R; committed C1 is reconciled.
3. C1 proven not admitted -> fresh attempt is allowed only after current target revision is confirmed.
4. C1 outcome remains unknown after bounded reconciliation -> UI remains unknown/manual; no blind replace.
5. Clear-all C1 commits, response lost, new entry appears -> retry cannot clear the new entry without fresh confirmation/new generation.
6. Same for scoped site/domain clear.
7. Worker stops after Journal transaction commit but before OperationLog completion -> durable Journal commit receipt still proves C1.
8. OperationLog is absent/pruned -> reconciliation still works.
9. Import staging has already been cleaned -> committed receipt remains enough to prove C1 happened; no replay is inferred from staging absence.
10. Same staged backup intentionally imported again later -> this is a distinct new destructive generation with a new target-revision confirmation.
11. Caller-supplied operationId collision cannot make one page reconcile/control another destructive operation after P1-198 worker-issued receipts.

## Duplicate check / numbering

No new item is created.

- **P1-210** owns outer transport-loss truth and retry admission.
- **P0-010** owns full Journal import/confirmation behavior.
- **P0-076** owns Journal generation/CAS around destructive mutations.
- **P1-198** remains worker-issued operation identity.
- The target-revision confirmation delta owns pre-commit stale target decisions; this file owns post-commit lost-result replay.

## Test / release state

Docs-only checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains previous evidence only. Real multi-tab/MV3 response-loss regression remains required. No build, tag or Release was created.
