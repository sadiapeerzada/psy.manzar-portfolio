/* Validate the generated public filesystem and the portfolio's launch targets. */
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const ini = require("ini");

const root = "public";
const indexPath = join(root, ".index/fs.9p.json");
const shortcutCachePath = join(root, ".index/shortcutCache.json");
const requiredImages = [
  "blue-sneakers.webp",
  "green-canopy.webp",
  "amu-campus.webp",
  "sunlit-walkway.webp",
];
const gameAssets = [
  "Browser/dino/index.html",
  "Browser/dino/index.js",
  "Chess/chessboard2.min.css",
  "ClassiCube/ClassiCube.js",
  "DX-Ball/game.js",
  "Quake3/Quake3Game.js",
  "Quake3/Quake3Game.pk3",
  "SpaceCadet/SpaceCadetPinball.js",
  "SpaceCadet/SpaceCadetPinball.wasm",
  "js-dos/emulators.js",
  "js-dos/emulators-ui.js",
  "js-dos/wdosbox.wasm",
];

const publicFile = (filePath) => join(root, filePath);
const mustExist = (filePath) =>
  assert(existsSync(publicFile(filePath)), `Missing public asset: ${filePath}`);
const mustNotExist = (filePath) =>
  assert(!existsSync(publicFile(filePath)), `Removed item remains: ${filePath}`);

for (const name of requiredImages) mustExist(`Users/Public/Life/${name}`);
for (const name of gameAssets) mustExist(`Program Files/${name}`);
mustExist("System/Icons/instagram.svg");
mustExist("System/Icons/doom.svg");

for (const path of [
  "Users/Public/Start Menu/IRC.url",
  "Users/Public/Start Menu/Blogs.url",
  "Users/Public/Desktop/Blogs.url",
  "Users/Public/Blogs",
]) mustNotExist(path);

const readShortcut = (path) => {
  const shortcut = ini.parse(readFileSync(publicFile(path), "utf8"));
  assert(shortcut.InternetShortcut, `Bad shortcut file: ${path}`);
  return shortcut.InternetShortcut;
};
const insta = readShortcut("Users/Public/Start Menu/Instagram.url");
assert.equal(insta.BaseURL, "Messenger"); // Internal ID for the Instagram app
assert.equal(insta.IconFile, "/System/Icons/instagram.svg");

for (const dir of ["Desktop", "Start Menu/Games"]) {
  const doom = readShortcut(`Users/Public/${dir}/DOOM.url`);
  assert.equal(doom.BaseURL, "ExternalURL");
  assert.equal(doom.URL, "https://silentspacemarine.com/");
  assert.equal(doom.IconFile, "/System/Icons/doom.svg");
}

const index = JSON.parse(readFileSync(indexPath, "utf8"));
const shortcuts = JSON.parse(readFileSync(shortcutCachePath, "utf8"));
assert.equal(index.version, 4);
const indexed = (path) => {
  let entries = index.fsroot;
  for (const segment of path.split("/").filter(Boolean)) {
    const next = entries.find((item) => item[0] === segment);
    if (!next) return false;
    entries = Array.isArray(next[3]) ? next[3] : [];
  }
  return true;
};

for (const photo of requiredImages) {
  assert(indexed(`/Users/Public/Life/${photo}`), `Photo absent in generated filesystem index: ${photo}`);
}
for (const path of [
  "/Users/Public/Desktop/DOOM.url",
  "/Users/Public/Start Menu/Instagram.url",
  "/Users/Public/Start Menu/Games/DOOM.url",
]) assert(indexed(path), `Shortcut not indexed: ${path}`);
assert(!indexed("/Users/Public/Blogs"), "Blogs folder appears in generated index");
assert(!indexed("/Users/Public/Start Menu/IRC.url"), "IRC appears in generated index");
assert.equal(shortcuts["/Users/Public/Start Menu"]?.["Instagram.url"]?.IconFile, "/System/Icons/instagram.svg");
assert.equal(shortcuts["/Users/Public/Desktop"]?.["DOOM.url"]?.BaseURL, "ExternalURL");

console.info("Portfolio assets, shortcuts, and generated filesystem indexes: OK");
