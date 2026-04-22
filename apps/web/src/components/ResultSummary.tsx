import { dimensions, getUncertaintyRange, MAX_REACHABLE_POSTERIOR } from "@vcti/shared/domain/vcti";
import type { AssessmentResult, DimensionId } from "@vcti/shared/domain/vcti/types";
import { DIMENSION_COLORS, withAlpha, withSaturation } from "@vcti/shared/lib/colors";

const CONTAINER_HEIGHT_PX = 16; // h-4
const BAR_SOLID_HEIGHT_PX = 10;
const BAR_UNCERTAINTY_HEIGHT_PX = 8;

function toPercent(value: number) {
  return Math.round(value * 100);
}

function toBarPosition(normalized: number) {
  const purity = Math.abs(normalized) / MAX_REACHABLE_POSTERIOR;
  return purity * 50;
}

function buildUncertaintyStyle(leaning: "left" | "right", start: number, end: number) {
  const rawLeft = leaning === "left" ? 50 - end : 50 + start;
  const rawRight = leaning === "left" ? 50 - start : 50 + end;
  const clampedLeft = Math.max(0, Math.min(100, rawLeft));
  const clampedRight = Math.max(0, Math.min(100, rawRight));
  const center = (clampedLeft + clampedRight) / 2;
  const span = Math.max(0, clampedRight - clampedLeft);

  return {
    left: `${center}%`,
    width: `${span}%`,
    transform: "translateX(-50%)",
  };
}

function buildSolidStyle(leaning: "left" | "right", end: number, minWidthPx: number) {
  const radiusPx = minWidthPx / 2;
  return {
    left: leaning === "left" ? `${50 - end}%` : `calc(50% - ${radiusPx}px)`,
    width: `max(calc(${end}% + ${radiusPx}px), ${minWidthPx}px)`,
  };
}

