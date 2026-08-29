# RESTORE HANDOFF ARCHIVE

Canonical readable handoff files are stored directly in `project_docs/HANDOFF_2026-08-29/`.

A text-safe base64 copy of the ZIP is stored as:
`project_docs/HANDOFF_2026-08-29/WebClip_Handoff_2026-08-29.zip.b64`

Restore locally:

```bash
base64 -d WebClip_Handoff_2026-08-29.zip.b64 > WebClip_Handoff_2026-08-29.zip
unzip WebClip_Handoff_2026-08-29.zip
```

The ZIP contains readable handoff files, not a duplicate of the whole repository. The repository `main` at a fresh HEAD is the canonical source archive for code/runtime/project docs.

Control baseline before handoff commits:
`e42e4bbb08f00b6717b59e3ec94693e03eb1cda6`
