import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const serverDir = path.join(nextDir, "server");

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  process.stdout.write(`created ${path.relative(root, filePath)}\n`);
}

const appPathRoutesManifestPath = path.join(nextDir, "app-path-routes-manifest.json");
let appPathsManifest = {};
if (fs.existsSync(appPathRoutesManifestPath)) {
  try {
    const routes = JSON.parse(fs.readFileSync(appPathRoutesManifestPath, "utf8"));
    appPathsManifest = Object.fromEntries(
      Object.entries(routes).map(([route, routePath]) => [routePath, route]),
    );
  } catch {
    appPathsManifest = {};
  }
}

ensureFile(path.join(serverDir, "pages-manifest.json"), "{}\n");
ensureFile(path.join(serverDir, "app-paths-manifest.json"), `${JSON.stringify(appPathsManifest, null, 2)}\n`);
ensureFile(path.join(serverDir, "server-reference-manifest.json"), "{}\n");
ensureFile(path.join(serverDir, "next-font-manifest.json"), "{}\n");
ensureFile(
  path.join(serverDir, "next-font-manifest.js"),
  "self.__NEXT_FONT_MANIFEST={};\n",
);
ensureFile(
  path.join(serverDir, "middleware-build-manifest.js"),
  "self.__BUILD_MANIFEST={};self.__BUILD_MANIFEST_CB&&self.__BUILD_MANIFEST_CB();\n",
);
