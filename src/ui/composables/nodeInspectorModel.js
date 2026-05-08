/**
 * @param {{
 *   node: object | null | undefined;
 *   selectedNodeSource: string | null | undefined;
 *   scopeBlockType: string | null | undefined;
 *   childCount: number;
 *   nodeMatchCount: number;
 *   overlapCount: number;
 * }} input
 */
export function buildNodeInspectorOverviewRows({
  node,
  selectedNodeSource,
  scopeBlockType,
  childCount,
  nodeMatchCount,
  overlapCount,
}) {
  if (!node) {
    return [];
  }

  return [
    {label: 'Type', value: node.type},
    {label: 'Selection source', value: selectedNodeSource || 'direct'},
    {label: 'Parent', value: node.parentNode?.type ?? 'Root'},
    {label: 'Scope block', value: scopeBlockType ?? 'Program'},
    {label: 'Children', value: String(childCount)},
    {label: 'Related structures', value: String(nodeMatchCount)},
    {label: 'Overlaps', value: String(overlapCount)},
  ];
}
