#!/usr/bin/env python3
"""Fresh C41 matrix: automatic download settlement and native Save As lifecycle."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess


ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
OFFSCREEN = (ROOT / "offscreen.js").read_text(encoding="utf-8")
PREPARED = (ROOT / "prepared-save-as.js").read_text(encoding="utf-8")
LOCAL_IDENTITY = (ROOT / "local-download-identity.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or ""
)


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def section(source, start, end):
    left = source.index(start)
    right = source.index(end, left + len(start))
    return source[left:right]


def source_contract():
    automatic = section(
        WORKER, "async function startAutomaticBlobDownloadBounded", "async function finalizePendingLocalDownload"
    )
    generate = section(
        WORKER, "async function generatePdfAndDownload", "async function generatePdfAndUploadToYandex"
    )
    started_handler = section(
        WORKER, "case 'WEBCLIP_PREPARED_SAVE_AS_STARTED'", "case 'WEBCLIP_PREPARED_SAVE_AS_RELEASE'"
    )
    started_transition = section(
        WORKER, "function markPreparedSaveAsStarted", "function releasePreparedSaveAsCheckpoint"
    )
    settled_handler = section(
        WORKER, "case 'WEBCLIP_JOURNAL_EXPORT_SAVE_AS_SETTLED'", "case 'WEBCLIP_JOURNAL_IMPORT_REPLACE'"
    )
    return {
        "automaticIntentPrecedesIrreversibleStart": (
            generate.index("checkpointPendingLocalDownloadIntent")
            < generate.index("startAutomaticBlobDownloadBounded")
        ),
        "automaticUnknownDoesNotRetry": (
            "automaticDownloadStartSettlements" in automatic
            and "return { pending: true" in automatic
            and automatic.count("chrome.downloads.download(") == 1
        ),
        "automaticUsesExactBlobIdentity": (
            "matchesExactBlobUrl" in LOCAL_IDENTITY and "chooseUniqueDownloadForIntent" in LOCAL_IDENTITY
        ),
        "nativeDialogIsPageOwnedAndUntimed": (
            "saveAs: true" in PREPARED
            and "Promise.race" not in PREPARED
            and "setTimeout" not in PREPARED
        ),
        "nativePreparedStartedReleasedAreDistinct": all(
            token in WORKER
            for token in (
                "preparedSaveAsCheckpointKey(sessionId, 'prepared')",
                "preparedSaveAsCheckpointKey(sessionId, 'started')",
                "preparedSaveAsCheckpointKey(sessionId, 'released')",
            )
        ),
        "positiveReleasedTombstoneBeforeRevoke": (
            WORKER.index("[releasedKey]: record") < WORKER.index("await revokeBlobUrl(record.blobUrl)")
        ),
        "findingWatcherArmedBeforeDurableStarted": (
            started_handler.index("revokeBlobUrlWhenDownloadFinishes")
            < started_handler.index("markPreparedSaveAsStarted")
        ),
        "findingStartedTransitionDoesNotValidatePreparedReceiptFields": (
            "stored?.[preparedKey]" in started_transition
            and "stored?.[preparedKey].blobUrl" not in started_transition
            and "stored?.[preparedKey].ownerPage" not in started_transition
            and "stored?.[preparedKey].operationId" not in started_transition
        ),
        "findingNoWorkerRestartReconstruction": WORKER.count("PREPARED_SAVE_AS_INDEX_KEY") == 7,
        "findingCommonBlobFallbackTtlIsSixteenMinutes": (
            "const BLOB_URL_FALLBACK_TTL_MS = 16 * 60 * 1000;" in OFFSCREEN
            and "setTimeout(() => revokeUrl(url), BLOB_URL_FALLBACK_TTL_MS)" in OFFSCREEN
        ),
        "findingStartedReportedAsTerminalOperationSuccess": (
            "recordOperationStage(operationId, 'complete'" in settled_handler
            and "finishOperationLog(operationId, 'success'" in settled_handler
        ),
        "contentSurfacesPendingWithoutRetryAdvice": (
            "result.downloadStartPending" in CONTENT
            and "не запускайте автоматический повтор этой же операции" in WORKER
        ),
    }


def run_command(name, command, env, timeout):
    proc = subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        raise AssertionError(f"{name} failed ({proc.returncode})\n{proc.stdout[-12000:]}")
    return {
        "name": name,
        "returnCode": proc.returncode,
        "stdoutSha256": sha(proc.stdout),
        "lastLine": proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else "",
        "stdout": proc.stdout,
    }


def parse_json_tail(output, marker=""):
    text = output
    if marker:
        pos = text.rfind(marker)
        if pos < 0:
            raise AssertionError(f"result marker missing: {marker}")
        text = text[pos + len(marker) :]
    match = re.search(r"(\{[\s\S]*\})\s*$", text.strip())
    if not match:
        raise AssertionError(f"JSON result missing\n{text[-4000:]}")
    return json.loads(match.group(1))


def run(chrome):
    if not chrome:
        raise SystemExit("Chrome unavailable")
    env = dict(os.environ)
    env["CHROMIUM_BIN"] = chrome
    env["WEBCLIP_CHROME_FOR_TESTING"] = chrome

    tests = []
    deterministic = [
        ("p1-146-late-settlement", ["node", "project_tools/test_p1_146_download_start_settlement.js"]),
        ("p0-048-exact-download-identity", ["node", "project_tools/test_p0_048_local_download_identity.js"]),
        ("p0-039-unknown-retention", ["node", "project_tools/test_p0_039_local_download_dead_letter.js"]),
        ("p1-079-080-save-as-owner", ["node", "project_tools/test_p1_079_080_save_as_owner.js"]),
        ("p1-129-save-as-checkpoint-order", ["node", "project_tools/test_p1_129_prepared_save_as_checkpoint.js"]),
    ]
    for name, command in deterministic:
        item = run_command(name, command, env, 90)
        tests.append({k: v for k, v in item.items() if k != "stdout"})

    save_as_browser = run_command(
        "browser-save-as-page-owner",
        ["python", "project_tools/browser_p1_079_080_save_as_owner.py"],
        env,
        120,
    )
    save_as_result = parse_json_tail(save_as_browser["stdout"])
    tests.append({k: v for k, v in save_as_browser.items() if k != "stdout"})

    automatic_browser = run_command(
        "real-unpacked-automatic-download",
        ["node", "project_tools/browser_p1_007_unpacked_integration.js"],
        env,
        180,
    )
    automatic_result = parse_json_tail(
        automatic_browser["stdout"], "P1-007 real Chromium browser integration OK"
    )
    tests.append({k: v for k, v in automatic_browser.items() if k != "stdout"})

    result = {
        "browser": subprocess.check_output([chrome, "--version"], text=True).strip(),
        "workerSha256": sha(WORKER),
        "offscreenSha256": sha(OFFSCREEN),
        "preparedSaveAsSha256": sha(PREPARED),
        "localDownloadIdentitySha256": sha(LOCAL_IDENTITY),
        "sourceContract": source_contract(),
        "deterministicAndBrowserTests": tests,
        "realAutomaticDownload": {
            "extensionId": automatic_result.get("extensionId", ""),
            "articleTabId": automatic_result.get("articleTabId", 0),
            "pdfBytes": automatic_result.get("pdfBytes", 0),
            "pdfFilename": automatic_result.get("pdfFilename", ""),
            "journalEntryId": automatic_result.get("journalEntryId", ""),
        },
        "saveAsBrowserControl": save_as_result,
        "evidenceBoundary": {
            "automaticDownload": "real unpacked Chrome extension, physical PDF file and Journal entry",
            "saveAs": "browser-executed page-owner control with mocked downloads API; no real native file chooser",
            "nativeL5Remaining": True,
        },
    }
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C41_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    assert all(result["sourceContract"].values()), result["sourceContract"]
    assert all(item["returnCode"] == 0 for item in tests), tests
    auto = result["realAutomaticDownload"]
    assert auto["pdfBytes"] > 500 and auto["pdfFilename"].lower().endswith(".pdf"), auto
    assert auto["journalEntryId"], auto
    save_as = result["saveAsBrowserControl"]
    assert save_as.get("ok") is True and save_as.get("pendingDialogSingleCall") is True, save_as
    assert save_as.get("noCallerTimeoutOrReleaseWhilePending") is True, save_as
    assert result["evidenceBoundary"]["nativeL5Remaining"] is True
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    args = parser.parse_args()
    run(args.chrome)


if __name__ == "__main__":
    main()
