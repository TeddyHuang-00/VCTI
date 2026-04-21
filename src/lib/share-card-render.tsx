/** @jsxImportSource react */
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import yogaWasmUrl from "satori/yoga.wasm?url";

import type { AssessmentResult } from "@/domain/vcti/types";
import ShareCardTemplate from "@/lib/ShareCardTemplate";
import { initSatoriEngine, renderSatoriToPng } from "@/lib/satori-core";

const SHARE_CARD_WIDTH = 960;
const SHARE_CARD_HEIGHT = 760;
const SHARE_EXPORT_SCALE = 1.5;

let engineInitPromise: Promise<void> | null = null;
let fontDataPromise: Promise<{ sans: ArrayBuffer; serif: ArrayBuffer }> | null = null;

async function ensureEnginesReady() {
  if (!engineInitPromise) {
    engineInitPromise = (async () => {
      const [yogaWasm, resvgWasm] = await Promise.all([
        fetch(yogaWasmUrl).then((r) => r.arrayBuffer()),
        fetch(resvgWasmUrl).then((r) => r.arrayBuffer()),
      ]);
      await initSatoriEngine(new Uint8Array(yogaWasm), new Uint8Array(resvgWasm));
    })();
  }
  await engineInitPromise;
}

async function loadFonts(basePath: string) {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const [sans, serif] = await Promise.all([
        fetch(`${basePath}fonts/LXGWNeoXiHei-Regular.ttf`).then((r) => r.arrayBuffer()),
        fetch(`${basePath}fonts/LXGWWenKai-Regular.ttf`).then((r) => r.arrayBuffer()),
      ]);
      return { sans, serif };
    })();
  }
  return fontDataPromise;
}

export async function renderShareCardToPng({
  result,
  basePath,
  archetypeDataUrl,
  questionnaireQrDataUrl,
}: {
  result: AssessmentResult;
  basePath: string;
  archetypeDataUrl: string;
  questionnaireQrDataUrl: string;
}) {
  await ensureEnginesReady();
  const fonts = await loadFonts(basePath);

  return renderSatoriToPng(
    <ShareCardTemplate
      result={result}
      archetypeDataUrl={archetypeDataUrl}
      questionnaireQrDataUrl={questionnaireQrDataUrl}
    />,
    {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      fonts: [
        { name: "LXGW Neo XiHei", data: fonts.sans, weight: 400, style: "normal" as const },
        { name: "LXGW WenKai", data: fonts.serif, weight: 400, style: "normal" as const },
      ],
    },
    { fitTo: { mode: "zoom", value: SHARE_EXPORT_SCALE } }
  );
}
