#!/usr/bin/env python3
"""Cycle-2 T5 / PD1 physical probe for Chrome scroll-triggered animations.

Loads the real content.js with a minimal Chrome messaging shim, performs actual
WebClip Include/Exclude preparation, and compares admitted scroll-trigger state
with the physical PDF produced under the same screen-media + printToPDF model
used by service-worker.js.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
from typing import Any

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")

CHROME_MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__t5 = { listeners, lastPdfRequest: null };
  globalThis.chrome = {
    runtime: {
      onMessage: { addListener(fn) { listeners.push(fn); } },
      sendMessage(message) {
        if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
        if (message?.type === 'WEBCLIP_GENERATE_PDF') {
          globalThis.__t5.lastPdfRequest = message;
          return new Promise(resolve => { resolvePdf = resolve; });
        }
        return Promise.resolve({ ok: true });
      }
    }
  };
  globalThis.__t5Command = message => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = value => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__t5ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 't5.pdf' });
    return true;
  };
})();
"""

BASE_STYLE = r"""
<style>
html, body { margin:0; padding:0; background:white; color:#111; font-family:Arial,sans-serif; }
#excluded { width:240px; height:70px; background:rgb(0,0,220); color:white; padding:10px; box-sizing:border-box; }
.hover-zone { width:180px; height:40px; margin-top:20px; }
.hover-only { display:none; }
.hover-zone:hover .hover-only { display:block; }
.trigger-subject { width:560px; height:300px; trigger-scope: --audit-trigger; timeline-trigger: --audit-trigger view() contain / cover; }
.trigger-visual {
  width:160px; height:120px; box-sizing:border-box; padding:18px; color:white;
  background:rgb(220,0,0); transform:translateX(0px);
  animation:audit-reveal 220ms linear both;
  animation-trigger:--audit-trigger play-forwards reset;
}
@keyframes audit-reveal {
  from { background:rgb(220,0,0); transform:translateX(0px); }
  to { background:rgb(0,150,0); transform:translateX(260px); }
}
</style>
"""


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", required=True)
    p.add_argument("--out", type=pathlib.Path, required=True)
    return p.parse_args()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_text(pdf: bytes) -> str:
    doc = fitz.open(stream=pdf, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def render_first_page(pdf: bytes, path: pathlib.Path) -> None:
    doc = fitz.open(stream=pdf, filetype="pdf")
    doc[0].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False).save(str(path))


def color_counts(path: pathlib.Path) -> dict[str, int]:
    red = green = blue = 0
    for r, g, b in Image.open(path).convert("RGB").getdata():
        if r > 180 and g < 90 and b < 90:
            red += 1
        if g > 110 and r < 100 and b < 100:
            green += 1
        if b > 180 and r < 90 and g < 90:
            blue += 1
    return {"red": red, "green": green, "blue": blue}


def load_content(page, html: str) -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until="load")
    page.emulate_media(media="screen")
    page.evaluate(CHROME_MOCK)
    page.add_script_tag(content=CONTENT)


def command(page, payload: dict[str, Any]) -> dict[str, Any]:
    return page.evaluate("payload => __t5Command(payload)", payload)


def start(page) -> None:
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "start"})
    assert result.get("ok") is True, result


def click_selector(page, selector: str) -> None:
    result = page.evaluate(
        "s => document.querySelector(s).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,view:window}))",
        selector,
    )
    assert result is False, (selector, result)


def select_include_exclude(page, include_selector: str, exclude_selector: str | None = None) -> None:
    start(page)
    click_selector(page, include_selector)
    if exclude_selector:
        result = command(page, {"type": "WEBCLIP_COMMAND", "command": "mode-exclude"})
        assert result.get("ok") is True, result
        click_selector(page, exclude_selector)


def modal_click(page, label: str = "Сформировать PDF") -> None:
    ok = page.evaluate(
        """label => {
          const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()===label);
          if(!b) return false; b.click(); return true;
        }""",
        label,
    )
    assert ok, label


def wait_prepared(page) -> dict[str, Any]:
    page.wait_for_function("() => !!globalThis.__t5.lastPdfRequest", timeout=20000)
    page.wait_for_timeout(120)
    return page.evaluate("() => globalThis.__t5.lastPdfRequest")


def resolve_pdf(page) -> None:
    assert page.evaluate("() => __t5ResolvePdf()") is True
    page.wait_for_timeout(40)


