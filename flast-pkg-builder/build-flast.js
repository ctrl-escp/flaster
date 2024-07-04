const fs = require('node:fs');
const path = require('node:path');
const browserify = require('browserify');

let originalArbLine = '';
const replacementLine = `window.generateCode = flast.generateCode, window.generateFlatAST = flast.generateFlatAST;`;

function augmentArborist(revert = false) {
  const arbFile = __dirname + '/../node_modules/flast/src/arborist.js';
  const f = fs.readFileSync(arbFile, 'utf-8');
  const lines = f.split('\n');
  if (revert) {
    lines[0] = originalArbLine;
  } else {
    originalArbLine = lines[0];
    lines[0] = replacementLine;
  }
  fs.writeFileSync(arbFile, lines.join('\n'), 'utf-8');
  console.log(`[build-flast] ${revert ? 'Reverted' : 'Modified'} arborist.js`);
}

function buildLibraryForBrowser(filename, targetOutputFile) {
  const b = browserify();
  const timeMsg = `Created ${targetOutputFile} in`;
  console.time(timeMsg);
  b.add(filename);
  b.bundle().pipe(fs.createWriteStream(targetOutputFile));
  console.timeEnd(timeMsg);
}
augmentArborist();
buildLibraryForBrowser(__dirname + '/flast-src.js', path.resolve(__dirname + '/..' + '/public/flast.js'));
setTimeout(() => augmentArborist(true), 1000);