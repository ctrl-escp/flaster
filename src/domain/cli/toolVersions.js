import {createRequire} from 'node:module';
import flastPackage from 'flast/package.json' with {type: 'json'};
import restringerPackage from 'restringer/package.json' with {type: 'json'};

const require = createRequire(import.meta.url);
const {version: flasterVersion} = require('../../../package.json');

/**
 * @returns {{ flaster: string, flast: string, restringer: string }}
 */
export function getToolVersions() {
  return {
    flaster: flasterVersion,
    flast: flastPackage.version,
    restringer: restringerPackage.version,
  };
}
