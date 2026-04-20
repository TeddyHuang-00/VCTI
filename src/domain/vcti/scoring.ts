import { dimensions, personalityProfiles, questions } from "@/domain/vcti/data";
import type {
  AnswerMap,
  AssessmentResult,
  DimensionId,
  DimensionScore,
  PersonalityCode,
  ResultCode,
} from "@/domain/vcti/types";

const PRIOR_VARIANCE = 1;
const OBSERVATION_VARIANCE = 0.5;
const SCALE_MAX = 15;
const NORMALIZED_RANGE = 2;
const NEUTRAL_THRESHOLD = 0.3;
const MAX_REACHABLE_POSTERIOR =
  NORMALIZED_RANGE / OBSERVATION_VARIANCE / (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE);
const NEAR_MAX_RAW = SCALE_MAX - 1;
const BUG_POSTERIOR_THRESHOLD =
  ((NEAR_MAX_RAW / SCALE_MAX) * NORMALIZED_RANGE) /
  OBSERVATION_VARIANCE /
  (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE);
const HALL_DV_THRESHOLD = 1.05;
const HALL_VIBE_INDEX_THRESHOLD = 0.85;
const SHARE_PRECISION = 3;
const QUERY_PARAM_KEYS: Record<DimensionId, string> = {
  MA: "ma",
  DV: "dv",
  RJ: "rj",
  CP: "cp",
};
const RESULT_CODE_KEY = "code";

const coreQuestions = questions.filter((question) => question.category === "core");
const scoredQuestions = questions.filter((question) => question.category !== "scenario");

export { MAX_REACHABLE_POSTERIOR };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getContribution(questionId: string, answer: number) {
  const question = questions.find((item) => item.id === questionId);
  if (!question || question.input !== "likert" || !question.dimension) {
    return null;
  }

  return {
    dimension: question.dimension,
    score: question.direction === "left" ? -answer : answer,
  };
}

function buildDimensionScore(id: DimensionId, raw: number): DimensionScore {
  const descriptor = dimensions.find((item) => item.id === id);
  if (!descriptor) {
    throw new Error(`Unknown dimension: ${id}`);
  }

  const normalized = clamp((raw / SCALE_MAX) * NORMALIZED_RANGE, -2, 2);
  const posterior =
    (0 / PRIOR_VARIANCE + normalized / OBSERVATION_VARIANCE) /
    (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE);
  const purity = clamp(Math.abs(posterior) / MAX_REACHABLE_POSTERIOR, 0, 1);
  const leaning = posterior <= 0 ? "left" : "right";
  const letter = leaning === "left" ? descriptor.leftLetter : descriptor.rightLetter;
  const isNeutral = Math.abs(posterior) < NEUTRAL_THRESHOLD;

  return {
    id,
    raw,
    normalized,
    posterior,
    purity,
    leaning,
    letter,
    isNeutral,
  };
}

function buildDimensionScoreFromPosterior(id: DimensionId, posteriorInput: number): DimensionScore {
  const descriptor = dimensions.find((item) => item.id === id);
  if (!descriptor) {
    throw new Error(`Unknown dimension: ${id}`);
  }

  const posterior = clamp(posteriorInput, -2, 2);
  const normalized = clamp(
    posterior * (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE) * OBSERVATION_VARIANCE,
    -2,
    2
  );
  const raw = clamp(Math.round((normalized / NORMALIZED_RANGE) * SCALE_MAX), -SCALE_MAX, SCALE_MAX);
  const purity = clamp(Math.abs(posterior) / MAX_REACHABLE_POSTERIOR, 0, 1);
  const leaning = posterior <= 0 ? "left" : "right";
  const letter = leaning === "left" ? descriptor.leftLetter : descriptor.rightLetter;
  const isNeutral = Math.abs(posterior) < NEUTRAL_THRESHOLD;

  return {
    id,
    raw,
    normalized,
    posterior,
    purity,
    leaning,
    letter,
    isNeutral,
  };
}

function getPrimaryCode(scores: Record<DimensionId, DimensionScore>): PersonalityCode {
  return `${scores.MA.letter}${scores.DV.letter}${scores.RJ.letter}${scores.CP.letter}` as PersonalityCode;
}

function getVibeIndex(scores: Record<DimensionId, DimensionScore>) {
  return clamp(
    (scores.MA.posterior + scores.DV.posterior + scores.RJ.posterior + scores.CP.posterior) / 4,
    -2,
    2
  );
}

function getEasterEggCodeFromScores(
  scores: Record<DimensionId, DimensionScore>,
  answeredExtremes: number
): ResultCode | null {
  const vibeIndex = getVibeIndex(scores);
  const allNeutral = Object.values(scores).every((score) => Math.abs(score.posterior) <= 0.3);
  if (allNeutral) {
    return "VOID";
  }

  const allStrictVibe = Object.values(scores).every((score) => score.raw >= SCALE_MAX);
  if (allStrictVibe && answeredExtremes === coreQuestions.length) {
    return "SING";
  }

  const allNearStrictVibe = Object.values(scores).every((score) => score.raw >= NEAR_MAX_RAW);
  const hasAnyImperfectDimension = Object.values(scores).some((score) => score.raw < SCALE_MAX);
  if (allNearStrictVibe && hasAnyImperfectDimension) {
    return "BUG";
  }

  const allStrictManual = Object.values(scores).every((score) => score.raw <= -SCALE_MAX);
  if (allStrictManual && answeredExtremes === coreQuestions.length) {
    return "LEGEND";
  }

  if (scores.DV.posterior >= HALL_DV_THRESHOLD && vibeIndex >= HALL_VIBE_INDEX_THRESHOLD) {
    return "HALL";
  }

  return null;
}

