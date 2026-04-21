/** @jsxImportSource react */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import OgImageTemplate from "@/lib/OgImageTemplate";
import { initSatoriEngine, renderSatoriToPng } from "@/lib/satori-core";

const require = createRequire(import.meta.url);
const yogaWasmPath = require.resolve("satori/yoga.wasm");
const resvgWasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
const sansFontPath = join(process.cwd(), "public/fonts/LXGWNeoXiHei-Regular.ttf");
const serifFontPath = join(process.cwd(), "public/fonts/LXGWWenKai-Regular.ttf");

let engineInitPromise: Promise<void> | null = null;
let fontDataPromise: Promise<{ sans: ArrayBuffer; serif: ArrayBuffer }> | null = null;

async function ensureEnginesReady() {
  if (!engineInitPromise) {
    engineInitPromise = (async () => {
      const [yogaWasm, resvgWasm] = await Promise.all([
        readFile(yogaWasmPath),
        readFile(resvgWasmPath),
      ]);
      await initSatoriEngine(yogaWasm, resvgWasm);
    })();
  }
  await engineInitPromise;
}

async function loadFonts() {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const [sans, serif] = await Promise.all([readFile(sansFontPath), readFile(serifFontPath)]);
      return {
        sans: sans.buffer.slice(0) as ArrayBuffer,
        serif: serif.buffer.slice(0) as ArrayBuffer,
      };
    })();
  }
  return fontDataPromise;
}

export async function renderOgPng(code: string, label: string) {
  await ensureEnginesReady();
  const fonts = await loadFonts();

  return renderSatoriToPng(
    <OgImageTemplate code={code} label={label} />,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "LXGW Neo XiHei", data: fonts.sans, weight: 400, style: "normal" as const },
        { name: "LXGW WenKai", data: fonts.serif, weight: 400, style: "normal" as const },
      ],
    },
    { fitTo: { mode: "original" } }
  );
}
