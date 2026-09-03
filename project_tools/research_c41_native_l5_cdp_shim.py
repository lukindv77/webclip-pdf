#!/usr/bin/env python3
"""CDP navigation shim for the C41 real-native Save As evidence harness."""
from __future__ import annotations

import argparse
import importlib.util
import pathlib
import tempfile
import shutil


ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "project_tools" / "research_c41_native_l5.py"
spec = importlib.util.spec_from_file_location("c41_native_base", BASE_PATH)
if spec is None or spec.loader is None:
    raise SystemExit("C41 base harness import unavailable")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def launch_case(pw, chrome: str, label: str):
    profile = pathlib.Path(tempfile.mkdtemp(prefix=f"webclip-c41-{label}-profile-"))
    downloads = profile / "Downloads"
    downloads.mkdir(parents=True, exist_ok=True)
    context = pw.chromium.launch_persistent_context(
        str(profile),
        executable_path=chrome,
        headless=False,
        accept_downloads=True,
        downloads_path=str(downloads),
        args=[
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--enable-unsafe-extension-debugging",
            "--window-size=1280,900",
        ],
    )
    browser = context.browser
    if browser is None:
        raise AssertionError("persistent Chromium browser handle unavailable")
    cdp = browser.new_browser_cdp_session()
    loaded = cdp.send("Extensions.loadUnpacked", {"path": str(ROOT)})
    extension_id = str(loaded.get("id") or "")
    if len(extension_id) != 32:
        raise AssertionError(f"Extensions.loadUnpacked returned invalid id: {extension_id!r}")

    # Playwright page.goto() rejects direct chrome-extension:// navigation in
    # this runner even though the unpacked extension itself is loaded. Use the
    # same browser-level target creation path as the repository's proven
    # unpacked integration harness, then adopt the resulting Page object.
    journal_url = f"chrome-extension://{extension_id}/journal.html"
    created = cdp.send("Target.createTarget", {"url": journal_url})
    if not created.get("targetId"):
        raise AssertionError("Target.createTarget did not return targetId")
    page = base.wait_until(
        lambda: next((p for p in context.pages if p.url == journal_url or p.url.startswith(journal_url + "?")), None),
        timeout=15,
        interval=0.1,
        label="CDP-created Journal extension page",
    )
    base.wait_journal_ready(page)
    return {
        "profile": profile,
        "downloads": downloads,
        "context": context,
        "browser": browser,
        "cdp": cdp,
        "page": page,
        "extensionId": extension_id,
        "journalTargetId": created["targetId"],
    }


base.launch_case = launch_case


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=base.CHROME_DEFAULT)
    args = parser.parse_args()
    base.run(args.chrome)


if __name__ == "__main__":
    main()
