'use strict';

const assert = require('assert');

class RemoteFrameRepresentationModel {
  constructor({
    media = 'screen',
    selectedHeight = 100,
    excludedHeight = 400,
    unrelatedHeight = 5000,
    sitePrintHidesSelected = false
  } = {}) {
    this.media = media;
    this.selectedHeight = selectedHeight;
    this.excludedHeight = excludedHeight;
    this.unrelatedHeight = unrelatedHeight;
    this.sitePrintHidesSelected = sitePrintHidesSelected;
    this.generation = 0;
    this.currentReceipt = null;
  }

  legacyCurrentShape() {
    // Current frame-agent:
    // - selected-only filter is @media print only;
    // - interactive outlines are @media screen only;
    // - height is measured before the selected-only filter is installed.
    const filterEffective = this.media === 'print';
    const selectionDecorationVisible = this.media === 'screen';
    const measuredHeightBeforeFilter =
      this.selectedHeight + this.excludedHeight + this.unrelatedHeight;
    const rendered = {
      selected: this.media === 'print' && this.sitePrintHidesSelected ? false : true,
      excluded: !filterEffective,
      unrelated: !filterEffective
    };
    return {
      filterEffective,
      selectionDecorationVisible,
      measuredHeight: measuredHeightBeforeFilter,
      rendered
    };
  }

  prepareTarget({ generation, media = this.media, filterOwned = true, decorationSuppressed = true }) {
    assert(Number.isInteger(generation) && generation > 0);
    this.generation = Math.max(this.generation, generation);

    // Target contract keeps site print media from becoming selection authority.
    // A WebClip-owned selected-only representation must be effective under the
    // exact media used by physical PDF rendering.
    const filterEffective = Boolean(filterOwned);
    const selectedVisible = !(media === 'print' && this.sitePrintHidesSelected && !filterOwned);
    const rendered = {
      selected: selectedVisible,
      excluded: !filterEffective,
      unrelated: !filterEffective
    };

    // Geometry is measured only after the exact selected-only representation is effective.
    const selectedOnlyHeight = rendered.selected ? this.selectedHeight : 0;
    const documentHeight = selectedOnlyHeight;

    const receipt = {
      generation,
      media,
      filterEffective,
      decorationSuppressed: Boolean(decorationSuppressed),
      documentHeight,
      renderedScope: Object.entries(rendered).filter(([, on]) => on).map(([name]) => name),
      geometryFromEffectiveRepresentation: filterEffective,
      resourceScope: filterEffective ? ['selected'] : ['selected', 'excluded', 'unrelated']
    };
    this.currentReceipt = receipt;
    return receipt;
  }

  topAccept(receipt, expectedGeneration) {
    if (!receipt || receipt.generation !== expectedGeneration) return { accepted: false, reason: 'generation' };
    if (!receipt.filterEffective) return { accepted: false, reason: 'filter-not-effective' };
    if (!receipt.decorationSuppressed) return { accepted: false, reason: 'decoration-visible' };
    if (!receipt.geometryFromEffectiveRepresentation) return { accepted: false, reason: 'geometry-mismatch' };
    if (!Number.isFinite(receipt.documentHeight) || receipt.documentHeight < 0) return { accepted: false, reason: 'height' };
    return { accepted: true, height: receipt.documentHeight };
  }
}

function legacyCurrentShapeCounterexample() {
  const m = new RemoteFrameRepresentationModel({ media: 'screen' });
  const result = m.legacyCurrentShape();
  assert.strictEqual(result.filterEffective, false);
  assert.strictEqual(result.selectionDecorationVisible, true);
  assert.strictEqual(result.rendered.excluded, true);
  assert.strictEqual(result.rendered.unrelated, true);
  assert.strictEqual(result.measuredHeight, 5500);
  return 'P1-229 current-shape counterexample: screen PDF disables remote selected-only filter, prints selection decoration, and freezes pre-filter full-document height';
}

