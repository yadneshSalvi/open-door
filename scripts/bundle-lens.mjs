import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("lens-src",{recursive:true});
await build({entryPoints:["src/engine/lens-entry.ts"],outfile:"lens-src/OpenDoorCore.js",bundle:true,platform:"neutral",mainFields:["module","main"],format:"cjs",target:"es2019",minify:false,banner:{js:"// Generated from the tested Open Door TypeScript engine. Run npm run lens:bundle.\n// Spatial values are metres; use roomToLens at the display boundary."}});
console.log("Bundled portable engine to lens-src/OpenDoorCore.js");
