import { clamp } from "../../lib/utils";
import { dimensions, personalityProfiles, questions } from "./data";
import type {
  AnswerMap,
  AssessmentResult,
  DimensionId,
  DimensionScore,
  PersonalityCode,
  ResultCode,
} from "./types";

const PRIOR_VARIANCE = 1;
const OBSERVATION_VARIANCE = 0.5;
const SCALE_MAX = 15;
const NORMALIZED_RANGE = 2;
const NEUTRAL_THRESHOLD = 0.3;
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

const MAX_REACHABLE_POSTERIOR =
  NORMALIZED_RANGE / OBSERVATION_VARIANCE / (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE);

const coreQuestions = questions.filter((q) => q.category === "core");
const scoredQuestions = questions.filter((q) => q.category !== "scenario");

export { MAX_REACHABLE_POSTERIOR };

function getContribution(questionId: string, answer: number) {
  const question = questions.find((q) => q.id === questionId);
  if (!question || question.input !== "likert" || !question.dimension) {
    return null;
  }
  return {
    dimension: question.dimension,
    score: question.direction === "left" ? -answer : answer,
  };
}

function assembleDimensionScore(
  id: DimensionId,
  raw: number,
  normalized: number,
  posterior: number
): DimensionScore {
  const descriptor = dimensions.find((d) => d.id === id);
  if (!descriptor) {
    throw new Error(`Unknown dimension: ${id}`);
  }

  const purity = clamp(Math.abs(posterior) / MAX_REACHABLE_POSTERIOR, 0, 1);
  const leaning = posterior <= 0 ? "left" : "right";
  const letter = leaning === "left" ? descriptor.leftLetter : descriptor.rightLetter;
  const isNeutral = Math.abs(posterior) < NEUTRAL_THRESHOLD;

  return { id, raw, normalized, posterior, purity, leaning, letter, isNeutral };
}

function buildDimensionScore(id: DimensionId, raw: number): DimensionScore {
  const normalized = clamp((raw / SCALE_MAX) * NORMALIZED_RANGE, -2, 2);
  const posterior =
    normalized / OBSERVATION_VARIANCE / (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE);
  return assembleDimensionScore(id, raw, normalized, posterior);
}

function buildDimensionScoreFromPosterior(id: DimensionId, posteriorInput: number): DimensionScore {
  const posterior = clamp(posteriorInput, -2, 2);
  const normalized = clamp(
    posterior * (1 / PRIOR_VARIANCE + 1 / OBSERVATION_VARIANCE) * OBSERVATION_VARIANCE,
    -2,
    2
  );
  const raw = clamp(Math.round((normalized / NORMALIZED_RANGE) * SCALE_MAX), -SCALE_MAX, SCALE_MAX);
  return assembleDimensionScore(id, raw, normalized, posterior);
}

function getPrimaryCode(scores: Record<DimensionId, DimensionScore>): PersonalityCode {
  return `${scores.MA.letter}${scores.DV.letter}${scores.RJ.letter}${scores.CP.letter}` as PersonalityCode;
}

function getVibeIndex(scores: Record<DimensionId, DimensionScore>): number {
  return clamp(
    (scores.MA.posterior + scores.DV.posterior + scores.RJ.posterior + scores.CP.posterior) / 4,
    -2,
    2
  );
}

function detectEasterEgg(
  scores: Record<DimensionId, DimensionScore>,
  answers: AnswerMap,
  answeredExtremes: number
): ResultCode | null {
  const allScoredAnswered = scoredQuestions.every((q) => answers[q.id] !== undefined);

  if (allScoredAnswered && answers.SCN2 === 3) {
    return "SUDO";
  }

  const allNeutral = Object.values(scores).every((s) => Math.abs(s.posterior) <= NEUTRAL_THRESHOLD);
  if (allNeutral) {
    return "VOID";
  }

  if (!allScoredAnswered) {
    return null;
  }

  const allStrictVibe = Object.values(scores).every((s) => s.raw >= SCALE_MAX);
  if (allStrictVibe && answeredExtremes === coreQuestions.length) {
    return "SING";
  }

  const allNearStrictVibe = Object.values(scores).every((s) => s.raw >= SCALE_MAX - 1);
  const hasImperfectDimension = Object.values(scores).some((s) => s.raw < SCALE_MAX);
  if (allNearStrictVibe && hasImperfectDimension && answers.SIG1 === -3) {
    return "BUG";
  }

  const allStrictManual = Object.values(scores).every((s) => s.raw <= -SCALE_MAX);
  if (allStrictManual && answeredExtremes === coreQuestions.length && answers.SIG2 === 3) {
    return "LEGEND";
  }

  const vibeIndex = getVibeIndex(scores);
  if (scores.DV.posterior >= HALL_DV_THRESHOLD && vibeIndex >= HALL_VIBE_INDEX_THRESHOLD) {
    return "HALL";
  }

  return null;
}

