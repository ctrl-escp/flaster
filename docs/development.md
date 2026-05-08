# Development notes

## Browser debug globals

Manual debugging (console inspection) uses properties on `window`. They are **not** set on the live store module or in production builds by default.

| Global | Owner | Consumers | Notes |
| ------ | ----- | --------- | ----- |
| `window.flast` | `src/app/debugGlobals.js` | Console / external snippets in dev | Full flAST namespace plus `version` from `flast/package.json`. Runtime parsing uses `import { Arborist } from 'flast/src/arborist.js'` instead. |
| `window.restringer` | `src/app/debugGlobals.js` | Console in dev | The safe integration object (`restringerSafe`). The header shows REstringer’s version via the same adapter import (`restringerSafe.version`), not this global. |
| `window.selectedNode` | `src/app/debugGlobals.js` | Console in dev | Initialized to `null`; assign in the console when useful. |
| `window.store` | `src/app/debugGlobals.js` | Console in dev | The reactive app store singleton. |

### When globals are installed

`installDebugGlobals()` runs from `src/main.js` and attaches the table above only when **either**:

* `import.meta.env.DEV` is true (local `vite` dev server), or  
* `import.meta.env.VITE_DEBUG_GLOBALS` is the string `'true'` (optional; set in `.env` / `.env.production.local` if you need globals in a preview or production build).

Otherwise the function returns immediately and nothing is assigned to `window` for flASTer debug.
