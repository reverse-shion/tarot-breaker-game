// Compose the same layout patch and collision inputs loaded by official index.html.
// Keep each VM isolated: the patch mutates foreground-derived geometry once.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createCollision } = require('../../blocked-collision.js');
const data = require('../../assets/maps/star-country-gate-garden-collision.json');
function gardenRuntime() {
  const window = {};
  const document = { querySelector: () => null, head: { appendChild() {} },
    createElement: () => ({ dataset: {} }) };
  const context = vm.createContext({ window, document });
  for (const file of ['scene-layout.js', 'scene-preview41-fix.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../..', file), 'utf8'), context, { filename: file });
  }
  const layout = window.TarotSceneLayout;
  const collision = createCollision({ ...data, blockedAreas: [...data.blockedAreas, ...layout.solidBases] });
  return { layout, collision };
}
module.exports = { gardenRuntime };
