const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const client = fs.readFileSync(path.join(root, "script.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const savedLayout = {
  producer: "", producerFont: "Impact", overlayProducer: false,
  producerPosition: "-12", producerHorizontal: "0", producerNameVertical: "8",
  producerLogoHorizontal: "-6", producerSize: "145", producerLogoSize: "125", showProducer: true,
};

function clientHarness() {
  const fields = client.match(/const producerPresetConfig = \{[\s\S]*?\n\};/)[0];
  const names = [...Object.keys(savedLayout), "theme", "themeCode", "game", "gameFont", "titleSize", "gradientHeight"];
  const controls = Object.fromEntries(names.map(name => [name, {
    type: typeof savedLayout[name] === "boolean" ? "checkbox" : "text",
    value: `current-${name}`, checked: true,
  }]));
  controls.theme.value = "#be3462";
  controls.themeCode.value = "#BE3462";
  const context = { controls, updateRangeValue() {}, saveSettings() {}, updateAutoControlLocks() {},
    drawPoster() {}, openControlSection() {}, setProducerPresetStatus(message) { context.message = message; },
    setProducerLogo(data, name) { context.logo = { data, name }; }, clearProducerLogo() { context.logo = null; } };
  vm.createContext(context);
  const snapshot = client.slice(client.indexOf("function getProducerSettingsSnapshot()"), client.indexOf("// Resolved against the page URL"));
  const apply = client.slice(client.indexOf("function applyProducerPreset("), client.indexOf("async function deleteProducerPreset("));
  vm.runInContext(fields + snapshot + apply, context);
  return context;
}

test("applying an old preset restores its complete producer layout but preserves game colour and title", () => {
  const app = clientHarness();
  const unchanged = ["theme", "themeCode", "game", "gameFont", "titleSize", "gradientHeight"];
  const before = Object.fromEntries(unchanged.map(name => [name, app.controls[name].value]));
  app.applyProducerPreset({ name: "Logo only", settings: { ...savedLayout, theme: "#00ff00" },
    logo: { dataUrl: "data:image/png;base64,abc", fileName: "100hp.png" } });
  for (const [name, value] of Object.entries(savedLayout)) {
    assert.equal(typeof value === "boolean" ? app.controls[name].checked : app.controls[name].value, value, name);
  }
  assert.deepEqual(Object.fromEntries(unchanged.map(name => [name, app.controls[name].value])), before);
  assert.equal(app.logo.name, "100hp.png");
  const snapshot = app.getProducerSettingsSnapshot();
  assert.deepEqual(Object.keys(snapshot).sort(), Object.keys(savedLayout).sort());
  assert.equal(snapshot.overlayProducer, false);
  assert.equal(snapshot.producerHorizontal, "0");
});

test("a logo-only record from the identity-only release does not add fallback PRODUCER text", () => {
  const app = clientHarness();
  app.applyProducerPreset({ name: "Old minimal record", settings: { producer: "" }, logo: { dataUrl: "data:image/png;base64,abc" } });
  assert.equal(app.controls.overlayProducer.checked, false);
  assert.match(app.message, /未保存排版参数/);
});

test("server saves all producer layout values including false and zero, while excluding theme and game values", () => {
  const context = { randomUUID: () => "test-producer-id", allowedLogoDataUrlPrefixes: ["data:image/png"], Date };
  vm.createContext(context);
  vm.runInContext(server.match(/const producerSettingFields = new Set\(\[[\s\S]*?\]\);/)[0] +
    server.slice(server.indexOf("function sanitizeProducerPreset("), server.indexOf("async function listProducerPresets(")), context);
  const result = context.sanitizeProducerPreset({ name: "Hacksaw", settings: { ...savedLayout, theme: "#00ff00", game: "Wrong game" },
    logo: { dataUrl: "data:image/png;base64,abc", fileName: "logo.png" } });
  assert.deepEqual(JSON.parse(JSON.stringify(result.settings)), savedLayout);
  assert.equal(result.logo.fileName, "logo.png");
});
