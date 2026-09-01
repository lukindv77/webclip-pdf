#!/usr/bin/env python3
"""Acceptance wrapper for focused C07: correct distinct-marker letter-spacing measurement."""
import json
import audit_fresh_c07_fonts_typography as base


def run_top_typography(ctx,out):
    html=r"""
    <article id='scope'>
      <div id='small' style='font-size:12px'>C07_SMALL_MARKER</div>
      <div id='big' style='font-size:30px'>C07_BIG_MARKER</div>
      <div id='regular' style='font-size:24px;font-weight:400;font-style:normal'>C07_REGULAR_MARKER</div>
      <div id='bold' style='font-size:24px;font-weight:700'>C07_BOLD_MARKER</div>
      <div id='italic' style='font-size:24px;font-style:italic'>C07_ITALIC_MARKER</div>
      <div id='ls0' style='font-size:22px;letter-spacing:0'>C07LETTERZERO</div>
      <div id='ls8' style='font-size:22px;letter-spacing:8px'>C07LETTERWIDE</div>
      <div id='lh18' style='font-size:16px;line-height:18px'>C07LINE_A<br>C07LINE_B</div>
      <div id='lh48' style='font-size:16px;line-height:48px'>C07LINE_C<br>C07LINE_D</div>
      <div id='decor' style='font-size:30px;text-decoration-line:underline;text-decoration-color:#ee2222;text-decoration-thickness:5px'>C07_DECORATION</div>
      <div id='paint' style='font-size:42px;font-weight:700;color:#111;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee'>C07_PAINT</div>
      <div id='serif' style='display:inline-block;font:24px serif'>C07WIDTHMMMMMMMM</div><br>
      <div id='mono' style='display:inline-block;font:24px monospace'>C07WIDTHNNNNNNNN</div>
      <div id='unicode' style='font-size:22px'>Кириллица C07_CYRILLIC · Ελληνικά C07_GREEK · العربية</div>
      <div id='balance' style='width:320px;text-wrap:balance'>C07_BALANCE one two three four five six seven eight nine ten</div>
    </article>
    """
    page=ctx.new_page();base.load_runtime(page,html);supports=page.evaluate("()=>({balance:CSS.supports('text-wrap','balance'),textBoxTrim:CSS.supports('text-box-trim','trim-both')})")
    base.select_top(page);request=base.begin_prepare(page)
    path=out/'top_typography.pdf';art=base.print_pdf(page,path,{"red":((238,34,34),45),"blue":((34,68,238),45)})
    spans=art['spans'];words=art['words']
    small=base.find_spans(spans,'C07_SMALL_MARKER');big=base.find_spans(spans,'C07_BIG_MARKER');regular=base.find_spans(spans,'C07_REGULAR_MARKER');bold=base.find_spans(spans,'C07_BOLD_MARKER');italic=base.find_spans(spans,'C07_ITALIC_MARKER')
    zero=base.find_spans(spans,'C07LETTERZERO');wide=base.find_spans(spans,'C07LETTERWIDE')
    assert small and big and max(s['size'] for s in big)>min(s['size'] for s in small)*2,(small,big)
    assert regular and bold and italic,(regular,bold,italic)
    assert any(s['flags'] & 16 for s in bold),bold
    assert any(s['flags'] & 2 for s in italic),italic
    assert zero and wide,(zero,wide)
    zw=max(s['bbox'][2]-s['bbox'][0] for s in zero);ww=max(s['bbox'][2]-s['bbox'][0] for s in wide);assert ww>zw+35,(zw,ww)
    a=base.find_word(words,'C07LINE_A');b=base.find_word(words,'C07LINE_B');c=base.find_word(words,'C07LINE_C');d=base.find_word(words,'C07LINE_D');assert a and b and c and d,(a,b,c,d)
    gap_small=abs(b['y0']-a['y0']);gap_large=abs(d['y0']-c['y0']);assert gap_large>gap_small+15,(gap_small,gap_large)
    assert art['colors']['red']>250 and art['colors']['blue']>250,art['colors']
    text=' '.join(s['text'] for s in spans);assert 'Кириллица' in text and 'C07_CYRILLIC' in text and 'C07_GREEK' in text,text[-1200:]
    result={'supports':supports,'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},'fontSpans':{'small':small,'big':big,'regular':regular,'bold':bold,'italic':italic,'letterZeroWidth':zw,'letterWideWidth':ww},'lineGaps':{'small':gap_small,'large':gap_large},'resourceReport':request.get('meta',{}).get('resourceReport',{})}
    base.resolve_prepare(page);page.close();return result

base.run_top_typography=run_top_typography
raise SystemExit(base.main())
