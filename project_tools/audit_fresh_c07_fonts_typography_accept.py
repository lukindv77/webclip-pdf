#!/usr/bin/env python3
"""Acceptance wrapper for focused C07 typography probe.

Rejected development runs established two harness-only extraction assumptions:
1) an 8px letter-spaced PDF row is split into one-character words;
2) the flattened-frame marker is intentionally propagated to inert descendants,
   so measurements must target the root section explicitly.
All product-facing acceptance remains fail-closed.
"""
import audit_fresh_c07_fonts_typography as base


def run_top_typography(ctx, out):
    html = r"""
    <article id='scope'>
      <div id='small' style='font-size:12px'>C07_SMALL_MARKER</div>
      <div id='big' style='font-size:30px'>C07_BIG_MARKER</div>
      <div id='regular' style='font-size:24px;font-weight:400;font-style:normal'>C07_REGULAR_MARKER</div>
      <div id='bold' style='font-size:24px;font-weight:700'>C07_BOLD_MARKER</div>
      <div id='italic' style='font-size:24px;font-style:italic'>C07_ITALIC_MARKER</div>
      <div id='ls0' style='font-size:22px;letter-spacing:0'>C07LETTERTEST</div>
      <div id='ls8' style='font-size:22px;letter-spacing:8px'>C07LETTERTEST</div>
      <div id='lh18' style='font-size:16px;line-height:18px'>C07LINE_A<br>C07LINE_B</div>
      <div id='lh48' style='font-size:16px;line-height:48px'>C07LINE_C<br>C07LINE_D</div>
      <div id='decor' style='font-size:30px;text-decoration-line:underline;text-decoration-color:#ee2222;text-decoration-thickness:5px'>C07_DECORATION</div>
      <div id='paint' style='font-size:42px;font-weight:700;color:#111;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee'>C07_PAINT</div>
      <div id='serif' style='display:inline-block;font:24px serif'>C07WIDTHMMMMMMMM</div><br>
      <div id='mono' style='display:inline-block;font:24px monospace'>C07WIDTHMMMMMMMM</div>
      <div id='unicode' style='font-size:22px'>Кириллица C07_CYRILLIC · Ελληνικά C07_GREEK · العربية</div>
      <div id='balance' style='width:320px;text-wrap:balance'>C07_BALANCE one two three four five six seven eight nine ten</div>
    </article>
    """
    page = ctx.new_page()
    base.load_runtime(page, html)
    supports = page.evaluate("()=>({balance:CSS.supports('text-wrap','balance'),textBoxTrim:CSS.supports('text-box-trim','trim-both')})")
    base.select_top(page)
    request = base.begin_prepare(page)
    path = out / 'top_typography.pdf'
    art = base.print_pdf(page, path, {"red": ((238, 34, 34), 45), "blue": ((34, 68, 238), 45)})
    spans = art['spans']
    words = art['words']

    small = base.find_spans(spans, 'C07_SMALL_MARKER')
    big = base.find_spans(spans, 'C07_BIG_MARKER')
    regular = base.find_spans(spans, 'C07_REGULAR_MARKER')
    bold = base.find_spans(spans, 'C07_BOLD_MARKER')
    italic = base.find_spans(spans, 'C07_ITALIC_MARKER')
    assert small and big and max(s['size'] for s in big) > min(s['size'] for s in small) * 2, (small, big)
    assert regular and bold and italic, (regular, bold, italic)
    assert any(s['flags'] & 16 for s in bold), bold
    assert any(s['flags'] & 2 for s in italic), italic

    normal = base.find_word(words, 'C07LETTERTEST')
    line_a = base.find_word(words, 'C07LINE_A')
    line_b = base.find_word(words, 'C07LINE_B')
    line_c = base.find_word(words, 'C07LINE_C')
    line_d = base.find_word(words, 'C07LINE_D')
    assert normal and line_a and line_b and line_c and line_d, (normal, line_a, line_b, line_c, line_d)
    spaced_words = [
        w for w in words
        if w['page'] == normal['page']
        and w['y0'] > normal['y0'] + 8
        and w['y0'] < line_a['y0'] - 4
    ]
    assert len(spaced_words) >= 10, spaced_words
    normal_width = normal['x1'] - normal['x0']
    spaced_width = max(w['x1'] for w in spaced_words) - min(w['x0'] for w in spaced_words)
    assert spaced_width > normal_width + 35, (normal_width, spaced_width, spaced_words)

    gap_small = abs(line_b['y0'] - line_a['y0'])
    gap_large = abs(line_d['y0'] - line_c['y0'])
    assert gap_large > gap_small + 15, (gap_small, gap_large)
    assert art['colors']['red'] > 250 and art['colors']['blue'] > 250, art['colors']

    family = base.find_spans(spans, 'C07WIDTHMMMMMMMM')
    assert len(family) >= 2, family
    family_widths = [s['bbox'][2] - s['bbox'][0] for s in family]
    assert max(family_widths) - min(family_widths) > 5, family_widths

    text = ' '.join(s['text'] for s in spans)
    assert 'Кириллица' in text and 'C07_CYRILLIC' in text and 'C07_GREEK' in text, text[-1200:]

    result = {
        'supports': supports,
        'artifact': {k: v for k, v in art.items() if k not in ('spans', 'words')},
        'fontSpans': {
            'small': small, 'big': big, 'regular': regular, 'bold': bold, 'italic': italic,
            'letterSpacing': {'normalWidth': normal_width, 'spacedWidth': spaced_width, 'spacedWordCount': len(spaced_words)},
            'familyWidths': family_widths,
        },
        'lineGaps': {'small': gap_small, 'large': gap_large},
        'resourceReport': request.get('meta', {}).get('resourceReport', {}),
    }
    base.resolve_prepare(page)
    page.close()
    return result


