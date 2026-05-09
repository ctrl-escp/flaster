/* eslint-disable */
/*
Welcome to flASTer.

flASTer parses JavaScript into an AST so you can inspect code structure, match
known patterns, and generate or apply structural transforms. It is built for
code exploration, deobfuscation, and for building bespoke deobfuscators for
whatever code patterns you need to untangle or re-order.

Everything in flASTer runs client side on your machine. Your code stays local
to your browser session while you inspect nodes, match structures, and test
transforms.

Quick start:
1. flASTer parses this script automatically when the tool loads.
2. Open Structure Explorer to see which known structures matched.
3. Select a match to highlight the source and inspect the related nodes.
4. Preview a built-in transform or write your own Arborist-based transform.
5. Use the Load menu to open built-in samples to play around, or load your own
   JavaScript to analyze.
6. Replace these examples with your own code when you are ready to analyze it.

This starter file intentionally includes examples for built-in known structure,
plus a few extra variants, so new users can explore the tool right away.
*/

function computeScore(value) {
  return value * 10;
}

function useToken(token) {
  return token;
}

function runVisibleBranch() {
  return 'visible';
}

function runDeadBranch() {
  return 'dead';
}

function logStep(label) {
  return label;
}

function finalizeStep() {
  return 'done';
}

function render() {
  return 'rendered';
}

// Proxy Calls (inner call arguments must be the parameter identifiers in order)
function starterProxyCall(a, b) {
  return sum(a, b);
}

const sum = (left, right) => left + right;
const total = starterProxyCall(2, 3);

function starterProxyBinary(operation, left, right) {
  return operation(left, right);
}

const multiply = (left, right) => left * right;
const product = starterProxyBinary(multiply, 4, 5);

function starterSimpleOpAdd(left, right) {
  return left + right;
}
starterSimpleOpAdd(1, 2);

function unwrapIndirect() {
  const held = 1;
  function passThrough() {
    return held;
  }
  passThrough();
}

// Proxy Variables
const inputValue = 7;
const originalValue = computeScore(inputValue);
const aliasedValue = originalValue;
const mirroredValue = aliasedValue;
const gridCol = 1, gridRow = 2;

console.log(aliasedValue);
console.log(mirroredValue);

// Proxy References
const state = {
  token: 'abc123',
  session: {
    id: 'session-42',
  },
};

const tokenRef = state.token;
const sessionRef = state.session.id;
useToken(tokenRef);
useToken(sessionRef);

// Wrapped Value Shells
function revealValue() {
  return 'decoded';
}

function revealNumber() {
  return 99;
}

const message = revealValue();
const luckyNumber = revealNumber();

// IIFE Wrappers
const config = (function () {
  return {retries: 3};
}());

const featureFlags = (() => ({beta: true}))();

const literalShell = (function () {
  return 7;
}());

// Template Literal Strings
const label = `debug mode enabled`;
const banner = `flASTer starter script`;
console.log(label);
console.log(banner);

const foldedEval = eval('40 + 2');
const fromNewFunction = new Function('return 1')();
const fromFnConstructor = Function.constructor('return 1');

// Fixed Assigned Values
const statusCode = 200;

if (statusCode === 200) {
  console.log('ok');
}

function lateLiteralAssign() {
  let slot;
  slot = 3;
  return slot;
}

const flowGate = true;
flowGate && logStep('shortcut');

// Deterministic If Statements
if (true) {
  runVisibleBranch();
} else {
  runDeadBranch();
}

if (false) {
  runDeadBranch();
} else {
  runVisibleBranch();
}

if (true) {
  logStep('nonempty-then-empty-else');
} else {
}

if ([] && logStep('short-circuit-fold')) {
  render();
}

// Comma Sequences in Returns and If Tests
function sequenceReturnDemo() {
  {
    {
      logStep('nested-blocks');
    }
  }
  return (
    logStep('first'),
    logStep('second'),
    finalizeStep()
  );
}

function sequenceIfDemo() {
  ;
  const neverReadHere = 1;
  if (
    (
      logStep('prepare'),
      logStep('execute'),
      true
    )
  ) {
    render();
  }
}

5, 6, 7;

// Switch Statements With Literal Discriminants
let flowStage = 'init';

switch (flowStage) {
  case 'init':
    flowStage = 'ready';
    break;
  case 'ready':
    render();
    break;
}

let lifecycleStage = 'boot';

switch (lifecycleStage) {
  case 'boot':
    lifecycleStage = 'interactive';
    break;
  case 'interactive':
    render();
    break;
}

(function tableLookupDemo() {
  const table = [
    42, 42, 42, 42, 42, 42, 42, 42, 42, 42,
    42, 42, 42, 42, 42, 42, 42, 42, 42, 42,
    42,
  ];
  return table[0];
}());

// Computed Members
const user = {name: 'Ada'};

console.log(user['name']);
console['log'](user.name);

function memberLiteralDemo() {
  const o = {};
  o.x = 1;
  return o.x;
}

// Call and Apply With This Receiver
function demoCallApplyHost() {
  function noopForCallApply() {}

  noopForCallApply.call(this, 1);
}

function applyShellOuter() {
  return function applyShellInner() {
    return 1;
  }.apply(this, arguments);
}
