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

// Proxy Calls
function proxyCall(handler, a, b) {
  return handler(a, b);
}

const sum = (left, right) => left + right;
const total = proxyCall(sum, 2, 3);

function proxyBinary(operation, left, right) {
  return operation(left, right);
}

const multiply = (left, right) => left * right;
const product = proxyBinary(multiply, 4, 5);

// Proxy Variables
const inputValue = 7;
const originalValue = computeScore(inputValue);
const aliasedValue = originalValue;
const mirroredValue = aliasedValue;

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
  const retries = 3;
  return {retries};
}());

const featureFlags = (() => {
  const beta = true;
  return {beta};
})();

// Template Literal Strings
const label = `debug mode enabled`;
const banner = `flASTer starter script`;
console.log(label);
console.log(banner);

// Fixed Assigned Values
const statusCode = 200;
const responseCode = statusCode;
const okCode = responseCode;

if (okCode === 200) {
  console.log('ok');
}

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

// Sequence Rearrangement
const result = (
  logStep('first'),
  logStep('second'),
  finalizeStep()
);

const pipelineResult = (
  logStep('prepare'),
  logStep('execute'),
  logStep('finish'),
  finalizeStep()
);

// Switch Rearrangement
switch (state.mode) {
  case 'init':
    state.mode = 'ready';
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

// Computed Members
const user = {name: 'Ada'};
const propertyName = 'name';
const profile = {role: 'analyst'};
const roleKey = 'role';

console.log(user[propertyName]);
console.log(profile[roleKey]);

// Simplify Calls
const math = {
  add(left, right) {
    return left + right;
  },
  subtract(left, right) {
    return left - right;
  },
};

const value = math['add'](4, 5);
const difference = math['subtract'](9, 4);
