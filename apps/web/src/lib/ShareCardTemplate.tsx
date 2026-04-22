import { dimensions, MAX_REACHABLE_POSTERIOR } from "@vcti/shared/domain/vcti";
import type { AssessmentResult, DimensionId } from "@vcti/shared/domain/vcti/types";
import { DIMENSION_COLORS, withAlpha } from "@vcti/shared/lib/colors";

const BAR_SIDE_PADDING_PX = 3;
const BAR_SOLID_HEIGHT_PX = 10;
const BAR_UNCERTAINTY_HEIGHT_PX = 8;
const CONTAINER_HEIGHT_PX = 16;

// Inset from container edge so uncertainty bar's endpoint circle center
// aligns with container's endpoint circle center at maximum extent.
// Container r=8, bar r=4 → inset = 8 - 4 = 4px
const UNCERTAINTY_TRACK_INSET_PX = CONTAINER_HEIGHT_PX / 2 - BAR_UNCERTAINTY_HEIGHT_PX / 2;

function tone(dimensionId: DimensionId, leaning: "left" | "right", alpha = 1) {
  return withAlpha(DIMENSION_COLORS[dimensionId][leaning], alpha);
}

function splitWords(value: string, maxChars: number) {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
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

function barGeometry(
  leaning: "left" | "right",
  purity: number,
  posterior: number,
  trackWidth: number,
  variance: number
) {
  const innerTrackWidth = trackWidth - BAR_SIDE_PADDING_PX * 2;
  const half = innerTrackWidth / 2;
  const fillPixels = half * purity;
  const uncertaintyRange = getUncertaintyRange(posterior, variance);
  const uncertaintyStart = uncertaintyRange.start * half;
  const uncertaintyEnd = uncertaintyRange.end * half;

  // When the bar would be narrower than its height, draw a centered circle instead.
  let fillLeft: number;
  let fillWidth: number;
  if (fillPixels < BAR_SOLID_HEIGHT_PX / 2) {
    fillLeft = BAR_SIDE_PADDING_PX + half - BAR_SOLID_HEIGHT_PX / 2;
    fillWidth = BAR_SOLID_HEIGHT_PX;
  } else if (leaning === "left") {
    fillLeft = BAR_SIDE_PADDING_PX + (half - fillPixels);
    fillWidth = fillPixels + BAR_SOLID_HEIGHT_PX / 2;
  } else {
    fillLeft = BAR_SIDE_PADDING_PX + half - BAR_SOLID_HEIGHT_PX / 2;
    fillWidth = fillPixels + BAR_SOLID_HEIGHT_PX / 2;
  }

  const rawUncertaintyLeft =
    BAR_SIDE_PADDING_PX + half + uncertaintyStart - BAR_UNCERTAINTY_HEIGHT_PX / 2;
  const rawUncertaintyRight =
    rawUncertaintyLeft + (uncertaintyEnd - uncertaintyStart + BAR_UNCERTAINTY_HEIGHT_PX / 2);
  const minUncertaintyX = UNCERTAINTY_TRACK_INSET_PX;
  const maxUncertaintyX = trackWidth - UNCERTAINTY_TRACK_INSET_PX;
  const clampedUncertaintyLeft = Math.max(minUncertaintyX, rawUncertaintyLeft);
  const clampedUncertaintyRight = Math.min(maxUncertaintyX, rawUncertaintyRight);

  return {
    fillLeft,
    fillWidth,
    uncertaintyLeft: clampedUncertaintyLeft,
    uncertaintyWidth: clampedUncertaintyRight - clampedUncertaintyLeft,
  };
}

function splitChars(value: string, maxChars: number) {
  const lines: string[] = [];
  let current = "";
  for (const char of value) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function ShareCardTemplate({
  result,
  archetypeDataUrl,
  questionnaireQrDataUrl,
}: {
  result: AssessmentResult;
  archetypeDataUrl: string;
  questionnaireQrDataUrl: string;
}) {
  const summaryLines = splitChars(result.profile.summary, 15).slice(0, 3);
  const qrLines = splitWords("测测你是哪种类型的 Vibe Coder", 11);
  const leftColumnWidth = 274;
  const rightColumnWidth = 530;
  const trackWidth = 482;

  return (
    <div
      style={{
        width: "960px",
        height: "760px",
        display: "flex",
        backgroundColor: "#f3f1ee",
        padding: "32px",
        boxSizing: "border-box",
        fontFamily: "LXGW Neo XiHei",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "32px",
          padding: "32px",
          boxSizing: "border-box",
          gap: "28px",
        }}
      >
        <div
          style={{
            width: `${leftColumnWidth}px`,
            height: "632px",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: "36px",
              padding: "0 18px",
              borderRadius: "999px",
              backgroundColor: "#f5f2ef",
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.7px",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            VCTI Result
          </div>

          <div
            style={{
              marginTop: "22px",
              width: "220px",
              height: "220px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={archetypeDataUrl} width={220} height={220} alt={result.profile.chineseName} />
          </div>

          <div
            style={{
              marginTop: "26px",
              fontFamily: "LXGW WenKai",
              fontSize: "54px",
              lineHeight: 0.94,
              width: `${leftColumnWidth}px`,
            }}
          >
            {result.profile.code}
          </div>
          <div
            style={{
              marginTop: "8px",
              fontFamily: "LXGW WenKai",
              fontSize: "30px",
              lineHeight: 1.18,
              width: `${leftColumnWidth}px`,
              height: "72px",
              display: "flex",
            }}
          >
            {result.profile.chineseName}
          </div>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              color: "#4e4e4e",
              fontSize: "16px",
              lineHeight: 1.5,
              height: "86px",
              width: `${leftColumnWidth}px`,
            }}
          >
            {summaryLines.map((line) => (
              <div key={line} style={{ marginTop: line === summaryLines[0] ? "0" : "6px" }}>
                {line}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "auto",
              width: `${leftColumnWidth}px`,
              height: "118px",
              borderRadius: "24px",
              backgroundColor: "#f6f6f6",
              padding: "16px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                width: "86px",
                height: "86px",
                borderRadius: "18px",
                backgroundColor: "#ffffff",
                padding: "8px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={questionnaireQrDataUrl}
                width={70}
                height={70}
                alt="VCTI questionnaire QR code"
              />
            </div>
            <div
              style={{
                width: "144px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.24px",
                  textTransform: "uppercase",
                  color: "#777169",
                  lineHeight: 1,
                }}
              >
                Scan To Test
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "16px",
                  lineHeight: 1.45,
                  marginTop: "10px",
                }}
              >
                {qrLines.map((line) => (
                  <div key={line} style={{ marginTop: line === qrLines[0] ? "0" : "4px" }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            width: `${rightColumnWidth}px`,
            height: "632px",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {dimensions.map((dimension, index) => {
            const score = result.dimensionScores[dimension.id];
            const geometry = barGeometry(
              score.leaning,
              score.purity,
              score.posterior,
              trackWidth,
              score.variance
            );
            return (
              <div
                key={dimension.id}
                style={{
                  backgroundColor: "#f6f6f6",
                  borderRadius: "24px",
                  padding: "20px 24px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  width: `${rightColumnWidth}px`,
                  height: "146px",
                  marginTop: index === 0 ? "0" : "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ color: "#777169", fontSize: "13px" }}>{dimension.name}</div>
                    <div style={{ fontSize: "22px", lineHeight: 1.18, marginTop: "4px" }}>
                      {score.leaning === "left" ? dimension.leftLabel : dimension.rightLabel}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "72px",
                      height: "34px",
                      borderRadius: "17px",
                      backgroundColor: tone(dimension.id, score.leaning, 0.16),
                      color: tone(dimension.id, score.leaning),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      fontWeight: 700,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    {Math.round(score.purity * 100)}%
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    width: `${trackWidth}px`,
                    height: "16px",
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    marginTop: "18px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: `${trackWidth / 2 - 1}px`,
                      top: "0",
                      width: "2px",
                      height: "16px",
                      backgroundColor: "#c9c4be",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: `${(16 - BAR_UNCERTAINTY_HEIGHT_PX) / 2}px`,
                      left: `${geometry.uncertaintyLeft}px`,
                      width: `${geometry.uncertaintyWidth}px`,
                      height: `${BAR_UNCERTAINTY_HEIGHT_PX}px`,
                      borderRadius: `${BAR_UNCERTAINTY_HEIGHT_PX / 2}px`,
                      backgroundColor: tone(dimension.id, score.leaning, 0.22),
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: `${(16 - BAR_SOLID_HEIGHT_PX) / 2}px`,
                      left: `${geometry.fillLeft}px`,
                      width: `${geometry.fillWidth}px`,
                      height: `${BAR_SOLID_HEIGHT_PX}px`,
                      borderRadius: `${BAR_SOLID_HEIGHT_PX / 2}px`,
                      backgroundColor: tone(dimension.id, score.leaning, 0.92),
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#777169",
                    fontSize: "12px",
                    marginTop: "12px",
                    width: `${trackWidth}px`,
                  }}
                >
                  <div>{dimension.leftFullName}</div>
                  <div>{dimension.rightFullName}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
