import { dimensions, MAX_REACHABLE_POSTERIOR } from "@vcti/shared/domain/vcti";
import type { AssessmentResult, DimensionId } from "@vcti/shared/domain/vcti/types";
import { DIMENSION_COLORS, hexToRgb } from "@vcti/shared/lib/colors";

const W = 375;
const H = 600;
const PAD = 16;
const CR = 20;
const BAR_SH = 10;
const BAR_UH = 8;
const BAR_TRACK_H = BAR_SH + 6; // 16
const UNCERTAINTY_TRACK_INSET = BAR_TRACK_H / 2 - BAR_UH / 2; // 8 - 4 = 4

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fillRR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string
) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function tone(dim: DimensionId, side: "left" | "right", alpha: number): string {
  const [r, g, b] = hexToRgb(DIMENSION_COLORS[dim][side]);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getUncertaintyRange(posterior: number, variance: number) {
  const purity = Math.abs(posterior) / MAX_REACHABLE_POSTERIOR;
  const n = 5;
  const obsVarFloor = 0.1;
  const obsVar = Math.max(variance, obsVarFloor);
  const posteriorVar = 1 / (1 + n / obsVar);
  const posteriorSD = Math.sqrt(posteriorVar);
  const spread = posteriorSD / MAX_REACHABLE_POSTERIOR;
  return {
    start: purity - spread,
    end: purity + spread,
  };
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  dimId: DimensionId,
  leaning: "left" | "right",
  posterior: number,
  variance: number
) {
  const midX = x + w / 2;
  const half = w / 2;
  const pos = (Math.abs(posterior) / MAX_REACHABLE_POSTERIOR) * half;
  const range = getUncertaintyRange(posterior, variance);
  const trackH = BAR_SH + 6;

  fillRR(ctx, x, y, w, trackH, trackH / 2, "#f3f1ee");
  ctx.fillStyle = "#c9c4be";
  ctx.fillRect(midX - 0.5, y, 1, trackH);

  // Uncertainty bar — range.start can be negative (extends to both sides of center)
  const uy = y + (trackH - BAR_UH) / 2;
  const rawUx = x + half + range.start * half;
  const rawUw = (range.end - range.start) * half;
  const minUx = x + UNCERTAINTY_TRACK_INSET;
  const maxUx = x + w - UNCERTAINTY_TRACK_INSET;
  const clampedUx = Math.max(minUx, rawUx);
  const clampedUw = Math.min(maxUx, rawUx + rawUw) - clampedUx;
  fillRR(ctx, clampedUx, uy, clampedUw, BAR_UH, BAR_UH / 2, tone(dimId, leaning, 0.26));

  // Solid bar — when width < height, draw a centered circle instead
  const sy = y + (trackH - BAR_SH) / 2;
  if (pos < BAR_SH / 2) {
    fillRR(ctx, midX - BAR_SH / 2, sy, BAR_SH, BAR_SH, BAR_SH / 2, tone(dimId, leaning, 0.92));
  } else if (leaning === "left") {
    const sx = midX - pos;
    fillRR(ctx, sx, sy, pos + BAR_SH / 2, BAR_SH, BAR_SH / 2, tone(dimId, leaning, 0.92));
  } else {
    fillRR(
      ctx,
      midX - BAR_SH / 2,
      sy,
      pos + BAR_SH / 2,
      BAR_SH,
      BAR_SH / 2,
      tone(dimId, leaning, 0.92)
    );
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 0 && ctx.measureText(result + "…").width > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + "…";
}

function loadCanvasImage(canvas: HTMLCanvasElement, src: string): Promise<CanvasImageSource> {
  // WeChat Canvas 2D API (weapp)
  if (typeof (canvas as any).createImage === "function") {
    const img = (canvas as any).createImage() as CanvasImageSource & {
      onload: () => void;
      onerror: () => void;
    };
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  // Standard browser API (h5)
  const img = new Image();
  img.crossOrigin = "anonymous";
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface RenderOptions {
  result: AssessmentResult;
  archetypePath: string;
  miniappCodePath?: string;
}

export async function renderShareCard(
  canvas: HTMLCanvasElement,
  dpr: number,
  options: RenderOptions
): Promise<void> {
  const { result, archetypePath, miniappCodePath } = options;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.textBaseline = "top";

  // Background
  ctx.fillStyle = "#f3f1ee";
  ctx.fillRect(0, 0, W, H);

  // White card
  fillRR(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, CR, "#ffffff");

  const cx = PAD + 16;
  const cw = W - (PAD + 16) * 2;
  let cy = PAD + 16;

  // ── Badge ──
  ctx.font = '600 11px "PingFang SC", "Helvetica Neue", sans-serif';
  const badgeText = "VCTI";
  const badgeW = ctx.measureText(badgeText).width + 18;
  const badgeH = 22;
  fillRR(ctx, cx, cy, badgeW, badgeH, badgeH / 2, "#f5f2ef");
  ctx.fillStyle = "#000";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, cx + 9, cy + badgeH / 2);
  ctx.textBaseline = "top";
  cy += badgeH + 10;

  // ── Mini program code (top-right) ──
  const codeSize = 78;
  let codeImg: CanvasImageSource | null = null;
  if (miniappCodePath) {
    try {
      codeImg = await loadCanvasImage(canvas, miniappCodePath);
    } catch {
      // skip on load failure
    }
  }

  // ── Profile: archetype image + code + name ──
  const imgSize = 68;
  const archetypeImg = await loadCanvasImage(canvas, archetypePath);

  // Draw code image at top-right corner
  if (codeImg) {
    const codeX = cx + cw - codeSize;
    const codeY = PAD + 16;
    rr(ctx, codeX, codeY, codeSize, codeSize, 8);
    ctx.save();
    ctx.clip();
    ctx.drawImage(codeImg, codeX, codeY, codeSize, codeSize);
    ctx.restore();

    // Caption below QR code
    ctx.font = '400 10px "PingFang SC", sans-serif';
    ctx.fillStyle = "#777169";
    ctx.textAlign = "center";
    ctx.fillText("测测你的VCTI", codeX + codeSize / 2, codeY + codeSize + 6);
    ctx.textAlign = "left";
  }

  rr(ctx, cx, cy, imgSize, imgSize, 12);
  ctx.save();
  ctx.clip();
  ctx.drawImage(archetypeImg, cx, cy, imgSize, imgSize);
  ctx.restore();

  const tx = cx + imgSize + 12;
  ctx.font = '700 30px "PingFang SC", "Helvetica Neue", sans-serif';
  ctx.fillStyle = "#000";
  ctx.fillText(result.profile.code, tx, cy + 2);

  ctx.font = '400 15px "PingFang SC", sans-serif';
  ctx.fillStyle = "#4e4e4e";
  ctx.fillText(result.profile.chineseName, tx, cy + 38);

  cy += imgSize + 10;

  // ── Quote ──
  ctx.font = '400 13px "PingFang SC", sans-serif';
  ctx.fillStyle = "#777169";
  const quoteText = truncateText(ctx, `"${result.profile.quote}"`, cw);
  ctx.fillText(quoteText, cx, cy);
  cy += 18;

  // ── Dimension cards ──
  const CARD_H = 88;
  const CARD_GAP = 14;

  for (let i = 0; i < dimensions.length; i++) {
    const dim = dimensions[i];
    const score = result.dimensionScores[dim.id];
    const iy = cy + i * (CARD_H + CARD_GAP);

    fillRR(ctx, cx, iy, cw, CARD_H, 12, "#f6f6f6");

    // Name
    ctx.font = '500 12px "PingFang SC", sans-serif';
    ctx.fillStyle = "#777169";
    ctx.textBaseline = "top";
    ctx.fillText(dim.name, cx + 12, iy + 12);

    // Purity badge
    const purityText = `${Math.round(score.purity * 100)}%`;
    ctx.font = '600 11px "PingFang SC", sans-serif';
    const bpw = ctx.measureText(purityText).width + 14;
    const bph = 20;
    fillRR(ctx, cx + cw - 12 - bpw, iy + 11, bpw, bph, bph / 2, tone(dim.id, score.leaning, 0.16));
    ctx.fillStyle = tone(dim.id, score.leaning, 1);
    ctx.textBaseline = "middle";
    ctx.fillText(purityText, cx + cw - 12 - bpw + 7, iy + 11 + bph / 2);
    ctx.textBaseline = "top";

    // Value label
    ctx.font = '500 13px "PingFang SC", sans-serif';
    ctx.fillStyle = "#000";
    const valueText = `${score.letter} · ${score.leaning === "left" ? dim.leftLabel : dim.rightLabel}`;
    ctx.fillText(valueText, cx + 12, iy + 32);

    // Bar
    const barY = iy + 52;
    const barW = cw - 24;
    drawBar(ctx, cx + 12, barY, barW, dim.id, score.leaning, score.posterior, score.variance);

    // Labels
    ctx.font = '400 9px "PingFang SC", sans-serif';
    ctx.fillStyle = "#777169";
    ctx.textBaseline = "top";
    const leftLabel = truncateText(ctx, dim.leftFullName, barW / 2 - 4);
    const rightLabel = truncateText(ctx, dim.rightFullName, barW / 2 - 4);
    ctx.fillText(leftLabel, cx + 12, barY + BAR_SH + 10);
    ctx.textAlign = "right";
    ctx.fillText(rightLabel, cx + 12 + barW, barY + BAR_SH + 10);
    ctx.textAlign = "left";
  }
}

/** Draw just the mini program code image onto the canvas (for direct save). */
export async function renderMiniAppCode(
  canvas: HTMLCanvasElement,
  dpr: number,
  imagePath: string
): Promise<void> {
  const size = 258;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const img = await loadCanvasImage(canvas, imagePath);
  ctx.drawImage(img, 0, 0, size, size);
}
