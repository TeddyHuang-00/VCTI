/** @jsxImportSource react */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import satori, { init as initSatori } from "satori/standalone";

import OgImageTemplate from "@/lib/OgImageTemplate";

let engineInitPromise: Promise<void> | null = null;
let fontDataPromise: Promise<{
  sans: ArrayBuffer;
  serif: ArrayBuffer;
}> | null = null;
const require = createRequire(import.meta.url);
const yogaWasmPath = require.resolve("satori/yoga.wasm");
const resvgWasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
const sansFontPath = join(process.cwd(), "public/fonts/LXGWNeoXiHei-Regular.ttf");
const serifFontPath = join(process.cwd(), "public/fonts/LXGWWenKai-Regular.ttf");

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function ensureEnginesReady() {
  if (!engineInitPromise) {
    engineInitPromise = (async () => {
      const yogaWasm = await readFile(yogaWasmPath);
      const resvgWasm = await readFile(resvgWasmPath);
      await initSatori(yogaWasm);
      await initWasm(resvgWasm);
    })();
  }

  await engineInitPromise;
}

async function loadFonts() {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const sans = toArrayBuffer(await readFile(sansFontPath));
      const serif = toArrayBuffer(await readFile(serifFontPath));

      return { sans, serif };
    })();
  }

  const fonts = fontDataPromise;
  if (!fonts) {
    throw new Error("Font loading was not initialized");
  }

  return fonts;
}

export async function renderOgPng(code: string, label: string) {
  await ensureEnginesReady();
  const fonts = await loadFonts();

  const svg = await satori(<OgImageTemplate code={code} label={label} />, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "LXGW Neo XiHei",
        data: fonts.sans,
        weight: 400,
        style: "normal",
      },
      {
        name: "LXGW WenKai",
        data: fonts.serif,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "original",
    },
  });

  return resvg.render().asPng();
}
