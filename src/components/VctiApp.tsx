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
  if (optionValue < 0) {
    return "bg-[#d95c4f] text-[#b04439]";
  }
  if (optionValue > 0) {
    return "bg-[#4e9a67] text-[#3f7d54]";
  }
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
    <div className="space-y-4">
      <div className="flex gap-4 justify-between items-center text-[12px] tracking-[0.14px] text-[#777169]">
        <span>不认同</span>
        <span>认同</span>
      </div>
      <div className="flex gap-2 justify-between items-end sm:gap-3">
        {likertLabels.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => onSelect(option.value)}
              className="flex flex-col flex-1 gap-3 items-center min-w-0 group"
            >
              <span
                className={`rounded-full transition-all duration-200 ${getDotSize(option.value)} ${
                  selected
                    ? "scale-110 ring-4 ring-[#93c5fd80] ring-offset-2 ring-offset-white"
                    : "opacity-78 group-hover:scale-105 group-hover:opacity-100"
                } ${getTone(option.value)}`}
              />
              <span
                className={`text-center text-[11px] leading-4 tracking-[0.14px] ${
                  selected ? "text-black" : "text-[#777169]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
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
    if (!state.completed || !result || typeof window === "undefined") {
      return;
    }

    window.location.assign(
      `${basePath}result/${result.code.toLowerCase()}?${serializeDimensionScores(result)}`
    );
  }, [basePath, result, state.completed]);

  return (
    <div className="px-4 pt-8 pb-16 mx-auto max-w-6xl sm:px-6 lg:px-8 lg:pt-10 lg:pb-24">
      <section className="space-y-5 max-w-[42rem]">
        <div className="inline-flex py-2 px-4 font-medium text-black uppercase rounded-full ring-1 bg-[rgba(245,242,239,0.8)] text-[12px] tracking-[0.7px] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] ring-[rgba(0,0,0,0.06)]">
          VCTI
        </div>
        <h1 className="font-light text-black font-display text-[3rem] leading-[1.08] tracking-[-0.96px] sm:text-[4.4rem]">
          Vibe-Coder
          <br />
          Type Indicator
        </h1>
        <p className="max-w-2xl text-[1.05rem] leading-[1.6] tracking-[0.18px] text-[#4e4e4e]">
          识别你在 AI 依赖度、技术认知深度、验证态度与交付驱动上的编码倾向。
        </p>
      </section>

      <section className="p-5 mt-12 bg-white sm:p-7 rounded-[24px] shadow-[rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_4px_4px]">
        <div className="flex gap-4 justify-between items-center">
          <div>
            <div className="text-[12px] tracking-[0.14px] text-[#777169]">Questionnaire</div>
            <h2 className="mt-2 font-light text-black font-display text-[2rem] leading-[1.15]">
              完成 20 道核心量表
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "restart" })}
            className="py-2 px-4 font-medium text-black rounded-full ring-1 bg-[rgba(245,242,239,0.8)] text-[0.94rem] shadow-[rgba(78,50,23,0.04)_0px_6px_16px] ring-[rgba(0,0,0,0.06)]"
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
          <div className="py-2 px-4 rounded-full bg-[#f5f5f5] text-[13px] tracking-[0.14px] text-[#4e4e4e] shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset]">
            Q{state.currentIndex + 1} / {state.questionOrder.length}
          </div>
          <div className="text-[13px] tracking-[0.14px] text-[#777169]">
            {progress.answered} 已回答
          </div>
        </div>

        <article className="p-5 mt-6 sm:p-7 rounded-[24px] bg-[#f6f6f6] shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset]">
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
            className="py-3 px-5 font-medium text-black bg-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-[0.94rem] shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_4px_4px]"
          >
            上一题
          </button>
        </div>
      </section>
    </div>
  );
}
