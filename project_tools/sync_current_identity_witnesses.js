'use strict';

// Developer helper (not a release authority): after a committed runtime or
// full-RCF input change, recompute the CURRENT identity witnesses with the
// P1-231 tooling on the exact HEAD commit and rewrite the stale pins in
// project_tools/test_*.js. Historical evidence documents are never touched,
// and exact-head CI remains the acceptance authority.
//
//   node project_tools/sync_current_identity_witnesses.js          # rewrite pins
//   node project_tools/sync_current_identity_witnesses.js --check  # exit 1 if stale

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const identity = require('./release_identity.js');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'project_tools');
// The legacy S0-E control subset is the current package minus this one file.
const LEGACY_EXCLUDED_FILE = 'application-generation.js';

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function readPin(file, pattern, label) {
  const match = fs.readFileSync(path.join(TOOLS, file), 'utf8').match(pattern);
  if (!match) throw new Error(`cannot locate current ${label} pin in project_tools/${file}`);
  return match[1];
}

function main() {
  const check = process.argv.includes('--check');
  if (git('status', '--porcelain')) {
    throw new Error('working tree is not clean: commit first (identities are computed from the HEAD commit)');
  }
  const head = git('rev-parse', 'HEAD');

  const current = identity.computeIdentities(head);
  const packageInputs = packageAuthority.identityInputs(head, packageAuthority.readCanonicalManifest());
  const legacyRpf = identity.fingerprintRpf({
    ...packageInputs,
    members: packageInputs.members.filter((member) => member.path !== LEGACY_EXCLUDED_FILE)
  });

  const pins = [
    {
      label: 'current 34-file RPF',
      from: readPin('test_p1_231_s0e_identity_engine_source_spec_model.js', /const CURRENT_RPF = '(sha256:[0-9a-f]{64})'/, 'RPF'),
      to: current.rpf
    },
    {
      label: 'legacy 33-file RPF',
      from: readPin('test_p1_231_s0e_identity_engine_source_spec_model.js', /const LEGACY_RPF = '(sha256:[0-9a-f]{64})'/, 'legacy RPF'),
      to: legacyRpf
    },
    {
      label: 'current full RCF',
      from: readPin('test_release_identity.js', /rcf: '(sha256:[0-9a-f]{64})'/, 'full RCF'),
      to: current.rcf
    }
  ];

  const stale = pins.filter((pin) => pin.from !== pin.to);
  console.log(`HEAD ${head}`);
  for (const pin of pins) {
    console.log(`${pin.from === pin.to ? 'ok   ' : 'STALE'} ${pin.label}: ${pin.from}${pin.from === pin.to ? '' : ` -> ${pin.to}`}`);
  }
  if (!stale.length) return 0;
  if (check) return 1;

  const tests = fs.readdirSync(TOOLS).filter((name) => /^test_.*\.js$/.test(name));
  for (const name of tests) {
    const file = path.join(TOOLS, name);
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    for (const pin of stale) after = after.split(pin.from).join(pin.to);
    if (after !== before) {
      fs.writeFileSync(file, after);
      console.log(`updated project_tools/${name}`);
    }
  }
  console.log('Review the diff, commit, then run the local CI mirror; exact-head CI stays authoritative.');
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`sync_current_identity_witnesses: ${error.message}`);
  process.exitCode = 2;
}
