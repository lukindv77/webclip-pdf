# ARCHITECTURE INVARIANTS / DESIGN DIRECTION

These are the recurring conclusions of the audit and should guide future fixes.

## 1. Generation is authority

A textual ID, path, URL, tabId, frameId or current config value is not enough. Mutating operations consume an immutable generation/receipt established when user intent was admitted.

Examples:
- top document: tabId + exact document/navigation/application generation;
- child iframe: frameId + exact child document generation + permission generation;
- Journal mutation: entry/data-set generation + expected revision/CAS;
- Yandex: account/auth/root/config/publication generation;
- physical upload/download: exact attempt generation and object/DownloadItem identity;
- UI page workflow: source-page operation generation so old terminal events cannot overwrite new workflow state.

## 2. Caller timeout is not cancellation

Chrome Storage, tabs.create, scripting, downloads and remote requests may settle after local timeout. Preserve actual settlement and fence later operations. Outcome vocabulary should include:
- not admitted;
- admitted/unknown;
- verified success;
- verified failure/conflict;
- superseded/stale generation.

Never translate `timeout` directly to “nothing happened”.

## 3. Durable receipt and diagnostics are separate

OperationLog can be cleared/retained and is not the sole authority. Physical recovery receipts must survive diagnostics cleanup as appropriate. Compact detached evidence may outlive expensive Blob/staging bodies.

## 4. Recovery uses exact identity

Prefer:
- Chrome numeric `downloadId` over filename/time/bytes heuristics;
- Yandex `resource_id` + captured account/root generation over path/size;
- source revision over global `lastSuccessAt`;
- exact staged key/bytes receipt over re-fetching mutable remote path.

## 5. Portable backup schema is explicit

Do not export `{...internalIndexedDbRow}` as versioned public schema. Internal lifecycle/checkpoint/capability fields require explicit portable semantics. Imported remote metadata is historical/unverified unless locally re-bound.

## 6. Side-effect admission and completion are separate

Examples:
- Save Root can commit config before folder/scheduler reconciliation.
- Disconnect can remove auth before PKCE/status/scheduler cleanup.
- Create Folder is a multi-segment remote saga.
- Publish/unpublish and upload are separate physical phases.

UI must tell the truth about partial/unknown completion.

## 7. Page-owned DOM is not a trusted frozen artifact

Printable selection must ultimately become a WebClip-owned frozen/inert representation. Shared `data-webclip-*` marker attributes, synthetic page-control clicks, live mutable subtree and active deep clones are not sufficient trust boundaries.

## 8. One source-page operation admission gate

Popup Start, context-menu Start, direct compatibility Start, Journal Apply and future selection-mutating commands must obey the same `pageUploadActive`/operation-generation gate. Old upload terminal UI must not overwrite a newer authorized page workflow.