function toneColor(dimensionId: DimensionId, leaning: "left" | "right", purity: number, alpha = 1) {
  const [r, g, b] = withSaturation(DIMENSION_COLORS[dimensionId][leaning], 0.32 + purity * 0.68);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function DimensionBar({
  dimensionId,
  normalized,
  purity,
  leaning,
  variance,
}: {
  dimensionId: DimensionId;
  normalized: number;
  purity: number;
  leaning: "left" | "right";
  variance: number;
}) {
  const position = toBarPosition(normalized);
  const uncertaintyRange = getUncertaintyRange(normalized, variance);
  const uncertaintyStart = uncertaintyRange.start * 50;
  const uncertaintyEnd = uncertaintyRange.end * 50;
  const solidInsetPx = CONTAINER_HEIGHT_PX / 2 - BAR_SOLID_HEIGHT_PX / 2;
  const uncertaintyInsetPx = CONTAINER_HEIGHT_PX / 2 - BAR_UNCERTAINTY_HEIGHT_PX / 2;
  const solidStyle = buildSolidStyle(leaning, position, BAR_SOLID_HEIGHT_PX);
  const uncertaintyStyle = buildUncertaintyStyle(leaning, uncertaintyStart, uncertaintyEnd);

  return (
    <div className="mt-4">
      <div className="relative h-4 rounded-full bg-[#f3f1ee] shadow-inset-subtle">
        <div className="absolute top-0 left-1/2 w-px h-full -translate-x-1/2 bg-[#c9c4be]" />
        <div
          className="absolute top-1/2"
          style={{
            left: `${solidInsetPx}px`,
            right: `${solidInsetPx}px`,
            height: `${BAR_SOLID_HEIGHT_PX}px`,
            marginTop: `-${BAR_SOLID_HEIGHT_PX / 2}px`,
            overflow: "visible",
          }}
        >
          <div
            className="absolute top-0 h-full rounded-full"
            style={{
              ...solidStyle,
              background: toneColor(dimensionId, leaning, purity),
            }}
          />
        </div>

        <div
          className="absolute top-1/2"
          style={{
            left: `${uncertaintyInsetPx}px`,
            right: `${uncertaintyInsetPx}px`,
            height: `${BAR_UNCERTAINTY_HEIGHT_PX}px`,
            marginTop: `-${BAR_UNCERTAINTY_HEIGHT_PX / 2}px`,
            overflow: "hidden",
          }}
        >
          <div
            className="absolute top-0 h-full rounded-full"
            style={{
              ...uncertaintyStyle,
              background: toneColor(dimensionId, leaning, purity, 0.26),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ResultSummary({
  result,
  basePath = "/",
  captureId,
}: {
  result: AssessmentResult;
  basePath?: string;
  captureId?: string;
}) {
  return (
    <section id={captureId} className="grid gap-8">
      <div className="p-6 bg-white rounded-3xl sm:p-8 shadow-card">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-5">
            <div className="overflow-hidden mx-auto w-full aspect-square max-w-60">
              <img
                src={`${basePath}archetypes/${result.profile.imageName}`}
                alt={result.profile.chineseName}
                className="object-contain w-full h-full"
              />
            </div>
            <div>
              <h1 className="font-light text-black font-display text-[2.8rem] leading-[1.08] tracking-[-0.8px] sm:text-[3.8rem]">
                {result.profile.code} - {result.profile.chineseName}
              </h1>
              <p className="mt-3 leading-7 text-[1rem] tracking-[0.18px] text-graphite">
                {result.profile.summary}
              </p>
            </div>
            <p className="pl-4 leading-8 border-l font-display border-warmgray text-[1rem] tracking-[0.08px] text-graphite">
              "{result.profile.quote}"
            </p>
          </div>

          <div className="grid gap-4">
            {dimensions.map((dimension) => {
              const score = result.dimensionScores[dimension.id];
              return (
                <article
                  key={dimension.id}
                  className="p-5 rounded-[22px] bg-mist shadow-inset-border"
                >
                  <div className="flex gap-4 justify-between items-start">
                    <div>
                      <div className="text-[12px] tracking-[0.14px] text-warmgray">
                        {dimension.name}
                      </div>
                      <div className="mt-1 leading-7 text-black text-[1rem] tracking-[0.16px]">
                        {score.letter} ·{" "}
                        {score.leaning === "left" ? dimension.leftLabel : dimension.rightLabel}
                      </div>
                    </div>
                    <div
                      className="py-1 px-3 font-medium rounded-full text-[13px] tracking-[0.14px]"
                      style={{
                        background: withAlpha(DIMENSION_COLORS[dimension.id][score.leaning], 0.16),
                        color: DIMENSION_COLORS[dimension.id][score.leaning],
                      }}
                    >
                      {toPercent(score.purity)}%
                    </div>
                  </div>

                  <DimensionBar
                    dimensionId={dimension.id}
                    normalized={score.normalized}
                    purity={score.purity}
                    leaning={score.leaning}
                    variance={score.variance}
                  />

                  <div className="flex justify-between items-center mt-3 text-[12px] tracking-[0.14px] text-warmgray">
                    <span>{dimension.leftFullName}</span>
                    <span>{dimension.rightFullName}</span>
                  </div>

                  <details className="py-3 px-4 mt-4 bg-white group rounded-[18px] shadow-inset-subtle">
                    <summary className="flex gap-3 justify-between items-center font-medium list-none text-black cursor-pointer text-[0.94rem] tracking-[0.14px]">
                      <span>{dimension.detailTitle}</span>
                      <span
                        aria-hidden="true"
                        className="inline-flex justify-center items-center w-5 h-5 rounded-full transition-transform duration-200 shrink-0 bg-stone text-warmgray group-open:rotate-180"
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3 h-3"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M2.25 4.5L6 8.25L9.75 4.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-3 leading-7 text-[0.94rem] tracking-[0.16px] text-graphite">
                      {dimension.summary}
                    </p>
                    <p className="mt-2 leading-7 text-[0.94rem] tracking-[0.16px] text-graphite">
                      {dimension.detailBody}
                    </p>
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
