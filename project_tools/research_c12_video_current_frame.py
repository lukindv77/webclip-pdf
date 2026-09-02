#!/usr/bin/env python3
"""Fresh-restart C12 managed-Chromium / physical-PDF current-video-frame probe.

Research-only harness. It validates the current WebClip same-origin video clone
contract from content.js, generates a tiny deterministic two-phase WebM locally,
and proves current-frame behavior through physical PDF raster inspection.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import fitz
from playwright.async_api import async_playwright

CHROMIUM = shutil.which("chromium") or "/usr/bin/chromium"
FFMPEG = shutil.which("ffmpeg") or "/usr/bin/ffmpeg"
RED_MIN = 180
OTHER_MAX = 100


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_current_source(repo_root: Path) -> dict[str, object]:
    content_path = repo_root / "content.js"
    if not content_path.exists():
        return {"checked": False, "reason": "content.js-not-found"}
    source = content_path.read_text(encoding="utf-8")
    start = source.find("function copyFrameCloneUrlState(source, target) {")
    end = source.find("function copyComputedFrameCloneStyle", start)
    assert start >= 0 and end > start, "current copyFrameCloneUrlState not found"
    segment = source[start:end]
    assert "tag === 'video'" in segment
    assert "source.poster" in segment
    assert "currentTime" not in segment, "current source unexpectedly materializes video currentTime"
    return {
        "checked": True,
        "content_sha256": sha256(content_path.read_bytes()),
        "copy_segment_sha256": sha256(segment.encode("utf-8")),
        "current_time_materialized": False,
    }


def make_video(path: Path) -> bytes:
    subprocess.run(
        [
            FFMPEG,
            "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "color=c=red:s=320x180:r=25:d=1",
            "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=25:d=1",
            "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]",
            "-map", "[v]", "-c:v", "libvpx-vp9", "-crf", "20", "-b:v", "0",
            str(path),
        ],
        check=True,
    )
    return path.read_bytes()


def raster_stats(pdf_bytes: bytes) -> dict[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    red = blue = black = 0
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        samples = pix.samples
        for i in range(0, len(samples), pix.n):
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            if r >= RED_MIN and g <= OTHER_MAX and b <= OTHER_MAX:
                red += 1
            if b >= RED_MIN and r <= OTHER_MAX and g <= OTHER_MAX:
                blue += 1
            if r <= 45 and g <= 45 and b <= 45:
                black += 1
    return {"red": red, "blue": blue, "black": black}


async def save_pdf(page, name: str, out_dir: Path) -> dict[str, object]:
    data = await page.pdf(print_background=True, prefer_css_page_size=True)
    (out_dir / f"{name}.pdf").write_bytes(data)
    return {"sha256": sha256(data), "bytes": len(data), **raster_stats(data)}


async def wait_video_ready(target, selector: str) -> None:
    await target.wait_for_function(
        "s => { const v=document.querySelector(s); return v && v.readyState>=2 && Number.isFinite(v.duration); }",
        arg=selector,
        timeout=8_000,
    )


async def seek_and_settle(target, selector: str, seconds: float) -> None:
    await wait_video_ready(target, selector)
    await target.eval_on_selector(selector, "(v,t) => { v.pause(); v.currentTime=t; }", seconds)
    await target.wait_for_function(
        "o => { const v=document.querySelector(o.s); return v && !v.seeking && Math.abs(v.currentTime-o.t)<0.1; }",
        arg={"s": selector, "t": seconds},
        timeout=8_000,
    )
    # `seeked` has settled the playback position. Give the compositor ordinary
    # rendering time without relying on a callback that is not guaranteed to
    # fire for every paused/headless configuration.
    await target.wait_for_timeout(300)


async def run(repo_root: Path) -> dict[str, object]:
    result: dict[str, object] = {"source_contract": validate_current_source(repo_root)}
    with tempfile.TemporaryDirectory(prefix="webclip-c12-") as tmp:
        out_dir = Path(tmp)
        video_bytes = make_video(out_dir / "red_blue.webm")
        video_uri = "data:video/webm;base64," + base64.b64encode(video_bytes).decode("ascii")
        result["fixture"] = {
            "video_sha256": sha256(video_bytes),
            "video_bytes": len(video_bytes),
            "semantic": "0-1s red; 1-2s blue; 320x180 VP9 WebM",
        }

        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path=CHROMIUM, headless=True)
            result["chromium"] = browser.version
            page = await browser.new_page(viewport={"width": 900, "height": 700})
            await page.emulate_media(media="screen")
            style = "<style>@page{size:A4;margin:12mm}body{margin:0}video{width:320px;height:180px;display:block;background:#fff}</style>"

            # Positive control: top-document paused current frame at 1.5 s.
            await page.set_content(style + f'<video id="v" muted playsinline preload="auto" src="{video_uri}"></video>')
            await seek_and_settle(page, "#v", 1.5)
            result["top_state"] = await page.eval_on_selector(
                "#v", "v => ({currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,duration:v.duration})"
            )
            result["top_current_frame"] = await save_pdf(page, "top_current_frame", out_dir)

            # Positive control: exact same current frame while video remains in
            # its same-origin child document.
            srcdoc = style + f'<video id="v" muted playsinline preload="auto" src="{video_uri}"></video>'
            await page.set_content(style + '<iframe id="f" style="width:340px;height:200px;border:0"></iframe>')
            await page.eval_on_selector("#f", "(f,h) => { f.srcdoc=h; }", srcdoc)
            await page.wait_for_timeout(300)
            frame = page.frames[-1]
            await seek_and_settle(frame, "#v", 1.5)
            result["frame_source_state"] = await frame.eval_on_selector(
                "#v", "v => ({currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,duration:v.duration})"
            )
            result["frame_direct"] = await save_pdf(page, "frame_direct", out_dir)

            # Production-shaped current clone: DOM clone + src/poster transfer,
            # but no currentTime/frame materialization.
            result["clone_initial"] = await page.evaluate(
                """() => {
                  const f=document.querySelector('#f');
                  const sourceBody=f.contentDocument.body;
                  const clone=sourceBody.cloneNode(true);
                  const source=sourceBody.querySelector('video');
                  const target=clone.querySelector('video');
                  if (source.src) target.setAttribute('src', source.src);
                  if (source.poster) target.setAttribute('poster', source.poster);
                  const proxy=document.createElement('section');
                  while (clone.firstChild) proxy.appendChild(clone.firstChild);
                  document.body.appendChild(proxy);
                  f.style.display='none';
                  return {
                    sourceCurrentTime: source.currentTime,
                    targetCurrentTime: target.currentTime,
                    targetReadyState: target.readyState,
                    targetSrcLength: target.src.length
                  };
                }"""
            )
            await wait_video_ready(page, "section video")
            await page.wait_for_timeout(300)
            result["clone_ready"] = await page.eval_on_selector(
                "section video",
                "v => ({currentTime:v.currentTime,paused:v.paused,readyState:v.readyState,duration:v.duration})",
            )
            result["flattened_clone"] = await save_pdf(page, "flattened_clone", out_dir)

            # Causal control: transfer the admitted playback time to the final
            # representation, wait for its decoded current frame, then print.
            await seek_and_settle(page, "section video", 1.5)
            result["causal_state"] = await page.eval_on_selector(
                "section video", "v => ({currentTime:v.currentTime,paused:v.paused,readyState:v.readyState})"
            )
            result["causal_current_time"] = await save_pdf(page, "causal_current_time", out_dir)
            await browser.close()

    # Stable acceptance discriminators, deliberately not exact raster counts.
    assert result["top_current_frame"]["blue"] > 50_000 and result["top_current_frame"]["red"] == 0
    assert result["frame_direct"]["blue"] > 50_000 and result["frame_direct"]["red"] == 0
    assert result["clone_ready"]["currentTime"] < 0.1
    assert result["flattened_clone"]["red"] > 50_000 and result["flattened_clone"]["blue"] == 0
    assert result["causal_current_time"]["blue"] > 50_000 and result["causal_current_time"]["red"] == 0
    return result


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    result = asyncio.run(run(repo_root))
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2).encode("utf-8")
    print(encoded.decode("utf-8"))
    print("RESULT_SHA256", sha256(encoded))