function getEasterEggCode(
  scores: Record<DimensionId, DimensionScore>,
  answers: AnswerMap,
  answeredExtremes: number
): ResultCode | null {
  const allScoredAnswered = coreQuestions.every((question) => answers[question.id] !== undefined);
  if (!allScoredAnswered) {
    return null;
  }

  if (answers.SCN2 === 3) {
    return "SUDO";
  }

  return getEasterEggCodeFromScores(scores, answeredExtremes);
}

export function calculateAssessment(answers: AnswerMap): AssessmentResult {
  const rawScores: Record<DimensionId, number> = {
    MA: 0,
    DV: 0,
    RJ: 0,
    CP: 0,
  };

  let answeredExtremes = 0;
  for (const [questionId, answer] of Object.entries(answers)) {
    if (answer === undefined) {
      continue;
    }

    if (Math.abs(answer) === 3) {
      answeredExtremes += 1;
    }

    const contribution = getContribution(questionId, answer);
    if (!contribution) {
      continue;
    }
    rawScores[contribution.dimension] += contribution.score;
  }

  const dimensionScores: Record<DimensionId, DimensionScore> = {
    MA: buildDimensionScore("MA", rawScores.MA),
    DV: buildDimensionScore("DV", rawScores.DV),
    RJ: buildDimensionScore("RJ", rawScores.RJ),
    CP: buildDimensionScore("CP", rawScores.CP),
  };

  const primaryCode = getPrimaryCode(dimensionScores);
  const easterEggCode = getEasterEggCode(dimensionScores, answers, answeredExtremes);
  const code = easterEggCode ?? primaryCode;

  const vibeIndex = getVibeIndex(dimensionScores);

  const answeredCount = coreQuestions.filter(
    (question) => answers[question.id] !== undefined
  ).length;
  const neutralDimensions = Object.values(dimensionScores)
    .filter((score) => score.isNeutral)
    .map((score) => score.id);

  return {
    code,
    primaryCode,
    profile: personalityProfiles[code],
    primaryProfile: personalityProfiles[primaryCode],
    dimensionScores,
    vibeIndex,
    completionRatio: answeredCount / coreQuestions.length,
    answeredCount,
    totalCount: coreQuestions.length,
    answeredExtremes,
    totalScoredQuestions: scoredQuestions.length,
    neutralDimensions,
  };
}

export function calculateAssessmentFromDimensionPosteriors(
  posteriors: Record<DimensionId, number>,
  forcedCode?: ResultCode | null
): AssessmentResult {
  const dimensionScores: Record<DimensionId, DimensionScore> = {
    MA: buildDimensionScoreFromPosterior("MA", posteriors.MA),
    DV: buildDimensionScoreFromPosterior("DV", posteriors.DV),
    RJ: buildDimensionScoreFromPosterior("RJ", posteriors.RJ),
    CP: buildDimensionScoreFromPosterior("CP", posteriors.CP),
  };

  const primaryCode = getPrimaryCode(dimensionScores);
  const allStrictVibe = Object.values(dimensionScores).every(
    (score) => score.posterior >= MAX_REACHABLE_POSTERIOR - 0.001
  );
  const allStrictManual = Object.values(dimensionScores).every(
    (score) => score.posterior <= -MAX_REACHABLE_POSTERIOR + 0.001
  );
  const allNearStrictVibe = Object.values(dimensionScores).every(
    (score) => score.posterior >= BUG_POSTERIOR_THRESHOLD
  );
  const hasAnyImperfectDimension = Object.values(dimensionScores).some(
    (score) => score.posterior < MAX_REACHABLE_POSTERIOR - 0.001
  );
  const derivedCode =
    (allStrictVibe
      ? "SING"
      : allNearStrictVibe && hasAnyImperfectDimension
        ? "BUG"
        : allStrictManual
          ? "LEGEND"
          : getEasterEggCodeFromScores(dimensionScores, 0)) ?? primaryCode;
  const code: ResultCode = forcedCode && personalityProfiles[forcedCode] ? forcedCode : derivedCode;
  const vibeIndex = getVibeIndex(dimensionScores);

  return {
    code,
    primaryCode,
    profile: personalityProfiles[code],
    primaryProfile: personalityProfiles[primaryCode],
    dimensionScores,
    vibeIndex,
    completionRatio: 1,
    answeredCount: coreQuestions.length,
    totalCount: coreQuestions.length,
    answeredExtremes: 0,
    totalScoredQuestions: coreQuestions.length,
    neutralDimensions: Object.values(dimensionScores)
      .filter((score) => score.isNeutral)
      .map((score) => score.id),
  };
}

export function serializeDimensionScores(result: AssessmentResult) {
  const params = new URLSearchParams();

  for (const dimension of dimensions) {
    params.set(
      QUERY_PARAM_KEYS[dimension.id],
      result.dimensionScores[dimension.id].posterior.toFixed(SHARE_PRECISION)
    );
  }

  if (result.code !== result.primaryCode) {
    params.set(RESULT_CODE_KEY, result.code);
  }

  return params.toString();
}

export function parseDimensionScoresFromQuery(searchParams: URLSearchParams) {
  const values: Partial<Record<DimensionId, number>> = {};

  for (const dimension of dimensions) {
    const rawValue = searchParams.get(QUERY_PARAM_KEYS[dimension.id]);
    if (rawValue === null) {
      return null;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return null;
    }

    values[dimension.id] = clamp(parsed, -2, 2);
  }

  return values as Record<DimensionId, number>;
}

export function parseResultCodeFromQuery(searchParams: URLSearchParams) {
  const code = searchParams.get(RESULT_CODE_KEY);
  if (!code) {
    return null;
  }

  return personalityProfiles[code] ? (code as ResultCode) : null;
}
