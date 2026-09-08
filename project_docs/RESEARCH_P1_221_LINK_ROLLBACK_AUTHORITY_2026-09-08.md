# P1-221 — link normalization rollback needs private receipt + CAS

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-221`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Research branch: `research/p1-221-link-rollback-authority-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, Registry status, manifest, build, tag and release state are unchanged.

## 1. Classification

P1-221 remains the single current owner:

> Live PDF link-normalization rollback must use a private generation-owned receipt containing the exact original and exact temporary `href`. Cleanup may restore only when current live `href` still equals the temporary value written by that generation. A host-mutable DOM marker cannot authorize rollback.

This pass reconfirms `RESEARCH_DELTA_LINK_NORMALIZATION_ROLLBACK_AUTHORITY_2026-08-29.md` against fresh `main`, adds explicit marker-lifecycle and overlapping-generation schedules, and creates deterministic + source-bound closure gates. No new P-code is required.

## 2. Current source proof

`absolutizeLinksInIncludedContent()` currently does:

```js
const original = link.getAttribute('href');
link.setAttribute(ABS_HREF_ATTR, original);
link.setAttribute('href', link.href);
state.changedLinks.push(link);
```

`restoreAfterPrint()` later does:

```js
const original = link.getAttribute(ABS_HREF_ATTR);
if (original != null) link.setAttribute('href', original);
link.removeAttribute(ABS_HREF_ATTR);
```

The implementation therefore has two separate ownership defects.

### Defect A — no compare-before-restore

The cleanup does not verify that current live `href` still equals the exact temporary absolute `href` WebClip wrote.

If the page changes or removes `href` after normalization, cleanup overwrites/resurrects an older value.

### Defect B — rollback source is host mutable

The authoritative original value is reread from `data-webclip-original-href`, a page-visible/page-mutable DOM attribute.

The page can alter or remove that marker while the print preparation is in progress. Cleanup therefore trusts mutable page state as its rollback source.

## 3. Additional marker-lifecycle defect

Current normalization writes `ABS_HREF_ATTR` without preserving whether the page already had an attribute with the same name and what value it contained.

Therefore a pre-existing host value can be overwritten during preparation and then unconditionally removed during cleanup.

This is not a separate owner. It is another manifestation of the same P1-221 rule: DOM marker state is page-owned unless WebClip can prove and compare the exact temporary marker mutation it installed.

Preferred implementation direction is to remove the marker entirely if it is not required for print CSS/diagnostics. If retained, its own lifecycle needs a private original+temporary receipt and compare-before-restore/remove.

## 4. Required private receipt

For every normalized link:

```text
LinkRollbackReceipt {
    generation
    link                  // exact object identity

    originalHref {
        present
        value
    }

    temporaryHref {
        present
        value
    }

    // only if DOM marker remains in use
    originalMarker {
        present
        value
    }
    temporaryMarker {
        present
        value
    }
}
```

The original `href` must be captured before WebClip mutation and remain in private extension state until rollback completes.

The exact temporary absolute value must also be captured after normalization authority is established.

## 5. Href rollback CAS

Immediately before rollback:

1. read current live `{present,value}` for `href`;
2. verify the receipt still belongs to the correct preparation generation;
3. restore `originalHref` only when live `href` exactly equals `temporaryHref`;
4. if live `href` differs or is absent, report bounded `href-rollback-superseded` and do not mutate it.

This prevents stale cleanup from overwriting SPA/page changes.

## 6. DOM marker is never rollback authority

The following architecture is forbidden:

```text
original := DOM[data-webclip-original-href]
set href := original
```

If a marker remains useful for CSS or diagnostics, cleanup may touch the marker only when current live marker state still equals the exact temporary marker state written by the same generation.

If the page changed the marker, leave the page value untouched.

The marker must never determine what value is restored into `href`.

## 7. Overlapping generations

Generation A can still own a temporary absolute `href` when generation B starts.

