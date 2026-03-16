import * as normalizeComputedModule from 'restringer/src/modules/safe/normalizeComputed.js';
import * as normalizeEmptyStatementsModule from 'restringer/src/modules/safe/normalizeEmptyStatements.js';
import * as parseTemplateLiteralsIntoStringLiteralsModule from 'restringer/src/modules/safe/parseTemplateLiteralsIntoStringLiterals.js';
import * as rearrangeSequencesModule from 'restringer/src/modules/safe/rearrangeSequences.js';
import * as rearrangeSwitchesModule from 'restringer/src/modules/safe/rearrangeSwitches.js';
import * as removeRedundantBlockStatementsModule from 'restringer/src/modules/safe/removeRedundantBlockStatements.js';
import * as replaceBooleanExpressionsWithIfModule from 'restringer/src/modules/safe/replaceBooleanExpressionsWithIf.js';
import * as replaceCallExpressionsWithUnwrappedIdentifierModule from 'restringer/src/modules/safe/replaceCallExpressionsWithUnwrappedIdentifier.js';
import * as replaceEvalCallsWithLiteralContentModule from 'restringer/src/modules/safe/replaceEvalCallsWithLiteralContent.js';
import * as replaceFunctionShellsWithWrappedValueModule from 'restringer/src/modules/safe/replaceFunctionShellsWithWrappedValue.js';
import * as replaceFunctionShellsWithWrappedValueIIFEModule from 'restringer/src/modules/safe/replaceFunctionShellsWithWrappedValueIIFE.js';
import * as replaceIdentifierWithFixedAssignedValueModule from 'restringer/src/modules/safe/replaceIdentifierWithFixedAssignedValue.js';
import * as replaceIdentifierWithFixedValueNotAssignedAtDeclarationModule from 'restringer/src/modules/safe/replaceIdentifierWithFixedValueNotAssignedAtDeclaration.js';
import * as replaceNewFuncCallsWithLiteralContentModule from 'restringer/src/modules/safe/replaceNewFuncCallsWithLiteralContent.js';
import * as replaceSequencesWithExpressionsModule from 'restringer/src/modules/safe/replaceSequencesWithExpressions.js';
import * as resolveDeterministicIfStatementsModule from 'restringer/src/modules/safe/resolveDeterministicIfStatements.js';
import * as resolveFunctionConstructorCallsModule from 'restringer/src/modules/safe/resolveFunctionConstructorCalls.js';
import * as resolveMemberExpressionReferencesToArrayIndexModule from 'restringer/src/modules/safe/resolveMemberExpressionReferencesToArrayIndex.js';
import * as resolveMemberExpressionsWithDirectAssignmentModule from 'restringer/src/modules/safe/resolveMemberExpressionsWithDirectAssignment.js';
import * as resolveProxyCallsModule from 'restringer/src/modules/safe/resolveProxyCalls.js';
import * as resolveProxyReferencesModule from 'restringer/src/modules/safe/resolveProxyReferences.js';
import * as resolveProxyVariablesModule from 'restringer/src/modules/safe/resolveProxyVariables.js';
import * as resolveRedundantLogicalExpressionsModule from 'restringer/src/modules/safe/resolveRedundantLogicalExpressions.js';
import * as separateChainedDeclaratorsModule from 'restringer/src/modules/safe/separateChainedDeclarators.js';
import * as simplifyCallsModule from 'restringer/src/modules/safe/simplifyCalls.js';
import * as simplifyIfStatementsModule from 'restringer/src/modules/safe/simplifyIfStatements.js';
import * as unwrapFunctionShellsModule from 'restringer/src/modules/safe/unwrapFunctionShells.js';
import * as unwrapIIFEsModule from 'restringer/src/modules/safe/unwrapIIFEs.js';
import * as unwrapSimpleOperationsModule from 'restringer/src/modules/safe/unwrapSimpleOperations.js';
import {areReferencesModified} from 'restringer/src/modules/utils/areReferencesModified.js';
import {createNewNode} from 'restringer/src/modules/utils/createNewNode.js';
import {createOrderedSrc} from 'restringer/src/modules/utils/createOrderedSrc.js';
import {doesDescendantMatchCondition} from 'restringer/src/modules/utils/doesDescendantMatchCondition.js';
import {generateHash} from 'restringer/src/modules/utils/generateHash.js';
import {getCache} from 'restringer/src/modules/utils/getCache.js';
import {getCalleeName} from 'restringer/src/modules/utils/getCalleeName.js';
import {getDeclarationWithContext} from 'restringer/src/modules/utils/getDeclarationWithContext.js';
import {getDescendants} from 'restringer/src/modules/utils/getDescendants.js';
import {getMainDeclaredObjectOfMemberExpression} from 'restringer/src/modules/utils/getMainDeclaredObjectOfMemberExpression.js';
import {getObjType} from 'restringer/src/modules/utils/getObjType.js';
import {isNodeInRanges} from 'restringer/src/modules/utils/isNodeInRanges.js';

