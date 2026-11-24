import { isCorrect, makeIdentifyChallenge, validChallenge } from "./challenges.ts";
import { EMPTY_STATS, isComplete, scoreAnswer, sessionDeadline } from "./session.ts";
import type { SoundId } from "./soundPack.ts";

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function simulateSessions(count = 1000) {
  const errors: string[] = [];
  let challenges = 0;
  let passed = 0;
  for (let seed = 0; seed < count; seed++) {
    const random = seededRandom(seed + 1);
    const deadline = sessionDeadline(0);
    let stats = EMPTY_STATS;
    let now = 0;
    const recent: SoundId[] = [];
    try {
      while (!isComplete(deadline, now)) {
        const challenge = makeIdentifyChallenge(stats.level, recent, random);
        if (!validChallenge(challenge)) throw new Error("Invalid generated challenge");
        if (stats.level <= 5 && challenge.choices.length !== 4) throw new Error("Easy choice count");
        if (!isCorrect(challenge, challenge.solution)) throw new Error("Rejected correct answer");
        const correct = random() < 0.8;
        const response = correct ? challenge.solution : [`invalid:${seed}`];
        if (isCorrect(challenge, response) !== correct) throw new Error("Unexpected result");
        recent.push(...new Set(challenge.clips.flat()));
        recent.splice(0, Math.max(0, recent.length - 8));
        const next = scoreAnswer(stats, correct);
        const expectedLevel = correct ? stats.level + 1 : Math.max(1, stats.level - 1);
        if (next.score - stats.score !== (correct ? stats.level : 0) || next.level !== expectedLevel
          || next.correct > next.attempted || next.bestStreak < next.streak) throw new Error("Invalid scoring");
        stats = next;
        challenges++;
        now += 2_500 + Math.floor(random() * 5_500);
        if (stats.attempted > 48) throw new Error("Session failed to complete");
      }
      passed++;
    } catch (error) {
      errors.push(`Session ${seed + 1}: ${String(error)}`);
    }
  }
  return { sessions: count, passed, challenges, errors };
}