function run() {
  console.log(legacyCurrentShapeCounterexample());

  // A. Screen media + print-only WebClip filter leaks excluded and unrelated content.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const legacy = m.legacyCurrentShape();
    assert.deepStrictEqual(legacy.rendered, { selected: true, excluded: true, unrelated: true });
  }

  // B. The same current screen media activates interactive selection decoration.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    assert.strictEqual(m.legacyCurrentShape().selectionDecorationVisible, true);
  }

  // C. Fixing only filtering but retaining a pre-filter height still produces a representation mismatch.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const oldHeight = m.legacyCurrentShape().measuredHeight;
    const target = m.prepareTarget({ generation: 1, filterOwned: true, decorationSuppressed: true });
    assert.strictEqual(target.renderedScope.join(','), 'selected');
    assert.strictEqual(oldHeight, 5500);
    assert.strictEqual(target.documentHeight, 100);
    assert(oldHeight > target.documentHeight);
  }

  // D. Target screen-media contract: selected-only filter effective, decoration suppressed,
  // geometry and resource scope describe exactly the same selected representation.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const r = m.prepareTarget({ generation: 3 });
    assert.strictEqual(r.media, 'screen');
    assert.strictEqual(r.filterEffective, true);
    assert.strictEqual(r.decorationSuppressed, true);
    assert.deepStrictEqual(r.renderedScope, ['selected']);
    assert.deepStrictEqual(r.resourceScope, ['selected']);
    assert.strictEqual(r.documentHeight, 100);
    assert.strictEqual(m.topAccept(r, 3).accepted, true);
  }

  // E. Simply reverting to native print media is not a sufficient repair:
  // site-owned @media print can hide the user's selected child content.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'print', sitePrintHidesSelected: true });
    const naiveNativePrint = m.prepareTarget({
      generation: 1,
      media: 'print',
      filterOwned: false,
      decorationSuppressed: true
    });
    assert.strictEqual(naiveNativePrint.renderedScope.includes('selected'), false);
    assert.strictEqual(m.topAccept(naiveNativePrint, 1).accepted, false);
  }

  // F. Top/same-origin style direction is a positive conceptual control:
  // WebClip-owned filtering that is not dependent on @media print remains effective under screen media.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const r = m.prepareTarget({ generation: 1, filterOwned: true });
    assert.deepStrictEqual(r.renderedScope, ['selected']);
  }

  // G. Geometry receipt must be recomputed from the current effective selected representation.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen', selectedHeight: 100 });
    const r1 = m.prepareTarget({ generation: 1 });
    m.selectedHeight = 180; // selected representation changed before a newer prepare.
    const r2 = m.prepareTarget({ generation: 2 });
    assert.strictEqual(r1.documentHeight, 100);
    assert.strictEqual(r2.documentHeight, 180);
    assert.strictEqual(m.topAccept(r1, 2).accepted, false);
    assert.strictEqual(m.topAccept(r2, 2).accepted, true);
  }

  // H. Top must reject a child receipt if filtering is not proven effective.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const broken = m.prepareTarget({ generation: 4, filterOwned: false });
    assert.strictEqual(m.topAccept(broken, 4).accepted, false);
  }

  // I. Top must reject a receipt if interactive decoration is still part of the physical representation.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen' });
    const broken = m.prepareTarget({ generation: 5, decorationSuppressed: false });
    assert.strictEqual(m.topAccept(broken, 5).accepted, false);
  }

  // J. A bounded height is not enough; the accepted height must be truthful for the selected representation.
  {
    const m = new RemoteFrameRepresentationModel({ media: 'screen', unrelatedHeight: 199000 });
    const legacy = m.legacyCurrentShape();
    assert(legacy.measuredHeight > 100);
    const r = m.prepareTarget({ generation: 6 });
    assert.strictEqual(r.documentHeight, 100);
    assert.strictEqual(m.topAccept(r, 6).height, 100);
  }

  console.log('P1-229 remote-frame media/selected-geometry deterministic model: PASS');
}

run();