def trigger_state(page, visual="#animated", subject="#subject") -> dict[str, Any]:
    return page.evaluate(
        """([visual,subject]) => {
          const el=document.querySelector(visual), sub=document.querySelector(subject);
          const a=el?.getAnimations?.()[0] || null;
          const r=el?.getBoundingClientRect?.();
          const sr=sub?.getBoundingClientRect?.();
          const cs=el ? getComputedStyle(el) : null;
          const ss=sub ? getComputedStyle(sub) : null;
          return {
            scrollY: window.scrollY,
            visualRect: r ? {x:r.x,y:r.y,width:r.width,height:r.height} : null,
            subjectRect: sr ? {x:sr.x,y:sr.y,width:sr.width,height:sr.height} : null,
            background: cs?.backgroundColor || '',
            transform: cs?.transform || '',
            playState: a?.playState || '',
            currentTime: a?.currentTime == null ? null : Number(a.currentTime),
            timelineTrigger: ss?.getPropertyValue('timeline-trigger') || '',
            animationTrigger: cs?.getPropertyValue('animation-trigger') || ''
          };
        }""",
        [visual, subject],
    )


def physical_save(page, out: pathlib.Path, name: str, state_selectors=("#animated", "#subject")) -> dict[str, Any]:
    result = command(page, {"type": "WEBCLIP_COMMAND", "command": "download"})
    assert result.get("ok") is True, result
    modal_click(page)
    request = wait_prepared(page)
    prepared = trigger_state(page, *state_selectors) if state_selectors[0] else None
    pdf = page.pdf(format="A4", print_background=True, prefer_css_page_size=True)
    pdf_path = out / f"{name}.pdf"
    pdf_path.write_bytes(pdf)
    png_path = out / f"{name}-page1.png"
    render_first_page(pdf, png_path)
    text = pdf_text(pdf)
    post = trigger_state(page, *state_selectors) if state_selectors[0] else None
    resolve_pdf(page)
    return {
        "prepared": prepared,
        "postPrint": post,
        "text": text,
        "bytes": len(pdf),
        "sha256": sha256(pdf),
        "rasterSha256": sha256(png_path.read_bytes()),
        "colors": color_counts(png_path),
        "pageAnalysis": request.get("meta", {}).get("pageAnalysis"),
    }


def support_state(page) -> dict[str, Any]:
    return page.evaluate(
        """() => ({
          timelineTrigger: CSS.supports('timeline-trigger: --audit-trigger view() contain / cover'),
          animationTrigger: CSS.supports('animation-trigger: --audit-trigger play-forwards reset'),
          animationTriggerBasic: CSS.supports('animation-trigger: --audit-trigger play-forwards play-backwards')
        })"""
    )


def make_top_fixture() -> str:
    return """
      <div id='pre' style='height:1000px;background:#eee'>UNSELECTED_PRE_GEOMETRY</div>
      <main id='capture' style='height:1800px;padding:0 20px;box-sizing:border-box'>
        <section id='subject' class='trigger-subject'>
          <div id='animated' class='trigger-visual'>TRIGGER_TARGET</div>
        </section>
        <div id='excluded'>EXCLUDED_CONTROL</div>
        <div class='hover-zone'>hover-zone<span class='hover-only'>HOVER_ONLY_MUST_BE_ABSENT</span></div>
        <div style='height:1300px'>CAPTURE_TAIL</div>
      </main>
    """


def make_nested_fixture(dynamic: bool = False) -> str:
    script = """
      <script>
      window.__generated=0;
      const sc=document.getElementById('scroller');
      sc.addEventListener('scroll',()=>{
        if(sc.scrollTop>0 && !document.getElementById('generated-sentinel')){
          window.__generated++;
          const x=document.createElement('div');x.id='generated-sentinel';x.textContent='AUTO_SCROLL_GENERATED_CONTENT';
          sc.append(x);
        }
      });
      </script>
    """ if dynamic else ""
    return f"""
      <main id='nested-wrap' style='padding:20px'>
        <div id='scroller' style='height:500px;width:700px;overflow:auto;border:2px solid #111'>
          <div style='height:620px'>NESTED_FILLER</div>
          <section id='nested-subject' class='trigger-subject'>
            <div id='nested-animated' class='trigger-visual'>NESTED_TRIGGER_TARGET</div>
          </section>
          <div id='nested-excluded'>NESTED_EXCLUDED_CONTROL</div>
          <div style='height:700px'>NESTED_TAIL</div>
        </div>
      </main>{script}
    """


