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
  PersonalityProfile,
  Question,
} from "@/domain/vcti/types";
