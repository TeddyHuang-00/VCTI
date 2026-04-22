export {
  dimensions,
  likertLabels,
  personalityProfiles,
  questionnaireQuestions,
  questions,
} from "./data";
export type { ParsedDimensionScores } from "./scoring";
export {
  calculateAssessment,
  calculateAssessmentFromDimensionPosteriors,
  getUncertaintyRange,
  MAX_REACHABLE_POSTERIOR,
  N_QUESTIONS,
  PRIOR_VARIANCE,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
  serializeDimensionScores,
} from "./scoring";
export type {
  AnswerMap,
  AssessmentResult,
  ChoiceQuestion,
  DimensionDescriptor,
  DimensionId,
  EasterEggCode,
  PersonalityCode,
  PersonalityProfile,
  Question,
  ResultCode,
} from "./types";
export { EASTER_EGG_CODES, PERSONALITY_CODES } from "./types";
