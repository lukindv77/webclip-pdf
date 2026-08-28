# Audit delta — frame-agent REGISTER rollback across reused frameId — 2026-08-28

Source-of-truth `main` immediately before this write: `39c5ab2dda1691adcbc791debac355379f9edcf4`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-171** exact frame/document generation authority, with **P1-200** remote frame control-session ordering and **P1-125** late scripting success as adjacent dependencies.

Previous frame-agent identity audit already establishes that the registry stores `documentId` but is keyed only by `tabId + frameId`, and COMMAND forwarding does not target exact documentId. This pass proves a stronger registry-state corruption schedule: a late REGISTER from an older child document can overwrite a newer child record for the same reused frameId.

No new root cause is needed.

## Current registry shape

Worker `frameAgentsByTab` stores a per-tab map keyed by numeric `frameId`.

`registerFrameAgent(sender)` derives:

- tab id;
- frame id;
- sender URL;
- bounded `sender.documentId`;

and builds a record containing:

- `frameId`;
- `documentId`;
- URL;
- `registeredAt = Date.now()`.

After the capacity check it executes:

`map.set(frameId, record)`.

If the frameId already exists, the existing record is replaced unconditionally. There is no expected previous document generation/CAS or proof that the registering sender still occupies that frameId at commit time.

## `registeredAt` cannot provide ordering truth

The timestamp is assigned when the worker processes the registration, not when the child document became current.

Therefore a delayed old message A processed after current B receives a **later** `registeredAt` value. Sorting/choosing the largest timestamp would make the stale registration look newer.

The authoritative order must come from browser document/navigation identity, not worker message processing wall clock.

## Deterministic rollback schedule

1. Cross-origin child document A occupies frameId F and sends REGISTER A.
2. F navigates/replaces to document B.
3. B sends REGISTER B and worker processes it, storing `{F, documentId:B}`.
4. An already admitted/delayed async path for REGISTER A completes afterward, or message processing from the old generation reaches the registry mutation later.
5. `map.set(F, A-record)` overwrites B because F is the only physical key.
6. Registry now claims A is authoritative although B is the current browser document.

This is a registry rollback, not merely a missed cleanup.

## STATE validation becomes self-defeating after rollback

Existing `forwardFrameAgentState()` usefully compares the state sender's documentId with the stored registry record.

After stale A overwrote B:

- legitimate current STATE from B is rejected because stored documentId is A;
- the registry cannot heal itself from B state updates;
- UI can retain stale/missing remote selection information until another registration/reconciliation occurs.

A documentId check on STATE is therefore necessary but insufficient. REGISTER itself must be generation-safe.

## COMMAND becomes contradictory

Current command delivery is by `{tabId, frameId}` without exact child `documentId`.

After the rollback:

- registry metadata/permission checks refer to stale A URL/document receipt;
- Chrome message delivery by frameId can reach current B;
- command semantics are therefore authorized using A-shaped registry state but executed in B.

This concretely composes the registry rollback with the already known P1-171 exact-command-target defect.

Even if A and B share the same URL, same-URL navigation/reload remains a distinct document generation and must not inherit session/selection/print authority.

## REGISTER must be a compare-and-current-document transition

A safe registration contract needs browser-authoritative document generation.

At minimum:

- registry identity is `(tabId, frameId, childDocumentId, topDocumentGeneration)`;
- a new REGISTER may replace a slot only when worker proves that childDocumentId is the current document occupying F under the current top generation;
- an old REGISTER cannot overwrite a record belonging to a newer/current document generation merely because it is processed later;
- same-URL replacement still invalidates A.

Possible implementation mechanisms include exact-document browser APIs/current frame enumeration where available, or a top-document/session receipt that admits child registration only for the current discovered document generation. The implementation must not use `registeredAt` as navigation authority.

## Top-document generation remains part of the receipt

A valid child B registration under top document T1 must not automatically survive top navigation T1→T2 even if the child frameId/documentId happens to appear reusable.

REGISTER receipt should therefore bind both:

- child exact document generation;
- current top WebClip selection/control session generation.

Late A/B registrations from an old top session become stale instead of being forwarded into the replacement top document.

## Registry healing/reconciliation

LIST and command admission should be able to prune/repair stale records rather than treating map contents as self-authenticating.

When a current child sends a registration that conflicts with stored stale document identity, the system needs a browser-currentness check and then may atomically replace the stale record. It must not simply reject B forever because A happened to win the last worker message race.

Detached dynamic frames should likewise be removed so the 64-entry cap represents live/current generations.

## Permission composition

Optional host permission proves WebClip may access the origin; it does not prove which document generation is current.

A stale A registry record must not be preserved merely because permission for A's origin still exists. Conversely B must not inherit A's active WebClip frame-session authority solely because it has the same granted origin.

P1-201/P1-193 remain separate permission lifecycle/admission owners.

## Required regressions

1. A registers F -> navigate F to B -> B registers -> release delayed A register -> registry remains B/current; A cannot roll it back.
2. Same A/B URL -> stale A still cannot replace B.
3. After attempted stale A register, legitimate B STATE is accepted and routed to exact current top generation.
4. Command after A/B replacement targets exact B document receipt; stale A metadata cannot authorize a frameId-only send.
5. B registers before old A asynchronous forwarding to top completes -> old A register event is not delivered as current to replacement top document.
6. Top document T1→T2 while child B remains/reappears -> old T1 child registration does not become T2 session authority.
7. Late scripting injection into obsolete A cannot register/overwrite current B under P1-125 late-success reconciliation.
8. Dynamic iframe detach/recreate with reused/different frameIds prunes stale registry records and does not exhaust cap with historical entries.
9. Permission remains granted across A→B same origin -> access permission persists, but WebClip selection/control session generation is re-established explicitly.
10. Permission revoked during stale/current registration race -> no record becomes command-authoritative until current permission/document state is revalidated.
11. Worker restart reconstructs no false ordering from `registeredAt`; current documents re-register/reconcile under new worker/top session generation.
12. Current normal frame registration remains low-latency and does not require trusting page-provided identity fields beyond browser sender/document receipts.

## Duplicate check

- **P1-171** is primary: exact child/top document generation for registry and commands.
- **P1-200** owns remote frame control-session generation/order.
- **P1-125** owns late scripting actual-settlement/document receipt.
- **P1-193/P1-201** own optional permission admission/revocation and do not replace document identity.

No P1-211 is assigned.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
