import {buildLineIndex, evidenceFromNode} from '../../domain/report/evidenceFromNode.js';
import {collectCapabilityEvidenceMatches} from '../../domain/report/capabilityMatches.js';
import {resolveFindingGuide} from './findingGuide.js';

/** @type {number} */
export const EVIDENCE_SNIPPET_MAX = 100;

/**
 * Attaches evidence locations (and optional --full fields) to every finding in-place.
 *
 * @param {import('../../domain/report/reportModel.js').ReportSection[]} sections
 * @param {object} store  headless analysis store
 * @param {string} source  original JS source text
 * @param {boolean | { full?: boolean, includeFindingGuide?: boolean }} options
 */
export function enrichReportFindings(sections, store, source, options = {}) {
  const {full, includeFindingGuide} = normalizeEnrichOptions(options);
  const lineIndex = buildLineIndex(source);

  for (const section of sections) {
    for (const finding of section.findings) {
      if (finding.kind === 'capability') {
        enrichCapabilityFinding(finding, store, lineIndex, source, full, includeFindingGuide);
      } else {
        enrichStructureFinding(finding, store, lineIndex, source, full, includeFindingGuide);
      }
    }
  }
}

/**
 * @param {boolean | { full?: boolean, includeFindingGuide?: boolean }} options
 * @returns {{ full: boolean, includeFindingGuide: boolean }}
 */
function normalizeEnrichOptions(options) {
  if (typeof options === 'boolean') {
    return {full: options, includeFindingGuide: false};
  }

  return {
    full: options.full ?? false,
    includeFindingGuide: options.includeFindingGuide ?? false,
  };
}

function enrichStructureFinding(finding, store, lineIndex, source, full, includeFindingGuide) {
  const matches = store.getKnownStructureMatches(finding.structureId ?? finding.id);
  finding.evidence = buildEvidenceRows(matches, lineIndex, source, full);

  applyFindingGuide(finding, store, includeFindingGuide, full);
}

function enrichCapabilityFinding(finding, store, lineIndex, source, full, includeFindingGuide) {
  const evidenceMatches = collectCapabilityEvidenceMatches(store, finding.firedDetectorIds);
  finding.evidence = buildEvidenceRows(evidenceMatches, lineIndex, source, full, true);

  applyFindingGuide(finding, store, includeFindingGuide, full);
}

/**
 * @param {object} finding
 * @param {object} store
 * @param {boolean} includeFindingGuide
 * @param {boolean} full
 */
function applyFindingGuide(finding, store, includeFindingGuide, full) {
  if (includeFindingGuide || full) {
    const guide = resolveFindingGuide(finding, store);
    if (guide.description) {
      finding.description = guide.description;
    }
    if (guide.codeExample) {
      finding.codeExample = guide.codeExample;
    }
  } else {
    delete finding.description;
    delete finding.codeExample;
    if (finding.kind === 'capability') {
      delete finding.riskReason;
    }
  }
}

/**
 * @param {readonly object[]} matches  normalized structure matches
 * @param {number[]} lineIndex
 * @param {string} source
 * @param {boolean} full
 * @param {boolean} [isCapability=false]
 * @returns {object[]}
 */
function buildEvidenceRows(matches, lineIndex, source, full, isCapability = false) {
  const rows = [];

  for (const match of matches) {
    const node = match.relevantNode;
    if (!node?.range) {
      continue;
    }

    const loc = evidenceFromNode(node, lineIndex);
    const row = {...loc};

    const preview = snippetFromNode(node, EVIDENCE_SNIPPET_MAX);
    if (preview) {
      row.snippet = preview;
    }

    if (full) {
      const fullText = fullSnippetFromNode(node);
      if (fullText && fullText !== preview) {
        row.snippetFull = fullText;
      }

      if (node.type) row.nodeType = node.type;
      if (match.metadata?.nodeId !== null && match.metadata?.nodeId !== undefined) {
        row.nodeId = match.metadata.nodeId;
      }

      if (isCapability && match.structureId) {
        row.detectorId = match.structureId;
      }
    }

    rows.push(row);
  }

  return rows;
}

/**
 * @param {{ src?: string, parentNode?: { src?: string } }} node
 * @param {number} maxLen
 * @returns {string | undefined}
 */
function snippetFromNode(node, maxLen) {
  const src = fullSnippetFromNode(node);
  if (!src) {
    return undefined;
  }

  if (src.length <= maxLen) {
    return src;
  }

  return `${src.slice(0, maxLen)}…`;
}

/**
 * @param {{ src?: string, parentNode?: { src?: string } }} node
 * @returns {string | undefined}
 */
function fullSnippetFromNode(node) {
  if (node?.src) {
    return node.src;
  }
  if (node?.parentNode?.src) {
    return node.parentNode.src;
  }
  return undefined;
}
