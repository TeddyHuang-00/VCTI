import { initWasm, Resvg } from "@resvg/resvg-wasm";
import satori, { init as initSatori } from "satori/standalone";

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
}

let initPromise: Promise<void> | null = null;

export function initSatoriEngine(yogaWasm: Uint8Array, resvgWasm: Uint8Array): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await initSatori(yogaWasm);
      await initWasm(resvgWasm);
    })();
  }
  return initPromise;
}

export async function renderSatoriToPng(
  element: Parameters<typeof satori>[0],
  options: { width: number; height: number; fonts: SatoriFont[] },
  resvgOptions: ConstructorParameters<typeof Resvg>[1] = {}
): Promise<Uint8Array> {
  const svg = await satori(element, options);
  const resvg = new Resvg(svg, resvgOptions);
  return resvg.render().asPng();
}