def run_flattened_typography(ctx, out):
    child = r"""<!doctype html><meta charset='utf-8'><style>
      html,body{margin:0;padding:0;background:white}body{padding:20px;font-family:Arial,sans-serif}
      .basic{display:inline-block;font-family:Arial,sans-serif;font-size:30px;font-weight:700;font-style:italic;line-height:42px;letter-spacing:3px;color:#111}
      .advanced{display:inline-block;margin-top:24px;font-family:Arial,sans-serif;font-size:42px;line-height:52px;color:#111;word-spacing:30px;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee;font-kerning:none;font-feature-settings:'liga' 0;font-variant-ligatures:none;direction:rtl;unicode-bidi:bidi-override}
    </style><div class='basic'>C07_FRAME_BASIC</div><br><div class='advanced'>C07FRAME_A C07FRAME_B</div>"""
    page = ctx.new_page()
    base.load_runtime(page, "<div>TOP_UNSELECTED</div><iframe id='child' style='width:800px;height:360px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}', child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.readyState==='complete'")

    source_styles = page.frame_locator('#child').locator('.advanced').evaluate("""el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return {textShadow:s.textShadow,stroke:s.webkitTextStrokeWidth,wordSpacing:s.wordSpacing,fontKerning:s.fontKerning,fontFeatureSettings:s.fontFeatureSettings,fontVariantLigatures:s.fontVariantLigatures,direction:s.direction,unicodeBidi:s.unicodeBidi,width:r.width}}""")
    source_basic = page.frame_locator('#child').locator('.basic').evaluate("""el=>{const s=getComputedStyle(el);return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing}}""")
    targets = {"red": ((238,34,34),45), "blue": ((34,68,238),45)}
    source_png = out / 'frame_typography_source.png'
    page.frame_locator('#child').locator('.advanced').screenshot(path=str(source_png))
    source_colors = base.png_color_counts(source_png, targets)
    assert source_colors['red'] > 100 and source_colors['blue'] > 100, (source_styles, source_colors)

    base.select_frame_body(page)
    request = base.begin_prepare(page)
    hidden = base.command(page, {"type":"WEBCLIP_PRINT_RENDER_STATE", "hidden":True})
    assert hidden.get('ok') is True, hidden

    proxy = page.locator('section[data-webclip-pdf-flattened-frame]').first
    proxy.wait_for(state='attached', timeout=5000)
    advanced = proxy.locator('.advanced')
    basic = proxy.locator('.basic')
    proxy_styles = advanced.evaluate("""el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return {textShadow:s.textShadow,stroke:s.webkitTextStrokeWidth,wordSpacing:s.wordSpacing,fontKerning:s.fontKerning,fontFeatureSettings:s.fontFeatureSettings,fontVariantLigatures:s.fontVariantLigatures,direction:s.direction,unicodeBidi:s.unicodeBidi,width:r.width}}""")
    proxy_basic = basic.evaluate("""el=>{const s=getComputedStyle(el);return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing}}""")
    proxy_png = out / 'frame_typography_proxy.png'
    advanced.screenshot(path=str(proxy_png))
    proxy_colors = base.png_color_counts(proxy_png, targets)

    assert source_basic == proxy_basic, (source_basic, proxy_basic)
    assert proxy_styles['textShadow'] == 'none', proxy_styles
    assert proxy_styles['stroke'] in ('0px','0'), proxy_styles
    assert proxy_styles['wordSpacing'] in ('0px','normal'), proxy_styles
    assert proxy_styles['fontKerning'] in ('auto','normal'), proxy_styles
    assert proxy_styles['fontFeatureSettings'] == 'normal', proxy_styles
    assert proxy_styles['direction'] == 'ltr', proxy_styles
    assert source_styles['width'] > proxy_styles['width'] + 15, (source_styles, proxy_styles)
    assert proxy_colors['red'] < 50 and proxy_colors['blue'] < 50, (source_colors, proxy_colors)

    path = out / 'frame_typography.pdf'
    art = base.print_pdf(page, path, targets)
    text = ' '.join(s['text'] for s in art['spans'])
    assert 'C07_FRAME_BASIC' in text, text
    assert art['colors']['red'] < 150 and art['colors']['blue'] < 150, art['colors']
    basic_spans = base.find_spans(art['spans'], 'C07_FRAME_BASIC')
    assert basic_spans, basic_spans
    assert any(s['flags'] & 16 for s in basic_spans) and any(s['flags'] & 2 for s in basic_spans), basic_spans

    result = {
        'sourceStyles': source_styles, 'proxyStyles': proxy_styles,
        'sourceBasic': source_basic, 'proxyBasic': proxy_basic,
        'sourceColors': source_colors, 'proxyColors': proxy_colors,
        'resourceReport': request.get('meta', {}).get('resourceReport', {}),
        'artifact': {k:v for k,v in art.items() if k not in ('spans','words')},
        'basicSpans': basic_spans,
    }
    base.resolve_prepare(page)
    page.close()
    return result