B must not treat A's still-owned temporary absolute value as the page's new original baseline. If the live value still exactly matches A's private temporary receipt, B inherits A's original baseline.

Conversely, if the page superseded A before B begins, B's original baseline is the new host value.

Old cleanup A must never revert B's normalized link.

## 8. Detached/replaced nodes

Receipt authority is exact object identity.

If the original link node is detached/replaced, cleanup must not locate and mutate another node by selector/id/path similarity. A replacement object is page-owned unless independently admitted by a newer preparation receipt.

## 9. Deterministic model

Added:

`project_tools/test_p1_221_link_rollback_model.js`

Covered schedules:

1. unchanged temporary absolute href -> exact original relative href restored;
2. host changes href -> host value survives;
3. host removes href -> cleanup does not resurrect old href;
4. host changes DOM rollback marker -> private receipt still restores eligible href while host marker survives;
5. pre-existing host marker -> restored if WebClip temporarily uses the marker;
6. newer generation takes over an older still-owned temporary href -> old cleanup cannot revert new generation and final rollback reaches original baseline;
7. host supersedes A before B begins -> B preserves the host's new baseline;
8. detached exact link -> replacement object remains untouched.

The model also contains the current-shape stale-write counterexample.

Pre-commit local execution:

```text
P1-221 current-shape counterexample: stale rollback overwrites newer host href
P1-221 link rollback private-receipt/CAS deterministic model: PASS
```

The same file passed `node --check` before commit.

## 10. Source-bound closure gate

Added:

`project_tools/test_p1_221_link_rollback_source.js`

The gate requires:

- normalization still explicitly snapshots and writes `href`;
- `state.changedLinks` becomes structured private receipts rather than a bare element list;
- each receipt contains exact link identity, original href, exact temporary href and generation/epoch ownership;
- cleanup reads current live `href` before restore;
- cleanup compares live value with exact temporary receipt value;
- cleanup has explicit superseded/generation logic;
- cleanup may not restore `href` from `ABS_HREF_ATTR`;
- if the DOM marker remains, its original+temporary state must also be privately recorded and compared before cleanup mutation.

The gate passed `node --check` before commit.

Current production source is expected to fail this gate because it stores only the link object in `state.changedLinks`, rereads original rollback authority from `ABS_HREF_ATTR`, has no live-href CAS, and removes the marker unconditionally. This is source inspection rather than a claim that the gate was executed against an exact production checkout in this session.

## 11. Acceptance matrix

| Schedule | Required result |
|---|---|
| current href == exact temporary | restore exact original |
| host changes href | preserve host href |
| host removes href | preserve absence |
| host changes/removes marker | href rollback authority unchanged; host marker state preserved |
| pre-existing marker | not lost by WebClip cleanup |
| old generation after newer normalization | old cleanup cannot revert new generation |
| host supersedes A before B | B restores to host's new baseline, not A's obsolete original |
| original link detached/replaced | replacement untouched |
| success/failure cleanup | same CAS/identity contract |

## 12. Adjacent owner boundaries

### P0-071

P0-071 owns safe printable URI schemes and print-render TOCTOU. P1-221 owns post-preparation live-DOM rollback authority. A safe printable URL can still have an unsafe rollback implementation, and vice versa.

### P0-075

The preferred long-term architecture remains URL normalization in an isolated/frozen WebClip-owned print representation rather than mutating live page links.

### P1-218

P1-218 defines the same general compare-before-restore principle for temporary resource attributes. P1-221 remains separate because link rollback currently has the additional page-mutable rollback-source marker and printable-link semantics.

### P1-220

P1-220 concerns exact generated-node deletion identity. P1-221 concerns page-owned attribute CAS and private rollback data.

## 13. Research conclusion

The correct rollback chain is:

```text
exact link object
+ private original href
+ exact temporary href
+ preparation generation
-> compare live href
-> conditional restore
```

The DOM marker may be diagnostic metadata, but cannot be a rollback capability.

P1-221 remains ACTIVE until production implementation and direct verification satisfy the Registry contract.