const curatedStructureDefinitions = [
  {
    id: 'proxy-calls',
    title: 'Proxy Calls',
    category: 'calls',
    description: 'Matches wrapper functions that only pass arguments through to another call.',
    tags: ['proxy', 'calls', 'wrappers'],
    browserSafe: true,
    experimental: false,
    module: resolveProxyCallsModule,
    matcherExport: 'resolveProxyCallsMatch',
    transformExport: 'resolveProxyCallsTransform',
  },
  {
    id: 'proxy-variables',
    title: 'Proxy Variables',
    category: 'variables',
    description: 'Matches variable aliases that point directly at another identifier.',
    tags: ['proxy', 'variables', 'aliases'],
    browserSafe: true,
    experimental: false,
    module: resolveProxyVariablesModule,
    matcherExport: 'resolveProxyVariablesMatch',
    transformExport: 'resolveProxyVariablesTransform',
  },
  {
    id: 'proxy-references',
    title: 'Proxy References',
    category: 'variables',
    description: 'Matches proxy declarations that redirect references to another identifier or member expression.',
    tags: ['proxy', 'references', 'variables'],
    browserSafe: true,
    experimental: false,
    module: resolveProxyReferencesModule,
    matcherExport: 'resolveProxyReferencesMatch',
    transformExport: 'resolveProxyReferencesTransform',
  },
  {
    id: 'wrapped-value-shells',
    title: 'Wrapped Value Shells',
    category: 'wrappers',
    description: 'Matches function shells that only wrap and return a fixed value.',
    tags: ['wrappers', 'functions', 'values'],
    browserSafe: true,
    experimental: false,
    module: replaceFunctionShellsWithWrappedValueModule,
    matcherExport: 'replaceFunctionShellsWithWrappedValueMatch',
    transformExport: 'replaceFunctionShellsWithWrappedValueTransform',
  },
  {
    id: 'eval-literal-content',
    title: 'Eval Literal Content',
    category: 'calls',
    description: 'Matches eval calls whose literal string content can be parsed directly into AST nodes.',
    tags: ['eval', 'calls', 'literals'],
    browserSafe: true,
    experimental: false,
    module: replaceEvalCallsWithLiteralContentModule,
    matcherExport: 'replaceEvalCallsWithLiteralContentMatch',
    transformExport: 'replaceEvalCallsWithLiteralContentTransform',
  },
  {
    id: 'wrapped-value-iifes',
    title: 'Wrapped Value IIFEs',
    category: 'wrappers',
    description: 'Matches IIFE-based shells that return a wrapped value or callable.',
    tags: ['wrappers', 'iife', 'functions'],
    browserSafe: true,
    experimental: false,
    module: replaceFunctionShellsWithWrappedValueIIFEModule,
    matcherExport: 'replaceFunctionShellsWithWrappedValueIIFEMatch',
    transformExport: 'replaceFunctionShellsWithWrappedValueIIFETransform',
  },
  {
    id: 'unwrap-iifes',
    title: 'IIFE Wrappers',
    category: 'wrappers',
    description: 'Matches immediately invoked wrappers that can be safely unwrapped.',
    tags: ['iife', 'wrappers', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: unwrapIIFEsModule,
    matcherExport: 'unwrapIIFEsMatch',
    transformExport: 'unwrapIIFEsTransform',
  },
  {
    id: 'unwrap-function-shells',
    title: 'Function Shells',
    category: 'wrappers',
    description: 'Matches wrapper functions that can be reduced to the inner function body.',
    tags: ['wrappers', 'functions', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: unwrapFunctionShellsModule,
    matcherExport: 'unwrapFunctionShellsMatch',
    transformExport: 'unwrapFunctionShellsTransform',
  },
  {
    id: 'template-literals-to-strings',
    title: 'Template Literal Strings',
    category: 'literals',
    description: 'Matches template literals composed only of literal values.',
    tags: ['literals', 'templates', 'strings'],
    browserSafe: true,
    experimental: false,
    module: parseTemplateLiteralsIntoStringLiteralsModule,
    matcherExport: 'parseTemplateLiteralsIntoStringLiteralsMatch',
    transformExport: 'parseTemplateLiteralsIntoStringLiteralsTransform',
  },
  {
    id: 'fixed-assigned-values',
    title: 'Fixed Assigned Values',
    category: 'variables',
    description: 'Matches identifiers that are assigned a fixed value and can be replaced safely.',
    tags: ['variables', 'constants', 'assignments'],
    browserSafe: true,
    experimental: false,
    module: replaceIdentifierWithFixedAssignedValueModule,
    matcherExport: 'replaceIdentifierWithFixedAssignedValueMatch',
    transformExport: 'replaceIdentifierWithFixedAssignedValueTransform',
  },
  {
    id: 'fixed-values-after-declaration',
    title: 'Fixed Values After Declaration',
    category: 'variables',
    description: 'Matches identifiers that settle into a fixed value after declaration.',
    tags: ['variables', 'constants', 'assignments'],
    browserSafe: true,
    experimental: false,
    module: replaceIdentifierWithFixedValueNotAssignedAtDeclarationModule,
    matcherExport: 'replaceIdentifierWithFixedValueNotAssignedAtDeclarationMatch',
    transformExport: 'replaceIdentifierWithFixedValueNotAssignedAtDeclarationTransform',
  },
  {
    id: 'new-function-literal-content',
    title: 'New Function Literal Content',
    category: 'calls',
    description: 'Matches immediately executed Function constructors with literal content.',
    tags: ['calls', 'function-constructor', 'literals'],
    browserSafe: true,
    experimental: false,
    module: replaceNewFuncCallsWithLiteralContentModule,
    matcherExport: 'replaceNewFuncCallsWithLiteralContentMatch',
    transformExport: 'replaceNewFuncCallsWithLiteralContentTransform',
  },
  {
    id: 'deterministic-if-statements',
    title: 'Deterministic If Statements',
    category: 'conditionals',
    description: 'Matches `if` branches whose outcome is statically determined.',
    tags: ['conditionals', 'branching', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: resolveDeterministicIfStatementsModule,
    matcherExport: 'resolveDeterministicIfStatementsMatch',
    transformExport: 'resolveDeterministicIfStatementsTransform',
  },
  {
    id: 'simplify-if-statements',
    title: 'Simplified If Statements',
    category: 'conditionals',
    description: 'Matches `if` statements that can be structurally simplified.',
    tags: ['conditionals', 'cleanup', 'branching'],
    browserSafe: true,
    experimental: false,
    module: simplifyIfStatementsModule,
    matcherExport: 'simplifyIfStatementsMatch',
    transformExport: 'simplifyIfStatementsTransform',
  },
  {
    id: 'redundant-logical-expressions',
    title: 'Redundant Logical Expressions',
    category: 'conditionals',
    description: 'Matches logical expressions with statically redundant branches.',
    tags: ['conditionals', 'logical', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: resolveRedundantLogicalExpressionsModule,
    matcherExport: 'resolveRedundantLogicalExpressionsMatch',
    transformExport: 'resolveRedundantLogicalExpressionsTransform',
  },
  {
    id: 'boolean-expressions-to-if',
    title: 'Boolean Expressions to If',
    category: 'conditionals',
    description: 'Matches boolean-expression control flow that is clearer as an `if` statement.',
    tags: ['conditionals', 'boolean', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: replaceBooleanExpressionsWithIfModule,
    matcherExport: 'replaceBooleanExpressionsWithIfMatch',
    transformExport: 'replaceBooleanExpressionsWithIfTransform',
  },
  {
    id: 'rearrange-sequences',
    title: 'Sequence Rearrangement',
    category: 'sequences',
    description: 'Matches sequence expressions that can be expanded into a clearer order.',
    tags: ['sequences', 'cleanup', 'expressions'],
    browserSafe: true,
    experimental: false,
    module: rearrangeSequencesModule,
    matcherExport: 'rearrangeSequencesMatch',
    transformExport: 'rearrangeSequencesTransform',
  },
  {
    id: 'replace-sequences-with-expressions',
    title: 'Sequence Expressions',
    category: 'sequences',
    description: 'Matches sequence constructs that can be replaced with standalone expressions.',
    tags: ['sequences', 'expressions', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: replaceSequencesWithExpressionsModule,
    matcherExport: 'replaceSequencesWithExpressionsMatch',
    transformExport: 'replaceSequencesWithExpressionsTransform',
  },
  {
    id: 'rearrange-switches',
    title: 'Switch Rearrangement',
    category: 'control-flow',
    description: 'Matches switches whose cases can be reordered into a more direct execution path.',
    tags: ['control-flow', 'switch', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: rearrangeSwitchesModule,
    matcherExport: 'rearrangeSwitchesMatch',
    transformExport: 'rearrangeSwitchesTransform',
  },
  {
    id: 'function-constructor-calls',
    title: 'Function Constructor Calls',
    category: 'calls',
    description: 'Matches `Function(...)` constructor calls with literal content that can be inlined.',
    tags: ['calls', 'functions', 'constructors'],
    browserSafe: true,
    experimental: false,
    module: resolveFunctionConstructorCallsModule,
    matcherExport: 'resolveFunctionConstructorCallsMatch',
    transformExport: 'resolveFunctionConstructorCallsTransform',
  },
  {
    id: 'member-expression-array-index',
    title: 'Array Index References',
    category: 'literals',
    description: 'Matches member expressions that resolve directly to array literal indexes.',
    tags: ['arrays', 'member-expressions', 'literals'],
    browserSafe: true,
    experimental: false,
    module: resolveMemberExpressionReferencesToArrayIndexModule,
    matcherExport: 'resolveMemberExpressionReferencesToArrayIndexMatch',
    transformExport: 'resolveMemberExpressionReferencesToArrayIndexTransform',
  },
  {
    id: 'member-expression-direct-assignment',
    title: 'Direct Member Assignments',
    category: 'variables',
    description: 'Matches member expressions that can be resolved from direct assignments.',
    tags: ['member-expressions', 'assignments', 'variables'],
    browserSafe: true,
    experimental: false,
    module: resolveMemberExpressionsWithDirectAssignmentModule,
    matcherExport: 'resolveMemberExpressionsWithDirectAssignmentMatch',
    transformExport: 'resolveMemberExpressionsWithDirectAssignmentTransform',
  },
  {
    id: 'normalize-computed-members',
    title: 'Computed Members',
    category: 'cleanup',
    description: 'Matches computed property access that can be normalized to dot syntax.',
    tags: ['cleanup', 'member-expressions', 'syntax'],
    browserSafe: true,
    experimental: false,
    module: normalizeComputedModule,
    matcherExport: 'normalizeComputedMatch',
    transformExport: 'normalizeComputedTransform',
  },
  {
    id: 'normalize-empty-statements',
    title: 'Empty Statements',
    category: 'cleanup',
    description: 'Matches empty statements and redundant semicolons.',
    tags: ['cleanup', 'statements', 'syntax'],
    browserSafe: true,
    experimental: false,
    module: normalizeEmptyStatementsModule,
    matcherExport: 'normalizeEmptyStatementsMatch',
    transformExport: 'normalizeEmptyStatementsTransform',
  },
  {
    id: 'remove-redundant-blocks',
    title: 'Redundant Blocks',
    category: 'cleanup',
    description: 'Matches block statements that can be safely removed without changing control flow.',
    tags: ['cleanup', 'blocks', 'syntax'],
    browserSafe: true,
    experimental: false,
    module: removeRedundantBlockStatementsModule,
    matcherExport: 'removeRedundantBlockStatementsMatch',
    transformExport: 'removeRedundantBlockStatementsTransform',
  },
  {
    id: 'separate-chained-declarators',
    title: 'Chained Declarators',
    category: 'cleanup',
    description: 'Matches declarations that can be split into simpler standalone declarations.',
    tags: ['cleanup', 'declarations', 'variables'],
    browserSafe: true,
    experimental: false,
    module: separateChainedDeclaratorsModule,
    matcherExport: 'separateChainedDeclaratorsMatch',
    transformExport: 'separateChainedDeclaratorsTransform',
  },
  {
    id: 'simplify-calls',
    title: 'Simplify Calls',
    category: 'calls',
    description: 'Matches call expressions that can be simplified without evaluation.',
    tags: ['calls', 'cleanup', 'expressions'],
    browserSafe: true,
    experimental: false,
    module: simplifyCallsModule,
    matcherExport: 'simplifyCallsMatch',
    transformExport: 'simplifyCallsTransform',
  },
  {
    id: 'replace-call-expressions-with-unwrapped-identifier',
    title: 'Unwrapped Call Identifiers',
    category: 'calls',
    description: 'Matches call expressions that can be replaced with a direct identifier reference.',
    tags: ['calls', 'identifiers', 'cleanup'],
    browserSafe: true,
    experimental: false,
    module: replaceCallExpressionsWithUnwrappedIdentifierModule,
    matcherExport: 'replaceCallExpressionsWithUnwrappedIdentifierMatch',
    transformExport: 'replaceCallExpressionsWithUnwrappedIdentifierTransform',
  },
  {
    id: 'unwrap-simple-operations',
    title: 'Simple Operations',
    category: 'cleanup',
    description: 'Matches simple statically known operations that can be unwrapped structurally.',
    tags: ['cleanup', 'operations', 'expressions'],
    browserSafe: true,
    experimental: false,
    module: unwrapSimpleOperationsModule,
    matcherExport: 'unwrapSimpleOperationsMatch',
    transformExport: 'unwrapSimpleOperationsTransform',
  },
];

export const safeUtils = Object.freeze({
  areReferencesModified,
  createNewNode,
  createOrderedSrc,
  doesDescendantMatchCondition,
  generateHash,
  getCache,
  getCalleeName,
  getDeclarationWithContext,
  getDescendants,
  getMainDeclaredObjectOfMemberExpression,
  getObjType,
  isNodeInRanges,
});

export const knownStructures = Object.freeze(
  curatedStructureDefinitions.map((definition) => {
    const matcher = definition.module[definition.matcherExport] ?? null;
    const transform = definition.module[definition.transformExport] ?? null;

    return Object.freeze({
      id: definition.id,
      title: definition.title,
      category: definition.category,
      description: definition.description,
      tags: Object.freeze([...definition.tags]),
      matcher,
      transform,
      transformAvailable: typeof transform === 'function',
      browserSafe: definition.browserSafe,
      experimental: definition.experimental,
    });
  }),
);

export const safeMatchers = Object.freeze(
  Object.fromEntries(
    knownStructures
      .filter((structure) => typeof structure.matcher === 'function')
      .map((structure) => [structure.id, structure.matcher]),
  ),
);

export const safeTransforms = Object.freeze(
  Object.fromEntries(
    knownStructures
      .filter((structure) => typeof structure.transform === 'function')
      .map((structure) => [structure.id, structure.transform]),
  ),
);

export const knownStructuresById = Object.freeze(
  Object.fromEntries(knownStructures.map((structure) => [structure.id, structure])),
);

export const restringerBrowser = Object.freeze({
  knownStructures,
  knownStructuresById,
  safeMatchers,
  safeTransforms,
  safeUtils,
});

export default restringerBrowser;
