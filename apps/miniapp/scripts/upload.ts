import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const envPath = path.resolve(ROOT, "../../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const appid = process.env.TARO_APP_ID;
if (!appid) {
  console.error("❌ TARO_APP_ID not found. Set it in .env or as an environment variable.");
  process.exit(1);
}

const privateKeyPath = path.resolve(ROOT, "private.key");
if (!fs.existsSync(privateKeyPath)) {
  console.error(
    "❌ private.key not found at",
    privateKeyPath,
    "\n   Download it from WeChat Mini Program admin → Development → Development Settings → Generate private key."
  );
  process.exit(1);
}

const projectPath = path.resolve(ROOT, "dist");
if (!fs.existsSync(projectPath)) {
  console.error("❌ dist/ not found. Run `just build-miniapp` first.");
  process.exit(1);
}

async function main() {
  const { Project, upload } = await import("miniprogram-ci");

  const project = new Project({
    appid,
    type: "miniProgram",
    projectPath,
    privateKeyPath,
    ignores: ["node_modules/**/*"],
  });

  const version = process.env.MINIAPP_VERSION;
  if (!version) {
    console.error("❌ MINIAPP_VERSION not found. Set it in .env or as an environment variable.");
    process.exit(1);
  }

  const desc = process.env.MINIAPP_DESC || `VCTI release v${version}`;

  console.log(`📤 Uploading release v${version}...`);
  const result = await upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      es7: true,
      minified: true,
    },
    robot: process.env.MINIAPP_ROBOT ? Number(process.env.MINIAPP_ROBOT) : 1,
  });

  console.log("✅ Release uploaded successfully!");
  console.log(`   Version: ${version}`);
  console.log(`   Description: ${desc}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Upload failed:", err.message);
  process.exit(1);
});
