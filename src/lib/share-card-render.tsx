/** @jsxImportSource react */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import satori, { init as initSatori } from "satori/standalone";
import yogaWasmUrl from "satori/yoga.wasm?url";

import type { AssessmentResult } from "@/domain/vcti/types";
import ShareCardTemplate from "@/lib/ShareCardTemplate";

const SHARE_CARD_WIDTH = 960;
const SHARE_CARD_HEIGHT = 760;
const SHARE_EXPORT_SCALE = 1.5;

let engineInitPromise: Promise<void> | null = null;
let fontDataPromise: Promise<{
  sans: ArrayBuffer;
  serif: ArrayBuffer;
}> | null = null;

async function ensureEnginesReady() {
  if (!engineInitPromise) {
    engineInitPromise = (async () => {
      const yogaWasm = await fetch(yogaWasmUrl).then((response) => response.arrayBuffer());
      const resvgWasm = await fetch(resvgWasmUrl).then((response) => response.arrayBuffer());
      await initSatori(yogaWasm);
      await initWasm(resvgWasm);
    })();
  }

  await engineInitPromise;
}

async function loadFonts(basePath: string) {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const sans = await fetch(`${basePath}fonts/LXGWNeoXiHei-Regular.ttf`).then((response) =>
        response.arrayBuffer()
      );
      const serif = await fetch(`${basePath}fonts/LXGWWenKai-Regular.ttf`).then((response) =>
        response.arrayBuffer()
      );

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

  const svg = await satori(
    <ShareCardTemplate
      result={result}
      archetypeDataUrl={archetypeDataUrl}
      questionnaireQrDataUrl={questionnaireQrDataUrl}
    />,
    {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
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
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "zoom",
      value: SHARE_EXPORT_SCALE,
    },
  });

  return resvg.render().asPng();
}