function detectEasterEggFromPosteriors(
  scores: Record<DimensionId, DimensionScore>
): ResultCode | null {
  const allNeutral = Object.values(scores).every((s) => Math.abs(s.posterior) <= NEUTRAL_THRESHOLD);
  if (allNeutral) {
    return "VOID";
  }

  const vibeIndex = getVibeIndex(scores);
  if (scores.DV.posterior >= HALL_DV_THRESHOLD && vibeIndex >= HALL_VIBE_INDEX_THRESHOLD) {
    return "HALL";
  }

  return null;
}

function buildDimensionScores(
  rawScores: Record<DimensionId, number>
): Record<DimensionId, DimensionScore> {
  return {
    MA: buildDimensionScore("MA", rawScores.MA),
    DV: buildDimensionScore("DV", rawScores.DV),
    RJ: buildDimensionScore("RJ", rawScores.RJ),
    CP: buildDimensionScore("CP", rawScores.CP),
  };
}

function buildDimensionScoresFromPosteriors(
  posteriors: Record<DimensionId, number>
): Record<DimensionId, DimensionScore> {
  return {
    MA: buildDimensionScoreFromPosterior("MA", posteriors.MA),
    DV: buildDimensionScoreFromPosterior("DV", posteriors.DV),
    RJ: buildDimensionScoreFromPosterior("RJ", posteriors.RJ),
    CP: buildDimensionScoreFromPosterior("CP", posteriors.CP),
  };
}

export function calculateAssessment(answers: AnswerMap): AssessmentResult {
  const rawScores: Record<DimensionId, number> = { MA: 0, DV: 0, RJ: 0, CP: 0 };
  let answeredExtremes = 0;

  for (const [questionId, answer] of Object.entries(answers)) {
    if (answer === undefined) continue;

    if (Math.abs(answer) === 3) {
      answeredExtremes += 1;
    }

    const contribution = getContribution(questionId, answer);
    if (contribution) {
      rawScores[contribution.dimension] += contribution.score;
    }
  }

  const dimensionScores = buildDimensionScores(rawScores);
  const primaryCode = getPrimaryCode(dimensionScores);
  const easterEggCode = detectEasterEgg(dimensionScores, answers, answeredExtremes);
  const code = easterEggCode ?? primaryCode;
  const vibeIndex = getVibeIndex(dimensionScores);
  const answeredCount = coreQuestions.filter((q) => answers[q.id] !== undefined).length;
  const neutralDimensions = Object.values(dimensionScores)
    .filter((s) => s.isNeutral)
    .map((s) => s.id);

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
  const dimensionScores = buildDimensionScoresFromPosteriors(posteriors);
  const primaryCode = getPrimaryCode(dimensionScores);
  const derivedCode = detectEasterEggFromPosteriors(dimensionScores) ?? primaryCode;
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
      .filter((s) => s.isNeutral)
      .map((s) => s.id),
  };
}

export function serializeDimensionScores(result: AssessmentResult): string {
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

export function parseDimensionScoresFromQuery(
  searchParams: URLSearchParams
): Record<DimensionId, number> | null {
  const values: Partial<Record<DimensionId, number>> = {};
  for (const dimension of dimensions) {
    const rawValue = searchParams.get(QUERY_PARAM_KEYS[dimension.id]);
    if (rawValue === null) return null;
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) return null;
    values[dimension.id] = clamp(parsed, -2, 2);
  }
  return values as Record<DimensionId, number>;
}

export function parseResultCodeFromQuery(searchParams: URLSearchParams): ResultCode | null {
  const code = searchParams.get(RESULT_CODE_KEY);
  if (!code) return null;
  return code in personalityProfiles ? (code as ResultCode) : null;
}
