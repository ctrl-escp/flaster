import {buildLineIndex, evidenceFromNode} from '../../domain/report/evidenceFromNode.js';
import {collectCapabilityEvidenceMatches} from '../../domain/report/capabilityMatches.js';

/**
 * Attaches evidence locations (and optional --full fields) to every finding in-place.
 *
 * @param {import('../../domain/report/reportModel.js').ReportSection[]} sections
 * @param {object} store  headless analysis store
 * @param {string} source  original JS source text
 * @param {boolean} full   whether --full was passed
 */
export function enrichReportFindings(sections, store, source, full) {
  const lineIndex = buildLineIndex(source);

  for (const section of sections) {
    for (const finding of section.findings) {
      if (finding.kind === 'capability') {
        enrichCapabilityFinding(finding, store, lineIndex, source, full);
      } else {
        enrichStructureFinding(finding, store, lineIndex, source, full);
      }
    }
  }
}

function enrichStructureFinding(finding, store, lineIndex, source, full) {
  const matches = store.getKnownStructureMatches(finding.structureId ?? finding.id);
  finding.evidence = buildEvidenceRows(matches, lineIndex, source, full);

  if (!full) {
    delete finding.description;
  }
}

function enrichCapabilityFinding(finding, store, lineIndex, source, full) {
  const evidenceMatches = collectCapabilityEvidenceMatches(store, finding.firedDetectorIds);
  finding.evidence = buildEvidenceRows(evidenceMatches, lineIndex, source, full, true);

  if (!full) {
    delete finding.description;
    delete finding.riskReason;
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

    if (full) {
      if (node.src) {
        row.snippet = node.src;
      } else if (node.parentNode?.src) {
        row.snippet = node.parentNode.src;
      }

      if (node.type) row.nodeType = node.type;
      if (match.metadata?.nodeId !== null && match.metadata?.nodeId !== undefined) row.nodeId = match.metadata.nodeId;

      if (isCapability && match.structureId) {
        row.detectorId = match.structureId;
      }
    }

    rows.push(row);
  }

  return rows;
}
