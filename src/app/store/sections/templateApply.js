import {createArborist} from '../../../domain/parse/parseSource.js';
import {createCustomStructureDescriptor} from '../../../domain/structures/customStructures.js';
import {
  normalizeCustomTransformRunSettings,
  runCustomTransformExecution,
} from '../../../domain/transforms/customTransformRuntime.js';
import {executeKnownStructureTransformApply} from '../../../domain/transforms/transformExecutor.js';
import {
  getOutermostMatchedNodes,
  normalizeDeleteStructureRunSettings as normalizeDeleteStructureRunSettingsFromPipeline,
} from '../../../domain/pipeline/pipelineStepRunner.js';
import {runKnownStructureTransformSession} from '../../../integrations/restringer/index.js';

/**
 * Workspace templates, custom transforms, and known-structure apply/preview paths.
 * @returns {Record<string, unknown>}
 */
export function createTemplateApplySection() {
  return {
    normalizeDeleteStructureRunSettings(metadata = {}) {
      return normalizeDeleteStructureRunSettingsFromPipeline(
        metadata,
        this.templateDrafts['delete-structure-matches'] ?? {},
      );
    },
    applyCustomTransformation(transformSrc, metadata = {}) {
      const source = transformSrc || this.getEditor(this.editorIds.transformEditor)?.state?.doc?.toString();
      if (!source) {
        this.logMessage('Missing transformation code', 'error');
        return false;
      }

      this.saveState();

      try {
        const normalizedSource = source.trim();
        const candidateFilters = Array.isArray(metadata.filters) && metadata.filters.length
          ? metadata.filters.filter((filter) => filter?.enabled && filter?.src)
          : this.filters.filter((filter) => filter?.enabled && filter?.src);
        const structureId = metadata?.selectionSource?.kind === 'known-structure'
          ? metadata.selectionSource.structureId
          : metadata?.params?.structureId;
        const runSettings = normalizeCustomTransformRunSettings(
          metadata,
          this.templateDrafts['advanced-js-step'] ?? {},
        );
        const result = runCustomTransformExecution(this.arb, {
          body: normalizedSource,
          structureId: structureId ?? null,
          candidateFilters,
          runSettings,
        });

        if (!result.isDone) {
          this.states.pop();
          this.logMessage(`Invalid transformer code: ${result.error?.message ?? 'Unknown error'}`, 'error');
          return false;
        }

        const totalChanges = result.changesCount;
        const iterationCount = result.executedIterations ?? 0;

        const stepEntry = this.normalizeStepEntry({
          kind: 'custom',
          filters: candidateFilters,
          transformationCode: normalizedSource,
          ...metadata,
          runMode: runSettings.runMode,
          maxIterations: runSettings.maxIterations,
          params: {
            ...(metadata.params ?? {}),
            runMode: runSettings.runMode,
            maxIterations: runSettings.maxIterations,
            executedIterations: iterationCount,
            appliedChanges: totalChanges,
          },
        });
        stepEntry.previewSummary = metadata.previewSummary ??
          (runSettings.runMode === 'once'
            ? `Custom transform ran once${totalChanges > 0 ? '' : ' with no changes'}`
            : runSettings.runMode === 'count'
              ? `Custom transform ran ${iterationCount}/${runSettings.maxIterations} times`
              : `Custom transform ran ${iterationCount} time${iterationCount === 1 ? '' : 's'} until stable`);
        const applied = this.applyAndUpdateTransformation(normalizedSource, stepEntry, totalChanges);
        if (!applied) {
          this.states.pop();
        }
        return applied;
      } catch (error) {
        this.states.pop();
        this.logMessage(`Invalid transformer code: ${error.message}`, 'error');
        return false;
      }
    },
    /**
     * Builds a lightweight preview for a safe known-structure transform
     * without mutating the currently active Arborist instance.
     *
     * @param {string | null} [structureId=this.inspectedKnownStructureId ?? this.activeKnownStructureId]
     */
    previewKnownStructureTransform(
      structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
    ) {
      const structure = this.getKnownStructureById(structureId);

      if (!structure) {
        this.logMessage('Pick a known structure before previewing its transform', 'error');
        this.clearKnownStructureTransformPreview();
        return null;
      }

      if (structure.executionMode !== 'no-eval') {
        this.logMessage(structure.support.note, 'error');
        this.clearKnownStructureTransformPreview(structure.id);
        return null;
      }

      if (!structure.transformEnabled) {
        this.logMessage(`${structure.title} does not expose a safe transform`, 'error');
        this.clearKnownStructureTransformPreview(structure.id);
        return null;
      }

      if (!this.arb?.script?.length) {
        this.logMessage('Parse code before previewing a known structure transform', 'error');
        this.clearKnownStructureTransformPreview(structure.id);
        return null;
      }

      try {
        const previewArborist = createArborist(this.arb.script);
        const previewSession = runKnownStructureTransformSession(previewArborist, structure.id);
        const preview = {
          structureId: structure.id,
          structureTitle: structure.title,
          transformName: previewSession.transformName,
          executionMode: structure.executionMode,
          targetedMatchCount: previewSession.targetedMatchCount,
          pendingChanges: previewSession.pendingChanges ?? 0,
          selectedMatchCount: this.getKnownStructureMatches(structure.id).length,
          previewedAt: new Date().toISOString(),
          hasChanges: (previewSession.pendingChanges ?? 0) > 0,
          error: previewSession.error,
        };

        this.knownStructureTransformPreview = preview;

        if (preview.error) {
          this.logMessage(`Unable to preview ${structure.title}: ${preview.error.message}`, 'error');
        } else {
          this.logMessage(
            `Previewed ${structure.title}: ${preview.targetedMatchCount} matches, ${preview.pendingChanges} pending changes`,
            'success',
          );
        }

        return preview;
      } catch (error) {
        this.knownStructureTransformPreview = {
          structureId: structure.id,
          structureTitle: structure.title,
          transformName: structure.implementation.transformName,
          executionMode: structure.executionMode,
          targetedMatchCount: 0,
          pendingChanges: 0,
          selectedMatchCount: this.getKnownStructureMatches(structure.id).length,
          previewedAt: new Date().toISOString(),
          hasChanges: false,
          error,
        };
        this.logMessage(`Unable to preview ${structure.title}: ${error.message}`, 'error');
        return this.knownStructureTransformPreview;
      }
    },
    /**
     * Applies a safe known-structure transform to the current script
     * after a preview has been generated for the same structure.
     *
     * @param {string | null} [structureId=this.inspectedKnownStructureId ?? this.activeKnownStructureId]
     * @returns {boolean}
     */
    applyKnownStructureTransform(
      structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
    ) {
      const structure = this.getKnownStructureById(structureId);

      if (!structure) {
        this.logMessage('Pick a known structure before applying its transform', 'error');
        return false;
      }

      if (structure.executionMode !== 'no-eval') {
        this.logMessage(structure.support.note, 'error');
        return false;
      }

      const preview = this.getKnownStructureTransformPreview(structure.id) ??
        this.previewKnownStructureTransform(structure.id);

      if (!preview || preview.error) {
        return false;
      }

      this.saveState();

      try {
        const transformResult = executeKnownStructureTransformApply(this.arb, structure.id);

        if (!transformResult.isDone || transformResult.changesCount < 1) {
          this.states.pop();
          this.logMessage(
            transformResult.error?.message ?? `${structure.title} did not produce any pending changes`,
            'error',
          );
          return false;
        }

        const stepEntry = {
          kind: 'known-structure-transform',
          structureId: structure.id,
          structureTitle: structure.title,
          moduleName: structure.implementation.moduleName,
          matcherName: structure.implementation.matcherName,
          transformName: transformResult.transformName,
          affectedMatchCount: transformResult.targetedMatchCount ?? 0,
          appliedChanges: transformResult.changesCount,
          appliedAt: new Date().toISOString(),
          sequenceIndex: this.steps.length + 1,
          label: `Apply ${structure.title}`,
          templateType: 'apply-known-transform',
          params: {
            structureId: structure.id,
            transformName: transformResult.transformName,
          },
          previewSummary: `${transformResult.changesCount} changes across ${transformResult.targetedMatchCount ?? 0} matches`,
          selectionSource: {
            kind: 'known-structure',
            structureId: structure.id,
          },
        };

        const applied = this.applyAndUpdateTransformation(
          null,
          stepEntry,
          transformResult.changesCount,
        );

        if (!applied) {
          this.states.pop();
          return false;
        }

        this.clearKnownStructureTransformPreview(structure.id);
        this.logMessage(
          `Applied ${structure.title}: ${stepEntry.appliedChanges} changes across ${stepEntry.affectedMatchCount} matches`,
          'success',
        );
        return true;
      } catch (error) {
        this.states.pop();
        this.logMessage(`Unable to apply ${structure.title}: ${error.message}`, 'error');
        return false;
      }
    },
    applyDeleteStructureMatches(
      structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
    ) {
      const structure = this.getKnownStructureById(structureId);
      const matches = this.getKnownStructureMatches(structureId);
      const matchedNodes = this.getKnownStructureMatchNodes(structureId);
      const runSettings = this.normalizeDeleteStructureRunSettings();

      if (!structure || !matches.length || !matchedNodes.length) {
        this.logMessage('Pick a matched structure before deleting its matches', 'error');
        return false;
      }

      this.saveState();

      try {
        let totalDeletedMatches = 0;
        let iterationCount = 0;
        const shouldContinue = () => runSettings.runMode === 'until-stable' ||
          (runSettings.runMode === 'count' && iterationCount < runSettings.maxIterations) ||
          (runSettings.runMode === 'once' && iterationCount < 1);

        while (shouldContinue()) {
          const nextMatchedNodes = this.getKnownStructureMatchNodes(structureId);
          if (!nextMatchedNodes.length) {
            break;
          }

          for (const node of nextMatchedNodes) {
            if (!node) {
              continue;
            }
            this.arb.markNode(node);
          }

          const changes = this.arb.applyChanges();
          if (changes < 1) {
            break;
          }

          totalDeletedMatches += nextMatchedNodes.length;
          iterationCount += 1;
          this.loadNewScript(this.arb.script);
          this.runKnownStructureMatching();
        }

        const stepEntry = {
          kind: 'custom',
          filters: [],
          transformationCode: '',
          label: `Delete ${structure.title} matches`,
          templateType: 'delete-structure-matches',
          runMode: runSettings.runMode,
          maxIterations: runSettings.maxIterations,
          params: {
            structureId: structure.id,
            deletedMatches: totalDeletedMatches,
            runMode: runSettings.runMode,
            maxIterations: runSettings.maxIterations,
            executedIterations: iterationCount,
          },
          previewSummary: runSettings.runMode === 'once'
            ? `Delete ${totalDeletedMatches} matched nodes in 1 pass`
            : runSettings.runMode === 'count'
              ? `Delete ${totalDeletedMatches} matched nodes across ${iterationCount}/${runSettings.maxIterations} passes`
              : `Delete ${totalDeletedMatches} matched nodes until no more remained`,
          selectionSource: {
            kind: 'known-structure',
            structureId: structure.id,
          },
        };

        const applied = this.applyAndUpdateTransformation(null, stepEntry, totalDeletedMatches);
        if (!applied) {
          this.states.pop();
        }
        return applied;
      } catch (error) {
        this.states.pop();
        this.logMessage(`Unable to delete ${structure.title} matches: ${error.message}`, 'error');
        return false;
      }
    },
    applyIsolateStructureMatches(
      structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
    ) {
      const structure = this.getKnownStructureById(structureId);
      const matchedNodes = this.getKnownStructureMatchNodes(structureId);
      const programNode = this.arb?.ast?.find((node) => node.type === 'Program');

      if (!structure || !matchedNodes.length || !programNode) {
        this.logMessage('Pick a matched structure before isolating its matches', 'error');
        return false;
      }

      this.saveState();

      try {
        const isolatedNodes = getOutermostMatchedNodes(matchedNodes)
          .filter(Boolean);

        this.arb.markNode(programNode, {
          type: 'Program',
          sourceType: programNode.sourceType,
          body: [{
            type: 'BlockStatement',
            body: isolatedNodes,
          }],
        });

        const stepEntry = {
          kind: 'custom',
          filters: [],
          transformationCode: '',
          label: `Isolate ${structure.title} matches`,
          templateType: 'isolate-structure-matches',
          params: {
            structureId: structure.id,
            isolatedMatches: isolatedNodes.length,
          },
          previewSummary: `Keep only ${isolatedNodes.length} matched nodes inside a block`,
          selectionSource: {
            kind: 'known-structure',
            structureId: structure.id,
          },
        };

        const applied = this.applyAndUpdateTransformation(null, stepEntry);
        if (!applied) {
          this.states.pop();
        }
        return applied;
      } catch (error) {
        this.states.pop();
        this.logMessage(`Unable to isolate ${structure.title} matches: ${error.message}`, 'error');
        return false;
      }
    },
    applyNoTransformStep(
      structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
    ) {
      const structure = this.getKnownStructureById(structureId);
      const matches = this.getKnownStructureMatches(structureId);

      if (!structure || !matches.length) {
        this.logMessage('Pick a matched structure before exporting a no-transform step', 'error');
        return false;
      }

      return this.addPipelineStep({
        kind: 'custom',
        filters: [],
        transformationCode: '',
        label: `${structure.title} (No Transform)`,
        templateType: 'no-transform',
        runMode: 'once',
        maxIterations: 1,
        params: {
          structureId: structure.id,
          exportedMatchCount: matches.length,
          runMode: 'once',
          maxIterations: 1,
        },
        previewSummary: `Export-only scaffold for ${matches.length} matches`,
        selectionSource: {
          kind: 'known-structure',
          structureId: structure.id,
        },
      }, `Added ${structure.title} as a no-transform export step`);
    },
    getDefaultSelectionFilter() {
      const selectedNode = this.getSelectedNode();
      if (selectedNode?.type) {
        return `n.type === ${JSON.stringify(selectedNode.type)}`;
      }

      if (this.activeKnownStructureId) {
        const structure = this.getKnownStructureById(this.activeKnownStructureId);
        return `n.type === ${JSON.stringify(structure?.category === 'calls' ? 'CallExpression' : 'Identifier')}`;
      }

      return 'true';
    },
    createNodeSelectionFilter() {
      const selectedNode = this.getSelectedNode();
      if (!selectedNode) {
        return this.getDefaultSelectionFilter();
      }

      if (selectedNode.type === 'Identifier' && typeof selectedNode.name === 'string') {
        return `n.type === 'Identifier' && n.name === ${JSON.stringify(selectedNode.name)}`;
      }

      if (selectedNode.type === 'Literal') {
        return `n.type === 'Literal' && n.value === ${JSON.stringify(selectedNode.value)}`;
      }

      return `n.type === ${JSON.stringify(selectedNode.type)}`;
    },
    applyTemplate(templateType = this.activeTemplateType) {
      const activeStructure = this.getKnownStructureById(this.inspectedKnownStructureId ?? this.activeKnownStructureId);

      if (templateType === 'apply-known-transform') {
        return this.applyKnownStructureTransform(activeStructure?.id);
      }

      if (templateType === 'advanced-js-step') {
        this.openAdvancedTools();
        return true;
      }

      if (templateType === 'no-transform') {
        return this.applyNoTransformStep(activeStructure?.id);
      }

      if (templateType === 'delete-structure-matches') {
        return this.applyDeleteStructureMatches(activeStructure?.id);
      }

      if (templateType === 'isolate-structure-matches') {
        return this.applyIsolateStructureMatches(activeStructure?.id);
      }

      return false;
    },
    addCustomKnownStructure(title, filterSrc, category = 'custom') {
      const normalizedTitle = String(title || '').trim() || 'Custom Structure';
      const normalizedFilter = String(filterSrc || '').trim();
      const normalizedCategory = String(category || '').trim() || 'custom';

      if (!normalizedFilter) {
        this.logMessage('Missing structure rule', 'error');
        return false;
      }

      try {
        const nextStructure = createCustomStructureDescriptor(normalizedTitle, normalizedFilter, normalizedCategory);
        this.availableKnownStructures = [...this.availableKnownStructures, nextStructure];
        this.selectedKnownStructureIds = [...new Set([...this.selectedKnownStructureIds, nextStructure.id])];
        this.activeKnownStructureId = nextStructure.id;
        this.setInspectedKnownStructure(nextStructure.id);
        this.knownStructureSelectionVersion += 1;
        this.logMessage(`Added custom structure: "${nextStructure.title}"`, 'success');
        return nextStructure;
      } catch (error) {
        this.logMessage(`Invalid structure rule: ${error.message}`, 'error');
        return false;
      }
    },
    updateCustomKnownStructure(structureId, title, filterSrc, category = 'custom') {
      const prev = this.getKnownStructureById(structureId);

      if (!prev) {
        this.logMessage('Structure not found', 'error');
        return null;
      }

      if ((prev.categoryGroup ?? '') !== 'user-defined') {
        this.logMessage('Only user-defined structures can be edited in place', 'error');
        return null;
      }

      const normalizedTitle = String(title || '').trim() || 'Custom Structure';
      const normalizedFilter = String(filterSrc || '').trim();
      const normalizedCategory = String(category || '').trim() || 'custom';

      if (!normalizedFilter) {
        this.logMessage('Missing structure rule', 'error');
        return null;
      }

      try {
        const nextStructure = createCustomStructureDescriptor(
          normalizedTitle,
          normalizedFilter,
          normalizedCategory,
          structureId,
        );
        const idx = this.availableKnownStructures.findIndex((structure) => structure.id === structureId);

        if (idx === -1) {
          this.logMessage('Structure not found', 'error');
          return null;
        }

        const nextCatalog = [...this.availableKnownStructures];
        nextCatalog[idx] = nextStructure;
        this.availableKnownStructures = nextCatalog;
        this.markKnownStructureInputChanged();
        this.knownStructureSelectionVersion += 1;
        this.logMessage(`Updated custom structure: "${nextStructure.title}"`, 'success');
        return nextStructure;
      } catch (error) {
        this.logMessage(`Invalid structure rule: ${error.message}`, 'error');
        return null;
      }
    },
  };
}
