/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, isMethodCall} from './common.js';

/** @param {ASTNode} n CallExpression */
export function matcher(n) {
  if (!isMethodCall(n, 'performance', 'now')) return null;
  return makeMatch(n);
}
