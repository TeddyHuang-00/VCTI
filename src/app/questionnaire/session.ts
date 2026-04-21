import type { AnswerMap, AssessmentResult, Question } from "@/domain/vcti";
import { calculateAssessment, questionnaireQuestions } from "@/domain/vcti";

export interface QuestionnaireState {
  currentIndex: number;
  answers: AnswerMap;
  started: boolean;
  completed: boolean;
  questionOrder: string[];
}

export type QuestionnaireAction =
  | { type: "start" }
  | { type: "answer"; questionId: string; value: number }
  | { type: "prev" }
  | { type: "next" }
  | { type: "restart"; seed?: number }
  | { type: "jump"; index: number };

function shuffleQuestionIds(seed = Math.random()) {
  const ids = questionnaireQuestions.map((question) => question.id);
  let randomSeed = Math.floor(seed * 1_000_000) || 1;

  for (let index = ids.length - 1; index > 0; index -= 1) {
    randomSeed = (randomSeed * 48271) % 0x7fffffff;
    const swapIndex = randomSeed % (index + 1);
    const current = ids[index];
    ids[index] = ids[swapIndex] ?? current;
    ids[swapIndex] = current;
  }

  return ids;
}

export function createInitialQuestionnaireState(seed?: number): QuestionnaireState {
  return {
    currentIndex: 0,
    answers: {},
    started: false,
    completed: false,
    questionOrder: shuffleQuestionIds(seed),
  };
}

export const initialQuestionnaireState: QuestionnaireState = createInitialQuestionnaireState();

export function questionnaireReducer(
  state: QuestionnaireState,
  action: QuestionnaireAction
): QuestionnaireState {
  switch (action.type) {
    case "start":
      return { ...state, started: true };
    case "answer": {
      const answers = {
        ...state.answers,
        [action.questionId]: action.value,
      };
      const isLastQuestion = state.currentIndex >= state.questionOrder.length - 1;
      return {
        ...state,
        answers,
        started: true,
        completed: isLastQuestion,
        currentIndex: isLastQuestion ? state.currentIndex : state.currentIndex + 1,
      };
    }
    case "prev":
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      };
    case "next": {
      if (state.currentIndex >= state.questionOrder.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };
    }
    case "restart":
      return createInitialQuestionnaireState(action.seed);
    case "jump":
      return {
        ...state,
        currentIndex: Math.min(Math.max(action.index, 0), state.questionOrder.length - 1),
      };
    default:
      return state;
  }
}

export function getCurrentQuestion(state: QuestionnaireState): Question {
  const questionId = state.questionOrder[state.currentIndex];
  const question = questionnaireQuestions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error(`Unknown question id in order: ${questionId}`);
  }
  return question;
}

export function getQuestionnaireProgress(state: QuestionnaireState) {
  const answered = state.questionOrder.filter(
    (questionId) => state.answers[questionId] !== undefined
  ).length;
  return {
    answered,
    total: state.questionOrder.length,
    ratio: answered / state.questionOrder.length,
  };
}

export function canCompleteQuestionnaire(state: QuestionnaireState) {
  return state.questionOrder.every((questionId) => state.answers[questionId] !== undefined);
}

export function getAssessmentFromState(state: QuestionnaireState): AssessmentResult {
  return calculateAssessment(state.answers);
}
