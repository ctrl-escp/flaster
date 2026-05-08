/**
 * @param {object} template
 * @param {{
 *   hasBuiltInTransform: boolean;
 *   activeStructure: object | null | undefined;
 *   activeMatchCount: number;
 * }} context
 */
export function annotateWorkbenchTemplate(template, context) {
  const {hasBuiltInTransform, activeStructure, activeMatchCount} = context;

  if (template.type === 'apply-known-transform') {
    return {
      ...template,
      disabled: !hasBuiltInTransform,
      detail: hasBuiltInTransform
        ? 'Available for this built-in REstringer structure.'
        : 'Unavailable because this structure has no default REstringer transform.',
    };
  }

  if (template.type === 'advanced-js-step') {
    return {
      ...template,
      disabled: !activeStructure || activeMatchCount < 1,
      detail: activeStructure && activeMatchCount > 0
        ? 'Write a custom transform function body for the current structure.'
        : 'Choose a matched structure before writing a custom transform.',
    };
  }

  if (template.type === 'no-transform') {
    return {
      ...template,
      disabled: !activeStructure || activeMatchCount < 1,
      detail: activeStructure && activeMatchCount > 0
        ? 'Export matcher scaffolding without changing the current script.'
        : 'Choose a matched structure first.',
    };
  }

  return {
    ...template,
    disabled: !activeStructure || activeMatchCount < 1,
    detail: activeStructure && activeMatchCount > 0
      ? `${activeMatchCount} matches ready`
      : 'Choose a matched structure first.',
  };
}

export function buildWorkbenchTransformOptions(catalog, context) {
  return catalog.map((template) => annotateWorkbenchTemplate(template, context));
}

/**
 * @param {{
 *   activeTemplate: { description: string } | null;
 *   activeTemplateType: string;
 *   activeStructure: { description: string } | null | undefined;
 *   transformName: string;
 *   exampleOutcome: string | null | undefined;
 * }} input
 */
export function resolveWorkbenchTemplateHelpDescription({
  activeTemplate,
  activeTemplateType,
  activeStructure,
  transformName,
  exampleOutcome,
}) {
  if (!activeTemplate) {
    return 'Choose how to transform the selected structure.';
  }

  if (activeTemplateType !== 'apply-known-transform') {
    return activeTemplate.description;
  }

  if (!activeStructure) {
    return 'Select a structure with matches to use its default REstringer transformation.';
  }

  const defaultOutcome = 'Rewrites the matched structure into a simpler equivalent form.';

  return [
    `Transformation: ${transformName}`,
    `What it does: ${activeStructure.description}`,
    `End result: ${exampleOutcome ?? defaultOutcome}`,
  ];
}
