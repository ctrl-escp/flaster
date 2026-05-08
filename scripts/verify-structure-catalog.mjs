import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {validateKnownStructureCatalogRegistry} from '../src/domain/structures/structureDefinition.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const catalogHref = pathToFileURL(path.join(projectRoot, 'src/integrations/restringer/catalog.js')).href;

const catalogModule = await import(catalogHref);

if (!Array.isArray(catalogModule.knownStructureRegistry)) {
  throw new Error('catalog module must export knownStructureRegistry array');
}

validateKnownStructureCatalogRegistry(catalogModule.knownStructureRegistry);

console.log('Structure catalog verification passed.');
