# P1-219 — generation-owned structural rollback for temporary image-link wrappers

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-219`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Research branch: `research/p1-219-image-wrapper-rollback-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, Registry, manifest and release state are unchanged.

## 1. Classification

P1-219 remains the single owner for this root cause:

> A temporary image-link wrapper is a live DOM topology mutation. Cleanup may unwrap only structure that is still owned by the same preparation generation; it must never move a page-owned image back to an old parent after host topology has superseded WebClip's mutation.

This confirms the historical docs-only delta `RESEARCH_DELTA_PRINT_IMAGE_WRAPPER_STRUCTURAL_ROLLBACK_2026-08-29.md`, now consolidated into `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md`.

P1-219 is distinct from P1-218. P1-218 owns reversible attribute values; P1-219 owns parent/child topology and reparenting of a host node.

## 2. Current source pipeline

`content.js::wrapUnlinkedImagesForPdf()` finds included images that are not already inside a link. For each eligible image it:

1. saves `parent = image.parentNode`;
2. saves `nextSibling = image.nextSibling`;
3. creates a new temporary `<a>`;
4. inserts the new link immediately before the image;
5. calls `link.appendChild(image)`, moving the page-owned image into the extension-created wrapper;
6. stores `{ image, link, parent, nextSibling }` in `state.wrappedImages`.

This is a real mutation of the live host DOM. The exact image object and exact generated wrapper object are retained, which is a useful positive control.

## 3. Current cleanup

`restoreAfterPrint()` later iterates `state.wrappedImages` in reverse. Current logic has this shape:

```text
if image && old parent:
    if old nextSibling is still under old parent:
        old parent.insertBefore(image, old nextSibling)
    else:
        old parent.appendChild(image)
remove wrapper
```

There is no requirement that:

- `image.parentNode === exact generated wrapper`;
- the wrapper still contains only that image;
- the wrapper is still owned by the active preparation generation;
- the image has not been adopted/moved by the host;
- a newer WebClip generation has not superseded this receipt.

Therefore old `parent/nextSibling` are treated as rollback authority rather than historical evidence.

## 4. Confirmed structural counterexample

```text
Initial host DOM:
P: [ IMG, SIBLING ]

WebClip prepare:
P: [ WRAPPER(IMG), SIBLING ]

Host reacts while print preparation is active:
Q: [ IMG ]
P: [ WRAPPER(empty), SIBLING ]

Current WebClip cleanup:
old P.insertBefore(IMG, old SIBLING)
remove WRAPPER

Final:
P: [ IMG, SIBLING ]
Q: [ ]
```

WebClip has moved a page-owned node out of the host's newer parent and reconstructed an obsolete topology snapshot.

This is not ordinary cleanup incompleteness. It is a stale structural writer.

## 5. Why `parent/nextSibling` are not ownership

`parent` and `nextSibling` are useful to describe the topology before WebClip's mutation, but live pages can legitimately:

- move the image to another container;
- remove or replace the original sibling;
- move the wrapper and image together;
- detach the wrapper;
- add nodes to the generated wrapper;
- start a newer WebClip preparation generation.

A snapshot of old placement cannot authorize mutation after any of those changes.

The cleanup question is not “where was the image before?” but:

> “Does this exact preparation generation still own the exact temporary structural relationship it is about to undo?”

## 6. Target structural receipt

Conceptually:

```text
ImageWrapperReceipt {
    generation,
    image,
    wrapper,
    originalParent,       // evidence/fallback diagnostics, not stale authority
    originalNextSibling,  // evidence/fallback diagnostics, not stale authority
    status:
        installed
        | restored
        | superseded
        | stale-generation
}
```

The exact wrapper object is a private ownership token. Textual id/attribute lookup is not required for this mutation class and must not replace object identity.

## 7. Core invariants

### I1 — Exact objects

Receipt must retain exact `image` and exact generated `wrapper` object identities.

### I2 — Image relationship before reparenting

Before any cleanup operation that moves the image, prove:

```text
image.parentNode === wrapper
```

If false, the host has adopted/moved the image or topology otherwise changed. Cleanup must not move the image.

### I3 — Wrapper-content ownership

Before removing/unwrapping a wrapper that still contains the image, prove it contains no page-owned additions. The strongest simple case is:

```text
wrapper children == [ exact image ]
```

If host content was inserted into the wrapper, removing it can delete or reparent host-owned descendants and must be treated as superseded.

### I4 — Generation ownership

Cleanup generation A performs zero topology writes after generation B has become authoritative for the same preparation context.

### I5 — Host adoption wins

If the image is no longer a child of the exact wrapper, leave the image wherever the host placed it.

An empty exact generated wrapper may be removed if doing so cannot affect page-owned descendants/state. A non-empty superseded wrapper must not be destroyed merely because it originated from WebClip.

### I6 — Do not reconstruct stale position

Old `parent/nextSibling` cannot be used to drag a host-moved image back into historical topology.

### I7 — Prefer in-place unwrap when still owned

When the exact wrapper is attached and contains only the exact image, a robust cleanup can replace/unwrap the wrapper **at its current position** rather than reconstructing old position from `parent/nextSibling`.

This has useful properties:

- if old `nextSibling` disappears, cleanup remains deterministic;
- if host inserts siblings around the wrapper, their order survives;
- if host moves wrapper+image as a unit, cleanup can remove only the temporary wrapper while preserving the host's current placement.

Equivalent implementations are acceptable if they prove the same ownership/final-state semantics.

### I8 — Detached wrapper

If wrapper is detached while still containing image, cleanup cannot infer where the image should be attached. No topology reconstruction from the old snapshot is allowed.

