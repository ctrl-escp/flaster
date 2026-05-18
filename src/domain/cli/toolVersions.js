import {createRequire} from 'node:module';
import flastPackage from 'flast/package.json' with {type: 'json'};

const require = createRequire(import.meta.url);
const {version: flasterVersion} = require('../../../package.json');
const {version: restringerVersion} = require('restringer/package.json');

/**
 * @returns {{ flaster: string, flast: string, restringer: string }}
 */
export function getToolVersions() {
  return {
    flaster: flasterVersion,
    flast: flastPackage.version,
    restringer: restringerVersion,
  };
}
