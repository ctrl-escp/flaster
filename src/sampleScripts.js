const sampleBasePath = `${import.meta.env?.BASE_URL ?? '/'}sample-scripts/`;

export const sampleScripts = Object.freeze([
  {
    id: 'array-replacements',
    title: 'Array Replacements',
    family: 'lookup-array',
    description: 'Large lookup array with string indirection.',
    publicPath: `${sampleBasePath}array_replacements.js`,
  },
  {
    id: 'array-replacements-prototype-calls',
    title: 'Array Replacements Prototype Calls',
    family: 'lookup-array',
    description: 'Lookup-array sample with prototype-call indirection.',
    publicPath: `${sampleBasePath}array_replacements_prototype_calls.js`,
  },
  {
    id: 'array-function-proxies',
    title: 'Array Function Proxies',
    family: 'proxy-calls',
    description: 'Local proxies and indirection through helper wrappers.',
    publicPath: `${sampleBasePath}array_function_replacements_local_proxies.js`,
  },
  {
    id: 'augmented-array-replacements',
    title: 'Augmented Array Replacements',
    family: 'augmented-array',
    description: 'Array shuffling pattern that reveals more structures after cleanup.',
    publicPath: `${sampleBasePath}augmented_array_function_replacements.js`,
  },
  {
    id: 'augmented-proxied-array',
    title: 'Augmented Proxied Array',
    family: 'mixed-obfuscation',
    description: 'Proxy-heavy augmented array sample useful for ordering tests.',
    publicPath: `${sampleBasePath}augmented_proxied_array_function_replacements.js`,
  },
  {
    id: 'obfuscator-io-not-boolean-tilde',
    title: 'Obfuscator.io NotBooleanTilde',
    family: 'obfuscator.io',
    description: 'Obfuscator.io sample using not-boolean-tilde patterns.',
    publicPath: `${sampleBasePath}obfuscator.io-NotBooleanTilde.js`,
  },
  {
    id: 'obfuscator-io-set-cookie',
    title: 'Obfuscator.io SetCookie',
    family: 'obfuscator.io',
    description: 'Classic obfuscator.io anti-debug and indirection sample.',
    publicPath: `${sampleBasePath}obfuscator.io-setCookie.js`,
  },
  {
    id: 'caesar-plus',
    title: 'Caesar Plus',
    family: 'caesar-plus',
    description: 'Caesar-style sample for processor-oriented structure discovery.',
    publicPath: `${sampleBasePath}caesar_plus.js`,
  },
]);

export function getSampleScript(sampleId) {
  return sampleScripts.find((sample) => sample.id === sampleId) ?? null;
}