### I9 — Success/failure parity

Normal print completion and error/cancel cleanup use the same structural ownership rule.

### I10 — Bounded diagnostics

Restored vs superseded structural cleanup may be recorded with bounded metadata, but diagnostics must not serialize host DOM content.

## 8. Deterministic model schedules

`project_tools/test_p1_219_image_wrapper_rollback_model.js` includes a current-shape counterexample plus eight schedules.

### A. Intact exact wrapper

Wrapper still contains only exact image. Expected: safe unwrap restores ordinary image topology.

### B. Host moves image elsewhere

Image is adopted by another live parent before cleanup. Expected: WebClip never moves it back; an empty exact wrapper may be removed.

### C. Host removes/replaces wrapper and retains image elsewhere

Expected: cleanup performs no image adoption/reparent.

### D. Original `nextSibling` changes

Expected: cleanup is ownership-based and does not rely on stale position heuristics.

### E. Host moves wrapper+image as one unit

Expected: safe in-place unwrap preserves the host's current parent/location rather than forcing the old parent.

### F. Host adds a child to the wrapper

Expected: wrapper is superseded; cleanup does not remove wrapper or reparent image because that would mutate host-added topology.

### G. Older preparation cleanup arrives after newer generation

Expected: old generation performs zero topology writes.

### H. Wrapper is detached but still contains image

Expected: no attempt to reconstruct an attachment location from old parent/sibling snapshot.

## 9. Neighbor-owner boundaries

### P1-218 — resource attributes

Owns `src/srcset/loading` compare-before-restore and generation authority. It does not own DOM parent/child topology.

### P1-220 — print-header identity

Owns removal of the exact generated print-header node versus a fresh node with the same textual id. P1-219 already retains exact wrapper object; its additional problem is the page-owned image's current parent/child relationship.

### P1-221 — link normalization attributes

Owns `href` normalization rollback authority. The wrapper's link attributes may have their own safety requirements, but P1-219 is about topology and image reparenting.

### P0-071 — print render link safety

Owns safe printable link schemes/render-cut sanitation. P1-219 does not determine whether the image link should exist or which schemes are printable; it determines whether temporary live-DOM structure can be undone safely.

### P0-004 / P0-075

These broader owners cover selected-PDF fidelity and hostile/live-page print boundary. P1-219 is the concrete late structural rollback root cause and should remain separately testable.

No owner merge is justified.

## 10. Current positive controls

Preserve these facts:

1. wrapper is a newly created object;
2. receipt stores exact image object;
3. receipt stores exact wrapper object;
4. cleanup uses reverse order;
5. image is skipped if already inside a link at preparation time;
6. the wrapper exists only to make an otherwise unlinked selected image clickable in PDF.

The missing evidence is structural ownership at cleanup time.

## 11. Source-bound RED gate

`project_tools/test_p1_219_image_wrapper_rollback_source.js` is a future production closure gate. It requires:

- feature/receipt collection remains explicit;
- exact image and wrapper object identities remain in the receipt;
- receipt is preparation-generation/epoch owned;
- cleanup proves `image.parentNode === exact wrapper` before image reparenting;
- cleanup checks wrapper contents before removing/unwrapping;
- stale generations are fenced;
- ownership-aware restored/superseded path exists;
- old `parent.insertBefore(image,nextSibling)` / fallback `parent.appendChild(image)` cleanup shapes are absent.

Current source inspection lacks these target checks, so expected source-gate semantics on current production are RED until runtime implementation.

As with the previous owner, this research does not label source-gate RED as executed against exact production bytes unless the exact committed `content.js` blob is actually run with the gate.

## 12. Physical Chromium E2E closure matrix

Production closure needs browser evidence on the live page:

1. intact WebClip wrapper -> PDF link remains functional and cleanup unwraps normally;
2. host moves image to another parent before cleanup -> image remains there;
3. host removes wrapper after moving image -> no stale adoption;
4. host changes original sibling topology -> cleanup does not reconstruct obsolete ordering;
5. host moves wrapper+image as unit -> temporary wrapper is removed without undoing current placement, if chosen architecture permits this safe case;
6. host inserts a child into wrapper -> cleanup does not delete host content;
7. late generation A cleanup after B -> zero A topology mutations;
8. failure path follows same ownership checks.

## 13. Production closure criteria

P1-219 may leave ACTIVE only after fresh canonical evidence proves:

- exact wrapper/image receipt;
- generation ownership;
- image-parent structural ownership check;
- safe wrapper-content check;
- no stale parent/nextSibling reconstruction of host-moved images;
- deterministic model PASS;
- source gate actually executed PASS on exact committed production source;
- relevant print/link regressions remain PASS;
- real Chromium host-topology races PASS;
- Registry changes only after those facts exist.

## 14. Validation in this research block

The deterministic model was run before commit and produced:

```text
P1-219 current-shape counterexample: legacy cleanup reparents host-moved image
P1-219 image-wrapper structural rollback deterministic model: PASS
```

The source gate was syntax-checked before commit. Exact committed blob SHA comparison is performed after commit before model execution is called committed-byte evidence.

No product runtime tests, Chrome E2E, build, tag, release or deployment are performed by this research-only branch.

## 15. Registry/release state

No Registry status change is made. P1-219 remains ACTIVE until production closure. Production runtime and manifest are unchanged; release state remains unchanged.

## 16. Next owner

After final fresh-check, the next sequential ACTIVE owner is expected to be P1-220 — exact print-header cleanup identity. Start it only if fresh Registry and branch/PR search still show it unsaturated.