def run(args: argparse.Namespace) -> dict[str, Any]:
    args.out.mkdir(parents=True, exist_ok=True)
    results: dict[str, Any] = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=args.chrome,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )
        results["browserVersion"] = browser.version
        ctx = browser.new_context(viewport={"width": 1100, "height": 800})

        # Feature support gate.
        page = ctx.new_page()
        load_content(page, make_top_fixture())
        support = support_state(page)
        assert support["timelineTrigger"] and support["animationTrigger"], support
        results["featureSupport"] = support
        page.close()

        # A: whole-body positive control. Geometry ahead of the trigger remains in
        # the admitted representation, so the trigger should stay active/final.
        page = ctx.new_page()
        load_content(page, make_top_fixture())
        page.evaluate("() => scrollTo(0,950)")
        page.wait_for_timeout(500)
        admitted = trigger_state(page)
        assert admitted["background"] == "rgb(0, 150, 0)", admitted
        target_png = args.out / "stable_body_admission.png"
        page.locator("#animated").screenshot(path=str(target_png))
        select_include_exclude(page, "body", "#excluded")
        artifact = physical_save(page, args.out, "stable_body_positive")
        assert artifact["prepared"]["background"] == "rgb(0, 150, 0)", artifact["prepared"]
        assert "TRIGGER_TARGET" in artifact["text"], artifact["text"]
        assert "EXCLUDED_CONTROL" not in artifact["text"], artifact["text"]
        assert "HOVER_ONLY_MUST_BE_ABSENT" not in artifact["text"], artifact["text"]
        assert artifact["colors"]["green"] > 1000, artifact["colors"]
        results["stableBodyPositive"] = {
            "admitted": admitted,
            "admissionSha256": sha256(target_png.read_bytes()),
            **{k: artifact[k] for k in ["prepared", "postPrint", "colors", "sha256", "rasterSha256"]},
        }
        page.close()

        # B: same admitted state, but selected-only preparation hides an unselected
        # 1000px predecessor. The trigger subject moves out of the view-timeline
        # active range while scrollY remains/clamps deep in the retained capture.
        page = ctx.new_page()
        load_content(page, make_top_fixture())
        page.evaluate("() => scrollTo(0,950)")
        page.wait_for_timeout(500)
        admitted = trigger_state(page)
        assert admitted["background"] == "rgb(0, 150, 0)", admitted
        target_png = args.out / "selection_shift_admission.png"
        page.locator("#animated").screenshot(path=str(target_png))
        select_include_exclude(page, "#capture", "#excluded")
        artifact = physical_save(page, args.out, "selection_geometry_trigger_reset")
        assert artifact["prepared"]["background"] == "rgb(220, 0, 0)", artifact["prepared"]
        assert "TRIGGER_TARGET" in artifact["text"], artifact["text"]
        assert "UNSELECTED_PRE_GEOMETRY" not in artifact["text"], artifact["text"]
        assert "EXCLUDED_CONTROL" not in artifact["text"], artifact["text"]
        assert "HOVER_ONLY_MUST_BE_ABSENT" not in artifact["text"], artifact["text"]
        assert artifact["colors"]["red"] > artifact["colors"]["green"] * 5 + 1000, artifact["colors"]
        results["selectionGeometryFinding"] = {
            "admitted": admitted,
            "admissionSha256": sha256(target_png.read_bytes()),
            **{k: artifact[k] for k in ["prepared", "postPrint", "colors", "sha256", "rasterSha256"]},
        }
        page.close()

        # C: nested scroll positive breadth control for C20. The user scrolls the
        # actual nested context into the active range; WebClip must not reset it.
        page = ctx.new_page()
        load_content(page, make_nested_fixture(False))
        page.evaluate("() => { document.querySelector('#scroller').scrollTop=560; }")
        page.wait_for_timeout(500)
        admitted = trigger_state(page, "#nested-animated", "#nested-subject")
        assert admitted["background"] == "rgb(0, 150, 0)", admitted
        select_include_exclude(page, "#scroller", "#nested-excluded")
        artifact = physical_save(page, args.out, "nested_scroll_positive", ("#nested-animated", "#nested-subject"))
        assert artifact["prepared"]["background"] == "rgb(0, 150, 0)", artifact["prepared"]
        assert "NESTED_TRIGGER_TARGET" in artifact["text"], artifact["text"]
        assert "NESTED_EXCLUDED_CONTROL" not in artifact["text"], artifact["text"]
        results["nestedScrollPositive"] = {
            "admitted": admitted,
            **{k: artifact[k] for k in ["prepared", "postPrint", "colors", "sha256", "rasterSha256"]},
        }
        page.close()

        # D: C22 negative authority boundary. Merely saving a selected scrollport
        # must not auto-scroll it and must not create an extra logical batch.
        page = ctx.new_page()
        load_content(page, make_nested_fixture(True))
        before = page.evaluate("() => ({scrollTop:document.querySelector('#scroller').scrollTop,generated:window.__generated})")
        assert before == {"scrollTop": 0, "generated": 0}, before
        select_include_exclude(page, "#scroller", None)
        artifact = physical_save(page, args.out, "no_user_scroll_boundary", (None, None))
        after = page.evaluate("() => ({scrollTop:document.querySelector('#scroller').scrollTop,generated:window.__generated,hasSentinel:!!document.querySelector('#generated-sentinel')})")
        assert after["scrollTop"] == 0 and after["generated"] == 0 and not after["hasSentinel"], after
        assert "AUTO_SCROLL_GENERATED_CONTENT" not in artifact["text"], artifact["text"]
        results["noUserScrollBoundary"] = {
            "before": before,
            "after": after,
            **{k: artifact[k] for k in ["colors", "sha256", "rasterSha256"]},
        }
        page.close()
        browser.close()
    return results


def main() -> int:
    args = parse_args()
    results = run(args)
    path = args.out / "results.json"
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
