#!/usr/bin/env python3
"""Fresh-restart C15 physical-PDF link/anchor fidelity probe.

The probe separates native Chromium behavior from the production-shaped
same-origin BODY flattening used by WebClip.  It verifies ordinary external,
image and same-document fragment links, then proves whether document-local
anchor identity survives the inert flattened-frame representation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import fitz


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chrome_path() -> str:
    for candidate in (
        "google-chrome-stable",
        "google-chrome",
        "chromium",
        "chromium-browser",
    ):
        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    raise RuntimeError("No Chrome/Chromium executable is available.")


def validate_current_source(repo_root: Path) -> dict[str, object]:
    content_path = repo_root / "content.js"
    inert_path = repo_root / "frame-proxy-inert-guard.js"
    content = content_path.read_text(encoding="utf-8")
    inert = inert_path.read_text(encoding="utf-8")

    absolutize_start = content.find("function absolutizeLinksInIncludedContent() {")
    absolutize_end = content.find("function wrapUnlinkedImagesForPdf() {", absolutize_start)
    flatten_start = content.find("function copyFrameCloneUrlState(source, target) {")
    flatten_end = content.find("function copyComputedFrameCloneStyle(source, target) {", flatten_start)
    assert absolutize_start >= 0 and absolutize_end > absolutize_start
    assert flatten_start >= 0 and flatten_end > flatten_start
    absolutize = content[absolutize_start:absolutize_end]
    flatten = content[flatten_start:flatten_end]

    assert "collectIncludedElements('a[href], area[href]')" in absolutize
    assert "link.setAttribute('href', link.href)" in absolutize
    assert "if (tag === 'a' && source.href)" in flatten
    assert "target.setAttribute('href'" in flatten
    assert "name === 'id' || name === 'name' || name === 'is'" in inert

    return {
        "content_sha256": sha256(content_path.read_bytes()),
        "inert_guard_sha256": sha256(inert_path.read_bytes()),
        "absolutize_segment_sha256": sha256(absolutize.encode("utf-8")),
        "frame_url_segment_sha256": sha256(flatten.encode("utf-8")),
        "same_document_fragment_is_absolutized": True,
        "flattened_identity_attributes_are_stripped": True,
    }


def page_html(*, prepared: bool, label: str) -> str:
    prepare = """
      for (const link of document.querySelectorAll('a[href], area[href]')) {
        link.setAttribute('data-webclip-original-href', link.getAttribute('href'));
        link.setAttribute('href', link.href);
      }
      for (const image of document.querySelectorAll('img[data-wrap]')) {
        if (image.closest('a[href]')) continue;
        const link = document.createElement('a');
        link.href = image.currentSrc || image.src;
        link.setAttribute('data-webclip-image-link', '1');
        image.parentNode.insertBefore(link, image);
        link.appendChild(image);
      }
    """ if prepared else ""
    return f"""<!doctype html>
<meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 12mm; }}
  body {{ font: 20px Arial, sans-serif; }}
  a {{ display: inline-block; margin: 4px 0; }}
  .spacer {{ height: 1050px; }}
  img {{ width: 180px; height: 60px; border: 1px solid #333; }}
</style>
<h1>{label}</h1>
<p><a id="internal-link" href="#dest">INTERNAL_LINK</a></p>
<p><a href="https://external.example/path?q=1#part">EXTERNAL_LINK</a></p>
<p><a href="mailto:reader@example.test">MAIL_LINK</a></p>
<p><a href="tel:+1234567890">TEL_LINK</a></p>
<p><img data-wrap alt="SOURCE_IMAGE" src="/red.svg"></p>
<div class="spacer">SPACER</div>
<h2 id="dest">DESTINATION_TOKEN</h2>
<script>{prepare}</script>
"""


def flattened_html(*, causal: bool) -> str:
    causal_js = """
      const targetDestination = targetElements[sourceElements.indexOf(sourceDoc.querySelector('#frame-dest'))];
      const targetInternal = targetElements[sourceElements.indexOf(sourceDoc.querySelector('#frame-internal'))];
      targetDestination.id = 'webclip-c15-frame-dest';
      targetInternal.setAttribute('href', '#webclip-c15-frame-dest');
    """ if causal else ""
    return f"""<!doctype html>
<meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 12mm; }}
  body {{ font: 20px Arial, sans-serif; }}
  section[data-webclip-pdf-flattened-frame] {{ display:block; width:100%; }}
  a {{ display:inline-block; margin:4px 0; }}
  .spacer {{ height:1050px; }}
  img {{ width:180px; height:60px; border:1px solid #333; }}
</style>
<h1>{'CAUSAL_NAMESPACED' if causal else 'PRODUCTION_SHAPED'}</h1>
<iframe id="source-frame" src="/frame-source" style="width:760px;height:500px;border:0"></iframe>
<script>
  const STRIP = new Set(['id','name','is','for','form','list','headers','aria-controls','aria-owns',
    'aria-activedescendant','aria-labelledby','aria-describedby','aria-details','aria-errormessage',
    'action','formaction','formenctype','formmethod','formtarget','target','download','ping','autofocus',
    'autoplay','contenteditable','srcdoc']);
  const ACTIVE = new Set(['script','iframe','frame','object','embed','applet','portal','fencedframe',
    'audio','video','link','style','meta','base']);

  function inertClone(source, ownerDoc) {{
    if (source.nodeType === Node.TEXT_NODE) return ownerDoc.createTextNode(source.data || '');
    if (source.nodeType === Node.COMMENT_NODE) return ownerDoc.createComment(source.data || '');
    if (source.nodeType !== Node.ELEMENT_NODE) return ownerDoc.createDocumentFragment();
    const sourceTag = source.localName.toLowerCase();
    const targetTag = ACTIVE.has(sourceTag) ? (/^(script|style|link|meta|base)$/.test(sourceTag) ? 'span' : 'div') : sourceTag;
    const target = ownerDoc.createElement(targetTag);
    for (const attribute of [...source.attributes]) {{
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || STRIP.has(name)) continue;
      target.setAttribute(attribute.name, attribute.value);
    }}
    target.setAttribute('inert','');
    for (const child of [...source.childNodes]) target.appendChild(inertClone(child, ownerDoc));
    return target;
  }}

  window.addEventListener('load', () => {{
    const frame = document.querySelector('#source-frame');
    const sourceDoc = frame.contentDocument;
    for (const link of sourceDoc.querySelectorAll('a[href], area[href]')) {{
      link.setAttribute('data-webclip-original-href', link.getAttribute('href'));
      link.setAttribute('href', link.href);
    }}
    for (const image of sourceDoc.querySelectorAll('img[data-wrap]')) {{
      if (image.closest('a[href]')) continue;
      const link = sourceDoc.createElement('a');
      link.href = image.currentSrc || image.src;
      link.setAttribute('data-webclip-image-link', '1');
      image.parentNode.insertBefore(link, image);
      link.appendChild(image);
    }}

    const proxy = document.createElement('section');
    proxy.setAttribute('data-webclip-pdf-flattened-frame','1');
    for (const node of [...sourceDoc.body.childNodes]) proxy.appendChild(inertClone(node, document));
    const sourceElements = [...sourceDoc.body.querySelectorAll('*')];
    const targetElements = [...proxy.querySelectorAll('*')];
    for (let index=0; index<Math.min(sourceElements.length,targetElements.length); index++) {{
      const source = sourceElements[index], target = targetElements[index];
      target.setAttribute('data-webclip-pdf-flattened-frame','1');
      if (source.localName === 'a' && source.href) target.setAttribute('href', source.href);
      if (source.localName === 'img' && source.currentSrc) target.setAttribute('src', source.currentSrc);
    }}
    {causal_js}
    const sourceHref = sourceDoc.querySelector('#frame-internal').href;
    const proxyInternal = proxy.querySelector('[data-c15-link="internal"]');
    const proxyDest = proxy.querySelector('[data-c15-destination="1"]');
    const diagnostic = document.createElement('p');
    diagnostic.textContent = `SOURCE_ABSOLUTE=${{sourceHref}} PROXY_HREF=${{proxyInternal.getAttribute('href')}} PROXY_DEST_ID=${{proxyDest.id || '[EMPTY]'}}`;
    document.body.append(diagnostic, proxy);
    frame.remove();
    document.documentElement.setAttribute('data-c15-ready','1');
  }});
</script>
"""


def frame_source_html() -> str:
    return """<!doctype html>
<meta charset="utf-8">
<style>
  @page { size:A4; margin:12mm; }
  body { font:20px Arial,sans-serif; }
  a { display:inline-block; margin:4px 0; }
  .spacer { height:1050px; }
  img { width:180px; height:60px; border:1px solid #333; }
</style>
<h1>FRAME_SOURCE</h1>
<p><a id="frame-internal" data-c15-link="internal" href="#frame-dest">FRAME_INTERNAL_LINK</a></p>
<p><a data-c15-link="external" href="https://frame-external.example/path#part">FRAME_EXTERNAL_LINK</a></p>
<p><img data-wrap alt="FRAME_IMAGE" src="/blue.svg"></p>
<div class="spacer">FRAME_SPACER</div>
<h2 id="frame-dest" data-c15-destination="1">FRAME_DESTINATION_TOKEN</h2>
"""


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        route = self.path.split("?", 1)[0]
        if route == "/top-direct":
            body, content_type = page_html(prepared=False, label="TOP_DIRECT"), "text/html; charset=utf-8"
        elif route == "/top-prepared":
            body, content_type = page_html(prepared=True, label="TOP_PREPARED"), "text/html; charset=utf-8"
        elif route == "/frame-source":
            body, content_type = frame_source_html(), "text/html; charset=utf-8"
        elif route == "/flattened":
            body, content_type = flattened_html(causal=False), "text/html; charset=utf-8"
        elif route == "/causal":
            body, content_type = flattened_html(causal=True), "text/html; charset=utf-8"
        elif route in {"/red.svg", "/blue.svg"}:
            color = "red" if route == "/red.svg" else "blue"
            body = f"<svg xmlns='http://www.w3.org/2000/svg' width='180' height='60'><rect width='180' height='60' fill='{color}'/></svg>"
            content_type = "image/svg+xml"
        else:
            self.send_error(404)
            return
        encoded = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, _format: str, *_args: object) -> None:
        return


def render_pdf(chrome: str, url: str, output: Path) -> dict[str, object]:
    profile = output.parent / f"profile-{output.stem}"
    command = [
        chrome,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        f"--user-data-dir={profile}",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=4000",
        f"--print-to-pdf={output}",
        url,
    ]
    completed = subprocess.run(command, check=False, capture_output=True, text=True, timeout=90)
    if completed.returncode != 0 or not output.is_file():
        raise RuntimeError(
            f"Chrome PDF failed for {url}: exit={completed.returncode} "
            f"stdout={completed.stdout[-2000:]} stderr={completed.stderr[-4000:]}"
        )
    data = output.read_bytes()
    document = fitz.open(stream=data, filetype="pdf")
    text = "\n".join(page.get_text("text") for page in document)
    links: list[dict[str, object]] = []
    for page_number, page in enumerate(document):
        for link in page.get_links():
            links.append({
                "source_page": page_number,
                "kind": int(link.get("kind", 0)),
                "target_page": link.get("page"),
                "uri": link.get("uri"),
                "name": link.get("name"),
                "from": [round(value, 2) for value in tuple(link.get("from", ()))],
            })
    return {
        "bytes": len(data),
        "sha256": sha256(data),
        "pages": document.page_count,
        "text": text,
        "links": links,
        "goto_count": sum(1 for link in links if link["kind"] == fitz.LINK_GOTO),
        "internal_destination_count": sum(
            1
            for link in links
            if isinstance(link.get("target_page"), int)
            and link["target_page"] >= 0
            and not link.get("uri")
        ),
        "uris": [link["uri"] for link in links if link.get("uri")],
    }


def run(repo_root: Path) -> dict[str, object]:
    chrome = chrome_path()
    version = subprocess.run([chrome, "--version"], check=True, capture_output=True, text=True).stdout.strip()
    result: dict[str, object] = {
        "source_contract": validate_current_source(repo_root),
        "chrome": version,
    }
    with tempfile.TemporaryDirectory(prefix="webclip-c15-") as temp:
        temp_path = Path(temp)
        server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f"http://127.0.0.1:{server.server_port}"
            for name, route in (
                ("top_direct", "/top-direct"),
                ("top_prepared", "/top-prepared"),
                ("frame_direct", "/frame-source"),
                ("frame_flattened", "/flattened"),
                ("frame_causal_namespaced", "/causal"),
            ):
                result[name] = render_pdf(chrome, base + route, temp_path / f"{name}.pdf")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

    return result


def validate_result(result: dict[str, object]) -> None:
    assert result["top_direct"]["internal_destination_count"] >= 1
    assert result["top_prepared"]["internal_destination_count"] >= 1
    assert result["frame_direct"]["internal_destination_count"] >= 1
    assert "FRAME_DESTINATION_TOKEN" in result["frame_flattened"]["text"]
    assert "PROXY_DEST_ID=[EMPTY]" in result["frame_flattened"]["text"]
    assert result["frame_flattened"]["internal_destination_count"] == 0
    assert result["frame_causal_namespaced"]["internal_destination_count"] >= 1
    assert any("external.example/path" in uri for uri in result["top_prepared"]["uris"])
    assert any("frame-external.example/path" in uri for uri in result["frame_flattened"]["uris"])
    assert any("/red.svg" in uri for uri in result["top_prepared"]["uris"])
    assert any("/blue.svg" in uri for uri in result["frame_flattened"]["uris"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    data = run(args.repo_root.resolve())
    encoded = json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
    print(encoded.decode("utf-8"))
    print("RESULT_SHA256", sha256(encoded))
    validate_result(data)
