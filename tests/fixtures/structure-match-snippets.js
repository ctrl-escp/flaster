/**
 * Per-structure match fixtures for tests. Each catalog `id` must appear with
 * either `source` (minimal JS that yields ≥1 match) or `fixtureMissingReason`.
 *
 * @typedef {{ source: string } | { fixtureMissingReason: string }}} StructureFixtureEntry
 */

/** @type {Readonly<Record<string, StructureFixtureEntry>>} */
export const STRUCTURE_FIXTURE_ENTRIES = Object.freeze({
  'proxy-calls': {source: 'function p(a,b){return t(a,b);} const x=p(1,2);'},
  'proxy-variables': {source: 'const o=1; const a=o;'},
  'proxy-references': {
    source: "const state = { token: 'abc123' }; const tokenRef = state.token; useToken(tokenRef);",
  },
  'wrapped-value-shells': {source: 'function f(){return 42;} const v=f();'},
  'iife-wrappers': {source: 'const c=(function(){return 1;}());'},
  'template-literal-strings': {source: 'const x=`static`;'},
  'fixed-assigned-values': {source: 'const A=200; const B=A;'},
  'deterministic-if-statements': {source: 'if(true){a();}else{b();}'},
  'sequence-rearrangement': {source: 'function f(){ return (a(), b(), 3); }'},
  'switch-rearrangement': {
    source: 'const state = 0; switch (state) { case 0: state = 1; break; case 1: break; }',
  },
  'computed-members': {
    source: "function proxy(a, b) { return target(a, b); } const alias = original; const out = proxy(one, two); console['log'](`ok`);",
  },
  'simplify-calls': {source: 'function f(){} f.call(this, 1);'},
});
