# P1-129 closure — durable prepared Save As checkpoint serialization

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Full Journal and OperationLog export now create a `chrome.storage.session` durable PREPARED checkpoint before returning the prepared Blob to `journal.html` / `options.html`. Page-owned `prepared-save-as.js` carries the session id through STARTED and RELEASE messages. PREPARED, STARTED and RELEASED are distinct receipt keys; RELEASED is the durable tombstone. Checkpoint mutations are queued behind actual settlement rather than only caller settlement, so a local timeout cannot let a later transition overtake the unresolved storage side effect. RELEASE writes its tombstone before removing older receipts and revoking the Blob.

The native `chrome.downloads.download({saveAs:true})` call is still owned by the extension page, has no synthetic timeout, and is never automatically retried. The existing page-owned terminal listener and worker Blob watchdog are preserved.

Dedicated `project_tools/test_p1_129_prepared_save_as_checkpoint.js` forces a PREPARED storage write past its local deadline, proves RELEASE cannot overtake it, then proves RELEASED is durable before Blob revoke. P1-079/P1-080 owner regression remains green. Full gate: **75/75 JS syntax PASS; 62/62 deterministic tests PASS**.

Real unpacked Chrome native Save As interaction remains release QA; manifest is not bumped.
