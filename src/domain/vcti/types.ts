export const DIMENSIONS = ["MA", "DV", "RJ", "CP"] as const;
export const LIKERT_OPTIONS = [-3, -2, -1, 0, 1, 2, 3] as const;

export type DimensionId = (typeof DIMENSIONS)[number];
export type LikertValue = (typeof LIKERT_OPTIONS)[number];
export type QuestionCategory = "core" | "scenario" | "signal";
export type QuestionInput = "likert" | "choice";
export type PersonalityCode =
  | "MDRC"
  | "MDRP"
  | "MDJC"
  | "MDJP"
  | "ADRC"
  | "ADRP"
  | "ADJC"
  | "ADJP"
  | "AVRC"
  | "AVRP"
  | "AVJC"
  | "AVJP"
  | "MVRC"
  | "MVRP"
  | "MVJC"
  | "MVJP";
export type EasterEggCode = "SING" | "BUG" | "LEGEND" | "VOID" | "HALL" | "SUDO";
export type ResultCode = PersonalityCode | EasterEggCode;

export interface QuestionChoice {
  value: number;
  label: string;
  hint?: string;
}

export interface BaseQuestion {
  id: string;
  prompt: string;
  dimension?: DimensionId;
  category: QuestionCategory;
  input: QuestionInput;
  note?: string;
}

export interface LikertQuestion extends BaseQuestion {
  input: "likert";
  direction: "left" | "right";
}

export interface ChoiceQuestion extends BaseQuestion {
  input: "choice";
  choices: QuestionChoice[];
}

export type Question = LikertQuestion | ChoiceQuestion;

export type AnswerValue = number;
export type AnswerMap = Partial<Record<string, AnswerValue>>;

export interface DimensionDescriptor {
  id: DimensionId;
  name: string;
  subtitle: string;
  leftLetter: string;
  rightLetter: string;
  leftLabel: string;
  rightLabel: string;
  leftFullName: string;
  rightFullName: string;
  summary: string;
  detailTitle: string;
  detailBody: string;
}

export interface PersonalityProfile {
  code: ResultCode;
  chineseName: string;
  englishName: string;
  summary: string;
  quote: string;
  hashtags: string[];
  vibeLabel: string;
  imageName: string;
  isEasterEgg?: boolean;
}

export interface DimensionScore {
  id: DimensionId;
  raw: number;
  normalized: number;
  posterior: number;
  purity: number;
  leaning: "left" | "right";
  letter: string;
  isNeutral: boolean;
}

export interface AssessmentResult {
  code: ResultCode;
  primaryCode: PersonalityCode;
  profile: PersonalityProfile;
  primaryProfile: PersonalityProfile;
  dimensionScores: Record<DimensionId, DimensionScore>;
  vibeIndex: number;
  completionRatio: number;
  answeredCount: number;
  totalCount: number;
  answeredExtremes: number;
  totalScoredQuestions: number;
  neutralDimensions: DimensionId[];
}