def run_frame_font_face(ctx, out, port):
    child = f"""<!doctype html><meta charset='utf-8'><style>@font-face{{font-family:'C07FrameFont';src:url('http://127.0.0.1:{port}/font.ttf') format('truetype')}}html,body{{margin:0;padding:0;background:white}}body{{padding:20px}}.special{{display:inline-block;font-family:'C07FrameFont',sans-serif;font-size:32px;line-height:40px}}</style><div class='special'>C07_FRAME_FONT_WWWWWWW</div>"""
    page = ctx.new_page()
    base.load_runtime(page, "<iframe id='child' style='width:850px;height:220px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}', child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.readyState==='complete'")
    page.wait_for_function("()=>document.querySelector('#child').contentDocument.fonts.status==='loaded'", timeout=10000)
    source = page.frame_locator('#child').locator('.special').evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {family:s.fontFamily,width:r.width,fontReady:el.ownerDocument.fonts.check(`32px ${s.fontFamily}`,el.textContent)}}""")
    assert source['fontReady'] is True, source

    base.select_frame_body(page)
    request = base.begin_prepare(page)
    hidden = base.command(page, {"type":"WEBCLIP_PRINT_RENDER_STATE", "hidden":True})
    assert hidden.get('ok') is True, hidden
    root = page.locator('section[data-webclip-pdf-flattened-frame]').first
    root.wait_for(state='attached', timeout=5000)
    special = root.locator('.special')
    proxy = special.evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {family:s.fontFamily,width:r.width}}""")

    path = out / 'frame_font_face.pdf'
    art = base.print_pdf(page, path)
    spans = base.find_spans(art['spans'], 'C07_FRAME_FONT_WWWWWWW')
    assert spans, art['spans']
    assert abs(source['width'] - proxy['width']) > 12, (source, proxy, spans)
    assert not any('DejaVuSansMono' in s['font'].replace('-','') for s in spans), spans

    result = {
        'source': source, 'proxy': proxy,
        'resourceReport': request.get('meta', {}).get('resourceReport', {}),
        'artifact': {k:v for k,v in art.items() if k not in ('spans','words')},
        'spans': spans,
    }
    base.resolve_prepare(page)
    page.close()
    return result


base.run_top_typography = run_top_typography
base.run_flattened_typography = run_flattened_typography
base.run_frame_font_face = run_frame_font_face
raise SystemExit(base.main())
