import {
  finalizePipelineStepForStorage,
  getPipelineSaveWarningForStructure,
  getPipelineSaveWarningForTransformBody,
  getPipelineStepStructureId as getPipelineStepStructureIdFromModel,
  normalizePipelineStepEntry,
  pipelineStepsReferenceStructureId,
} from '../../../domain/pipeline/pipelineModel.js';
import {addStep, moveStepAtIndex, setStepEnabledAtIndex} from '../../../domain/pipeline/pipelineMutations.js';
import {replayPipeline} from '../../../domain/pipeline/pipelineReplay.js';
import {createPipelineStepExecutor} from '../../../domain/pipeline/pipelineStepRunner.js';

/**
 * Pipeline step list, replay, and recording applied transforms.
 * @returns {Record<string, unknown>}
 */
export function createPipelineSection() {
  return {
    steps: [],
    transformationCode: '',
    async applyAndUpdateTransformation(transformSrc, stepEntry = null, appliedChangesOverride = null) {
      const changes = Number.isInteger(appliedChangesOverride)
        ? appliedChangesOverride
        : this.arb.applyChanges();
      if (changes > 0) {
        if (typeof transformSrc === 'string') {
          this.transformationCode = transformSrc;
        }

        const nextStep = this.normalizeStepEntry(stepEntry ?? {
          kind: 'custom',
          filters: this.filters.filter((f) => f.enabled),
          transformationCode: typeof transformSrc === 'string' ? transformSrc : '',
        });
        nextStep.previewSummary = nextStep.previewSummary || `${changes} pending edits applied`;
        this.steps = addStep(this.steps, nextStep);
        this.selectedPipelineStepIndex = this.steps.length - 1;
        this.activeInspectorPanel = 'pipeline';
        this.logMessage(`${changes} changes were made`, 'success');
        await this.loadNewScript(this.arb.script);
        return true;
      }
      this.logMessage('No changes made', 'error');
      return false;
    },
    addPipelineStep(stepEntry, message = 'Step added to pipeline') {
      const nextStep = this.normalizeStepEntry(stepEntry);

      this.steps = addStep(this.steps, nextStep);
      this.selectedPipelineStepIndex = this.steps.length - 1;
      this.activeInspectorPanel = 'pipeline';
      this.logMessage(message, 'success');
      return true;
    },
    normalizeStepEntry(stepEntry = {}) {
      return finalizePipelineStepForStorage(normalizePipelineStepEntry(stepEntry), {});
    },
    getPipelineStep(index = this.selectedPipelineStepIndex) {
      return this.steps[index] ?? null;
    },
    setSelectedPipelineStep(index = -1) {
      this.selectedPipelineStepIndex = index >= 0 && index < this.steps.length ? index : -1;
      if (this.selectedPipelineStepIndex !== -1) {
        this.activeInspectorPanel = 'pipeline';
      }
    },
    movePipelineStep(index, direction) {
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || index >= this.steps.length || nextIndex >= this.steps.length) {
        return;
      }

      this.steps = moveStepAtIndex(this.steps, index, direction);
      this.selectedPipelineStepIndex = nextIndex;
    },
    togglePipelineStep(index) {
      const step = this.steps[index];
      if (!step) {
        return;
      }

      const enabled = step.enabled !== false;
      this.steps = setStepEnabledAtIndex(this.steps, index, !enabled);
    },
    getPipelineReplayBaseScript() {
      const firstSavedState = this.states[0];

      if (typeof firstSavedState?.script === 'string') {
        return firstSavedState.script;
      }

      if (typeof this.currentScriptBaseline === 'string' && this.currentScriptBaseline.length) {
        return this.currentScriptBaseline;
      }

      return this.getCurrentScriptContent();
    },
    getPipelineStepStructureId(step = null) {
      return getPipelineStepStructureIdFromModel(step);
    },
    /**
     * Confirms replay messaging when a catalog definition change would invalidate the current script.
     *
     * @param {string} structureId
     * @returns {boolean}
     */
    confirmStructureCatalogMutationIfPipelineAffected(structureId) {
      const warning = getPipelineSaveWarningForStructure(this.steps, structureId);
      if (!warning) {
        return true;
      }

      return this.confirmPipelineReplay(warning);
    },
    /**
     * @param {string} transformationCode
     * @returns {boolean}
     */
    confirmTransformBodyMutationIfPipelineAffected(transformationCode) {
      const warning = getPipelineSaveWarningForTransformBody(this.steps, transformationCode);
      if (!warning) {
        return true;
      }

      return this.confirmPipelineReplay(warning);
    },
    /**
     * @param {string} structureId
     * @returns {boolean}
     */
    pipelineReferencesStructureId(structureId) {
      return pipelineStepsReferenceStructureId(this.steps, structureId);
    },
    confirmPipelineReplay(message) {
      if (typeof window?.confirm === 'function') {
        return window.confirm(message);
      }

      return true;
    },
    async replayPipelineSteps(nextSteps, {
      selectedPipelineStepIndex = -1,
      activeStructureId = null,
      activeTemplateType = null,
      successMessage = 'Pipeline rebuilt',
    } = {}) {
      const baseScript = this.getPipelineReplayBaseScript();
      const normalizedSteps = nextSteps.map((step, index) => ({
        ...this.normalizeStepEntry(step),
        sequenceIndex: index + 1,
      }));
      const executor = createPipelineStepExecutor(this.templateDrafts);
      const replay = await replayPipeline({
        baselineSource: baseScript,
        steps: normalizedSteps,
        executor,
      });

      if (!replay.ok) {
        this.logMessage(`Unable to rebuild pipeline: ${replay.error.message}`, 'error');
        return false;
      }

      let transformationCode = '';
      for (const step of normalizedSteps) {
        if (step?.enabled === false) {
          continue;
        }

        const body = typeof step.transformationCode === 'string' ? step.transformationCode.trim() : '';
        if (!body.length) {
          continue;
        }

        const templateType = step.templateType ?? '';
        if (templateType === 'advanced-js-step' || step.kind === 'custom') {
          transformationCode = body;
        }
      }

      const nextScript = replay.source;

      this.states = [];
      await this.loadNewScript(nextScript);
      this.steps = normalizedSteps;
      this.transformationCode = transformationCode;
      this.selectedPipelineStepIndex = selectedPipelineStepIndex >= 0 &&
        selectedPipelineStepIndex < this.steps.length
        ? selectedPipelineStepIndex
        : this.steps.length
          ? this.steps.length - 1
          : -1;

      if (activeStructureId) {
        this.setActiveKnownStructure(activeStructureId);
        this.setInspectedKnownStructure(activeStructureId);
      }

      if (activeTemplateType) {
        this.setActiveTemplate(activeTemplateType);
      }

      this.logMessage(successMessage, 'success');
      return true;
    },
    async editPipelineStep(index) {
      if (index < 0 || index >= this.steps.length) {
        return false;
      }

      const step = this.steps[index];
      const structureId = this.getPipelineStepStructureId(step);
      const templateType = this.templateCatalog.some((template) => template.type === step.templateType)
        ? step.templateType
        : 'advanced-js-step';
      const confirmed = this.confirmPipelineReplay(
        'Editing this pipeline item will reparse the script, restore the original code, and reapply all pipeline items that came before it. Continue?',
      );

      if (!confirmed) {
        return false;
      }

      const replayed = await this.replayPipelineSteps(this.steps.slice(0, index), {
        selectedPipelineStepIndex: this.steps.slice(0, index).length - 1,
        activeStructureId: structureId,
        activeTemplateType: templateType,
        successMessage: 'Rebuilt the script up to the selected pipeline item',
      });

      if (!replayed) {
        return false;
      }

      this.activeInspectorPanel = 'templates';
      this.logMessage('Choose a replacement transform for this structure', 'info');
      return true;
    },
    async removePipelineStep(index) {
      if (index < 0 || index >= this.steps.length) {
        return false;
      }

      const confirmed = this.confirmPipelineReplay(
        'Deleting this pipeline item will reparse the script and reapply all of the other pipeline items. Continue?',
      );

      if (!confirmed) {
        return false;
      }

      const nextSteps = this.steps.filter((_, stepIndex) => stepIndex !== index);
      return this.replayPipelineSteps(nextSteps, {
        selectedPipelineStepIndex: Math.min(index, nextSteps.length - 1),
        successMessage: 'Removed the pipeline item and rebuilt the script',
      });
    },
  };
}
