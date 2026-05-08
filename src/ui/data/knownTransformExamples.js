export const knownTransformExamples = Object.freeze({
  'proxy-calls': {
    outcome: 'Removes the forwarding wrapper so the real callee is invoked directly.',
    before: [
      'function proxyCall(handler, a, b) {',
      '  return handler(a, b);',
      '}',
      '',
      'const sum = (left, right) => left + right;',
      'const total = proxyCall(sum, 2, 3);',
    ].join('\n'),
    after: [
      'const sum = (left, right) => left + right;',
      'const total = sum(2, 3);',
    ].join('\n'),
  },
  'proxy-variables': {
    outcome: 'Drops the alias and rewrites reads to use the original identifier directly.',
    before: [
      'const originalValue = computeScore(input);',
      'const aliasedValue = originalValue;',
      '',
      'console.log(aliasedValue);',
    ].join('\n'),
    after: [
      'const originalValue = computeScore(input);',
      '',
      'console.log(originalValue);',
    ].join('\n'),
  },
  'proxy-references': {
    outcome: 'Inlines the referenced source so the proxy variable is no longer needed.',
    before: [
      'const state = {',
      "  token: 'abc123',",
      '};',
      '',
      'const tokenRef = state.token;',
      'useToken(tokenRef);',
    ].join('\n'),
    after: [
      'const state = {',
      "  token: 'abc123',",
      '};',
      '',
      'useToken(state.token);',
    ].join('\n'),
  },
  'wrapped-value-shells': {
    outcome: 'Replaces the shell call with the wrapped value it always returns.',
    before: [
      'function revealValue() {',
      "  return 'decoded';",
      '}',
      '',
      'const message = revealValue();',
    ].join('\n'),
    after: [
      "const message = 'decoded';",
    ].join('\n'),
  },
  'iife-wrappers': {
    outcome: 'Unwraps the immediately invoked wrapper and leaves the direct value-producing code.',
    before: [
      'const config = (function () {',
      '  const retries = 3;',
      '  return {retries};',
      '}());',
    ].join('\n'),
    after: [
      'const retries = 3;',
      'const config = {retries};',
    ].join('\n'),
  },
  'template-literal-strings': {
    outcome: 'Converts a static template literal into a normal string literal.',
    before: [
      'const label = `debug mode enabled`;',
      'console.log(label);',
    ].join('\n'),
    after: [
      "const label = 'debug mode enabled';",
      'console.log(label);',
    ].join('\n'),
  },
  'fixed-assigned-values': {
    outcome: 'Propagates the fixed assigned value into places that read that identifier.',
    before: [
      'const statusCode = 200;',
      'const responseCode = statusCode;',
      '',
      'if (responseCode === 200) {',
      "  console.log('ok');",
      '}',
    ].join('\n'),
    after: [
      'const statusCode = 200;',
      '',
      'if (200 === 200) {',
      "  console.log('ok');",
      '}',
    ].join('\n'),
  },
  'deterministic-if-statements': {
    outcome: 'Keeps only the branch that will always execute and removes the dead branch.',
    before: [
      'if (true) {',
      '  runVisibleBranch();',
      '} else {',
      '  runDeadBranch();',
      '}',
    ].join('\n'),
    after: [
      'runVisibleBranch();',
    ].join('\n'),
  },
  'sequence-rearrangement': {
    outcome: 'Expands the sequence into clearer ordered statements.',
    before: [
      'const result = (',
      "  logStep('first'),",
      "  logStep('second'),",
      '  finalizeStep()',
      ');',
    ].join('\n'),
    after: [
      "logStep('first');",
      "logStep('second');",
      'const result = finalizeStep();',
    ].join('\n'),
  },
  'switch-rearrangement': {
    outcome: 'Reorders switch-driven flow into a more direct execution sequence.',
    before: [
      'switch (state) {',
      "  case 'init':",
      "    state = 'ready';",
      '    break;',
      "  case 'ready':",
      '    render();',
      '    break;',
      '}',
    ].join('\n'),
    after: [
      "state = 'ready';",
      'render();',
    ].join('\n'),
  },
  'computed-members': {
    outcome: 'Normalizes computed member access into clearer dot/property syntax when that is safe.',
    before: [
      'const user = {name: "Ada"};',
      "console.log(user['name']);",
    ].join('\n'),
    after: [
      'const user = {name: "Ada"};',
      'console.log(user.name);',
    ].join('\n'),
  },
  'simplify-calls': {
    outcome: 'Simplifies indirect call syntax into a clearer equivalent call expression.',
    before: [
      'const math = {',
      '  add(left, right) {',
      '    return left + right;',
      '  },',
      '};',
      '',
      "const value = math['add'](4, 5);",
    ].join('\n'),
    after: [
      'const math = {',
      '  add(left, right) {',
      '    return left + right;',
      '  },',
      '};',
      '',
      'const value = math.add(4, 5);',
    ].join('\n'),
  },
});
