/**
 * CLI / file IO wrapper fragments for the generated Node entry script.
 */

/**
 * @param {{needsCustomRuntime: boolean}} importPlan
 * @returns {string}
 */
export function createPipelinePreamble(importPlan) {
  const lines = [
    'const inputFilename = process.argv[2];',
    '',
    'if (!inputFilename) {',
    "  throw new Error('Pass an input filename as the first argument');",
    '}',
    '',
    "const originalCode = fs.readFileSync(inputFilename, 'utf8');",
    'let script = originalCode;',
  ];

  if (importPlan.needsCustomRuntime) {
    lines.push('', 'logger.setLogLevelNone();');
  }

  return lines.join('\n');
}

/**
 * @returns {string}
 */
export function createPipelineEpilogue() {
  return `if (script !== originalCode) {
  console.debug('[+] Transformation successful');
  console.log(script);
  fs.writeFileSync(\`\${inputFilename}-flastered.js\`, script, 'utf8');
} else {
  console.log('[-] Nothing transformed :/');
}`;
}
