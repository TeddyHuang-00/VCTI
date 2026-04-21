import { useEffect, useMemo, useReducer } from "react";

import {
  canCompleteQuestionnaire,
  createInitialQuestionnaireState,
  getAssessmentFromState,
  getCurrentQuestion,
  getQuestionnaireProgress,
  questionnaireReducer,
} from "@/app/questionnaire/session";
import { likertLabels, serializeDimensionScores } from "@/domain/vcti";

interface VctiAppProps {
  basePath?: string;
}

function getTone(optionValue: number) {
  if (optionValue < 0) return "bg-[#d95c4f] text-[#b04439]";
  if (optionValue > 0) return "bg-[#4e9a67] text-[#3f7d54]";
  return "bg-[#d9d5d0] text-[#7f7a73]";
}

function getDotSize(optionValue: number) {
  const sizeMap: Record<number, string> = {
    "-3": "h-6 w-6",
    "-2": "h-5 w-5",
    "-1": "h-4 w-4",
    "0": "h-3 w-3",
    "1": "h-4 w-4",
    "2": "h-5 w-5",
    "3": "h-6 w-6",
  };
  return sizeMap[optionValue] ?? "h-4 w-4";
}

function LikertDots({
  value,
  onSelect,
}: {
  value?: number;
  onSelect: (nextValue: number) => void;
}) {
  return (
    <div className="flex gap-2 justify-between items-start sm:gap-3">
        {likertLabels.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => onSelect(option.value)}
              className="flex flex-col flex-1 gap-3 items-center self-start min-w-0 group"
            >
              <span className="flex justify-center items-center w-full h-7">
                <span
                  className={`rounded-full transition-all duration-200 ${getDotSize(option.value)} ${
                    selected
                      ? "scale-110 ring-2 ring-[rgba(147,197,253,0.35)] ring-offset-2 ring-offset-white outline outline-2 outline-offset-[5px] [outline-style:dashed] outline-[rgba(147,197,253,0.2)]"
                      : "opacity-78 group-hover:scale-105 group-hover:opacity-100"
                  } ${getTone(option.value)}`}
                />
              </span>
              <span
                className={`text-center text-[11px] leading-4 tracking-[0.14px] transition-all duration-200 ${
                  selected ? "text-black font-bold" : "text-warmgray group-hover:font-bold"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
  );
}

export default function VctiApp({ basePath = "/" }: VctiAppProps) {
  const [state, dispatch] = useReducer(questionnaireReducer, undefined, () =>
    createInitialQuestionnaireState()
  );
  const progress = getQuestionnaireProgress(state);
  const currentQuestion = getCurrentQuestion(state);
  const currentValue = state.answers[currentQuestion.id];
  const canFinish = canCompleteQuestionnaire(state);
  const result = useMemo(
    () => (canFinish ? getAssessmentFromState(state) : null),
    [canFinish, state]
  );

  useEffect(() => {
    if (!state.completed || !result || typeof window === "undefined") return;
    window.location.assign(
      `${basePath}result/${result.code.toLowerCase()}?${serializeDimensionScores(result)}`
    );
  }, [basePath, result, state.completed]);

  return (
    <div className="px-4 pt-8 pb-16 mx-auto max-w-6xl sm:px-6 lg:px-8 lg:pt-10 lg:pb-24">
      <section className="space-y-5 max-w-[42rem]">
        <div className="inline-flex py-2 px-4 font-medium text-black uppercase rounded-full ring-1 bg-stone/80 text-[12px] tracking-[0.7px] shadow-warm ring-black/5">
          VCTI
        </div>
        <h1 className="font-light text-black font-display text-[3rem] leading-[1.08] tracking-[-0.96px] sm:text-[4.4rem]">
          Vibe-Coder
          <br />
          Type Indicator
        </h1>
        <p className="max-w-2xl text-[1.05rem] leading-[1.6] tracking-[0.18px] text-graphite">
          22 道题，5 分钟，破译你的编程人格暗码。
        </p>
      </section>

      <section className="p-5 mt-12 bg-white sm:p-7 rounded-[24px] shadow-card">
        <div className="flex gap-4 justify-between items-center">
          <div>
            <div className="text-[12px] tracking-[0.14px] text-warmgray">VCTI 量表</div>
            <h2 className="mt-2 font-light text-black font-display text-[2rem] leading-[1.15]">
              回答下列陈述
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "restart" })}
            className="py-2 px-4 font-medium text-black rounded-full ring-1 bg-stone/80 text-[0.94rem] shadow-warm ring-black/5"
          >
            重置
          </button>
        </div>

        <div className="overflow-hidden mt-6 rounded-full h-[6px] bg-[#f0eeea]">
          <div
            className="h-full bg-black rounded-full duration-300 transition-[width]"
            style={{ width: `${progress.ratio * 100}%` }}
          />
        </div>

        <div className="flex gap-3 justify-between items-center mt-6">
          <div className="py-2 px-4 rounded-full bg-sand text-[13px] tracking-[0.14px] text-graphite shadow-inset-border">
            Q{state.currentIndex + 1} / {state.questionOrder.length}
          </div>
          <div className="text-[13px] tracking-[0.14px] text-warmgray">
            {progress.answered} / {progress.total} 题
          </div>
        </div>

        <article className="p-5 mt-6 sm:p-7 rounded-[24px] bg-mist shadow-inset-border">
          <p className="mt-3 text-black text-[1.12rem] leading-[1.65] tracking-[0.18px]">
            {currentQuestion.prompt}
          </p>

          <div className="mt-8">
            <LikertDots
              value={currentValue}
              onSelect={(nextValue) =>
                dispatch({
                  type: "answer",
                  questionId: currentQuestion.id,
                  value: nextValue,
                })
              }
            />
          </div>
        </article>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
            onClick={() => dispatch({ type: "prev" })}
            disabled={state.currentIndex === 0}
            className="py-3 px-5 font-medium text-black bg-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-[0.94rem] shadow-btn-white"
          >
            上一题
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "next" })}
            disabled={
              currentValue === undefined || state.currentIndex >= state.questionOrder.length - 1
            }
            className="py-3 px-5 font-medium text-black bg-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-[0.94rem] shadow-btn-white"
          >
            下一题
          </button>
        </div>
      </section>
    </div>
  );
}
