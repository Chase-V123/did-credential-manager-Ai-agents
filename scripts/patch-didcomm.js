/**
 * Patches the didcomm package to add "type": "module" to its package.json.
 *
 * The didcomm package ships ESM-only index.js but omits "type": "module",
 * causing Node's CJS loader to fail on the WASM import. This postinstall
 * script fixes that after every npm install.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../node_modules/didcomm/package.json');

try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.type !== 'module') {
    pkg.type = 'module';
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log('✅ patched didcomm package.json (added "type": "module")');
  }
} catch (err) {
  console.warn('⚠️  Could not patch didcomm:', err.message);
}
