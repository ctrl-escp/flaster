/** @import {Arborist} from '../../flastTypes.js' */
/**
 * Emits the reusable helper used by generated built-in transform steps.
 *
 * @returns {string}
 */
export function createKnownStructureRuntimeBlock() {
  return `function isKnownStructureNodeLike(value) {
  return !!value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    Array.isArray(value.range);
}

function findNodeInKnownStructureMatch(match, seen = new Set()) {
  if (!match || typeof match !== 'object' || seen.has(match)) {
    return null;
  }

  if (isKnownStructureNodeLike(match)) {
    return match;
  }

  seen.add(match);

  const preferredKeys = [
    'node',
    'targetNode',
    'funcNode',
    'referenceNode',
    'declarationNode',
    'candidateNode',
    'expressionNode',
    'statementNode',
    'callNode',
    'calleeNode',
    'parentNode',
    'declaratorNode',
    'proxyIdentifier',
  ];

  for (const key of preferredKeys) {
    const candidate = findNodeInKnownStructureMatch(match[key], seen);
    if (candidate) {
      return candidate;
    }
  }

  if (Array.isArray(match)) {
    for (const entry of match) {
      const candidate = findNodeInKnownStructureMatch(entry, seen);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (const value of Object.values(match)) {
    const candidate = findNodeInKnownStructureMatch(value, seen);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function collectKnownStructureMatchNodes(matches = []) {
  return matches
    .map((match) => findNodeInKnownStructureMatch(match))
    .filter(Boolean);
}

function applyKnownStructureTransformStep(inputScript, runStep) {
  const arb = new Arborist(inputScript);
  runStep(arb, () => true);
  const appliedChanges = arb.applyChanges();

  return {
    script: arb.script,
    appliedChanges,
  };
}`;
}
