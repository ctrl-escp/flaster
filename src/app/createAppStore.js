import {reactive} from 'vue';
import {createKnownStructureState} from '../integrations/restringer/matchingEngine.js';
import {createStoreBlueprint} from './store/storeBlueprint.js';

/**
 * Creates the root reactive application store (facade over domain modules).
 *
 * @param {readonly unknown[]} [structures] optional catalog override (primarily for tests)
 */
export function createAppStore(structures) {
  const knownStructureState = createKnownStructureState(structures);
  return reactive(createStoreBlueprint(knownStructureState));
}
