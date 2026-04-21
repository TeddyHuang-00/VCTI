import { useEffect, useMemo, useReducer } from "react";
import { View, Text, Button as TaroButton } from "@tarojs/components";
import Taro from "@tarojs/taro";
import {
  canCompleteQuestionnaire,
  createInitialQuestionnaireState,
  getAssessmentFromState,
  getCurrentQuestion,
  getQuestionnaireProgress,
  questionnaireReducer,
} from "@vcti/shared/app/questionnaire/session";
import { likertLabels, serializeDimensionScores } from "@vcti/shared/domain/vcti";
import "./index.scss";

const DOT_TONES: Record<number, { bg: string; text: string }> = {
  [-1]: { bg: "#d95c4f", text: "#b04439" },
  [0]: { bg: "#d9d5d0", text: "#7f7a73" },
  [1]: { bg: "#4e9a67", text: "#3f7d54" },
};

function getTone(value: number) {
  return DOT_TONES[Math.sign(value)] ?? DOT_TONES[0];
}

const DOT_SIZES: Record<number, number> = {
  [-3]: 24,
  [-2]: 20,
  [-1]: 16,
  [0]: 12,
  [1]: 16,
  [2]: 20,
  [3]: 24,
};

function getDotSize(value: number) {
  return DOT_SIZES[value] ?? 16;
}

function LikertDots({
  value,
  onSelect,
}: {
  value?: number;
  onSelect: (nextValue: number) => void;
}) {
  return (
    <View className="likert-dots">
      {likertLabels.map((option) => {
        const selected = value === option.value;
        const tone = getTone(option.value);
        const size = getDotSize(option.value);
        return (
          <View
            key={option.value}
            className={`likert-dot ${selected ? "likert-dot--selected" : ""}`}
            onClick={() => onSelect(option.value)}
          >
            <View className="likert-dot__circle-wrap">
              <View
                className="likert-dot__circle"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: tone.bg,
                  ...(selected ? { boxShadow: `0 0 0 2px ${tone.bg}40` } : {}),
                }}
              />
            </View>
            <Text className={`likert-dot__label ${selected ? "likert-dot__label--selected" : ""}`}>
              {option.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function IndexPage() {
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
    if (!state.completed || !result) return;
    const query = serializeDimensionScores(result);
    Taro.redirectTo({ url: `/pages/result/index?${query}` });
  }, [result, state.completed]);

  return (
    <View className="page-questionnaire">
      <View className="hero">
        <View className="hero__badge">VCTI</View>
        <Text className="hero__title">Vibe-Coder{"\n"}Type Indicator</Text>
        <Text className="hero__desc">22 道题，5 分钟，破译你的编程人格暗码。</Text>
      </View>

      <View className="card">
        <View className="card__header">
          <View>
            <Text className="card__label">VCTI 量表</Text>
            <Text className="card__title">回答下列陈述</Text>
          </View>
          <TaroButton className="btn-reset" onClick={() => dispatch({ type: "restart" })}>
            重置
          </TaroButton>
        </View>

        <View className="progress-bar">
          <View className="progress-bar__fill" style={{ width: `${progress.ratio * 100}%` }} />
        </View>

        <View className="card__meta">
          <Text className="card__counter">
            Q{state.currentIndex + 1} / {state.questionOrder.length}
          </Text>
          <Text className="card__answered">
            {progress.answered} / {progress.total} 题
          </Text>
        </View>

        <View className="question-panel">
          <Text className="question-panel__prompt">{currentQuestion.prompt}</Text>
          <View className="question-panel__dots">
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
          </View>
        </View>

        <View className="card__nav">
          <TaroButton
            className="btn-nav"
            onClick={() => dispatch({ type: "prev" })}
            disabled={state.currentIndex === 0}
          >
            上一题
          </TaroButton>
          <TaroButton
            className="btn-nav"
            onClick={() => {
              if (currentValue === undefined) return;
              dispatch({ type: "next" });
            }}
            disabled={
              currentValue === undefined ||
              state.currentIndex >= state.questionOrder.length - 1
            }
          >
            下一题
          </TaroButton>
        </View>
      </View>
    </View>
  );
}
