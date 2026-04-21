export {
  dimensions,
  likertLabels,
  personalityProfiles,
  questionnaireQuestions,
  questions,
} from "@/domain/vcti/data";
export {
  calculateAssessment,
  calculateAssessmentFromDimensionPosteriors,
  MAX_REACHABLE_POSTERIOR,
  parseDimensionScoresFromQuery,
  parseResultCodeFromQuery,
  serializeDimensionScores,
} from "@/domain/vcti/scoring";
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
} from "@/domain/vcti/types";
export { EASTER_EGG_CODES, PERSONALITY_CODES } from "@/domain/vcti/types";
