import { SOUND_PACK, soundById } from "./soundPack.ts";
import type { Sound, SoundId } from "./soundPack.ts";

export const MODES = {
  identify: { name: "Identify the Sound", icon: "◉", hint: "Listen, then choose what you heard.", prompt: "What made that sound?" },
  sequence: { name: "Sound Sequence", icon: "≋", hint: "Listen to the whole clip, then tap sounds in the order you heard them.", prompt: "What did you hear, in order?" },
  mixer: { name: "Sound Mixer", icon: "∿", hint: "Listen for sounds playing together. Select every sound you heard.", prompt: "Which sounds played together?" },
  difference: { name: "Spot the Difference", icon: "◒", hint: "Listen to both clips and decide whether they match.", prompt: "Same or different?" },
  mystery: { name: "Audio Mystery", icon: "✦", hint: "Listen for clues, then choose the most likely explanation.", prompt: "What probably happened?" },
} as const;

export type Mode = keyof typeof MODES;
export type Difficulty = "easy" | "normal" | "hard";
export type Answer = { id: string; label: string; icon: string; group?: string };
export type Challenge = {
  mode: Mode;
  clips: SoundId[][];
  choices: Answer[];
  solution: string[];
  noise?: boolean;
  explanation?: string;
};

const SCENES = [
  { id: "arrived", clips: ["keys", "unlock", "steps"], label: "Someone unlocked a door and walked in", icon: "🏠", explanation: "Keys jingled, a lock turned, and footsteps followed." },
  { id: "tea", clips: ["pour", "utensils"], label: "Someone poured a drink and stirred it", icon: "☕", explanation: "Water poured first, then a utensil clinked." },
  { id: "storm", clips: ["wind", "rain", "thunder"], label: "A rainstorm rolled in", icon: "⛈️", explanation: "Wind picked up, rain fell, and thunder rumbled." },
  { id: "post", clips: ["doorbell", "dog"], label: "A doorbell made a dog bark", icon: "🐕", explanation: "The doorbell rang just before the dog barked." },
  { id: "morning", clips: ["alarm", "steps"], label: "Someone got up after an alarm", icon: "⏰", explanation: "An alarm rang, then someone took a few steps." },
  { id: "ride", clips: ["bicycle", "horn"], label: "A bicycle and a car signalled in traffic", icon: "🚲", explanation: "A bicycle bell rang and a car horn answered." },
  { id: "stage", clips: ["steps", "clap"], label: "Someone walked out to applause", icon: "👏", explanation: "Footsteps were followed by a round of clapping." },
  { id: "farm", clips: ["birds", "cow"], label: "A cow mooed among singing birds", icon: "🐄", explanation: "Birds chirped, then a cow mooed." },
  { id: "cooking", clips: ["utensils", "cooker"], label: "Someone prepared food in a pressure cooker", icon: "🍲", explanation: "Utensils clinked, then a pressure cooker hissed." },
  { id: "rail", clips: ["train", "steps"], label: "A train arrived and someone walked away", icon: "🚆", explanation: "A train rumbled past and footsteps followed." },
  { id: "fare", clips: ["rickshaw", "coins"], label: "Someone paid for an auto-rickshaw ride", icon: "🛺", explanation: "An auto-rickshaw rattled, then coins jingled." },
  { id: "catdoor", clips: ["knock", "cat"], label: "A knock at the door startled a cat", icon: "🐈", explanation: "There was a knock, followed by a meow." },
] satisfies { id: string; clips: SoundId[]; label: string; icon: string; explanation: string }[];

const COMPARISONS: Answer[] = [
  { id: "same", label: "Same", icon: "=" },
  { id: "different", label: "Different", icon: "≠" },
];

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function answer(sound: Sound): Answer {
  return { id: `sound:${sound.id}`, label: sound.label, icon: sound.icon, group: sound.group };
}

export function makeIdentifyChallenge(level: number, recent: readonly SoundId[], random = Math.random): Challenge {
  if (level <= 5) return makeChallenge("identify", "easy", 1, recent, [], random);
  if (level <= 10) return makeChallenge("identify", "normal", 2, recent, [], random);
  return makeChallenge("identify", "hard", 3, recent, [], random);
}

export function makeChallenge(
  mode: Mode, difficulty: Difficulty, level: number, recent: readonly SoundId[],
  usedScenes: readonly string[], random = Math.random,
): Challenge {
  const easy = difficulty === "easy";
  const pool = easy ? SOUND_PACK.filter((sound) => sound.familiar) : SOUND_PACK;
  const fresh = shuffle(pool.filter((sound) => !recent.includes(sound.id)), random);
  const ordered = [...fresh, ...shuffle(pool.filter((sound) => recent.includes(sound.id)), random)];
  const primary = ordered[0]!;
  const distinct = [primary, ...ordered.filter((sound) => sound.family !== primary.family)]
    .filter((sound, i, all) => all.findIndex((entry) => entry.family === sound.family) === i);
  const choiceCount = easy ? 4 : difficulty === "hard" || level >= 3 ? 6 : 4;

  function soundChoices(targets: Sound[], similar = false): Answer[] {
    const available = pool.filter((sound) => !targets.includes(sound));
    const preferred = available.filter((sound) =>
      (similar ? sound.family === primary.family : !targets.some((target) => sound.family === target.family)));
    const distractors = [...shuffle(preferred, random), ...shuffle(available.filter((sound) => !preferred.includes(sound)), random)];
    return shuffle([...targets, ...distractors.slice(0, choiceCount - targets.length)].map(answer), random);
  }

  if (mode === "identify") {
    return {
      mode, clips: [[primary.id]], solution: [answer(primary).id],
      choices: soundChoices([primary], !easy || level >= 3),
    };
  }
  if (mode === "sequence") {
    const length = Math.min(easy ? 3 : 5, level + 1);
    const targets = (easy ? distinct : ordered).slice(0, length);
    return { mode, clips: targets.map((sound) => [sound.id]), solution: targets.map((sound) => answer(sound).id), choices: soundChoices(targets) };
  }
  if (mode === "mixer") {
    const targets = distinct.slice(0, !easy && level >= 3 ? 3 : 2);
    return {
      mode, clips: [targets.map((sound) => sound.id)], solution: targets.map((sound) => answer(sound).id),
      choices: soundChoices(targets), noise: difficulty === "hard" && level >= 4,
    };
  }
  if (mode === "difference") {
    const same = random() < 0.5;
    const layered = !easy && level >= 3;
    const secondary = distinct[1]!;
    const first = layered && random() < 0.5 ? [primary.id, secondary.id] : [primary.id];
    const second = same ? [...first] : layered
      ? first.length === 2 ? [primary.id] : [primary.id, secondary.id]
      : [secondary.id];
    return { mode, clips: [first, second], solution: [same ? "same" : "different"], choices: shuffle(COMPARISONS, random) };
  }

  const scenes = shuffle(SCENES, random);
  const availableScenes = scenes.filter((item) => !usedScenes.includes(item.id));
  const scene = availableScenes.find((item) => item.clips.every((id) => !recent.slice(-3).includes(id)))
    ?? availableScenes[0] ?? scenes[0]!;
  const choices = [scene, ...scenes.filter((item) => item.id !== scene.id).slice(0, 3)]
    .map(({ id, label, icon }) => ({ id, label, icon }));
  return {
    mode, clips: scene.clips.map((id) => [id]), solution: [scene.id],
    choices: shuffle(choices, random), explanation: scene.explanation,
  };
}

export function isCorrect(challenge: Challenge, selected: readonly string[]): boolean {
  if (selected.length !== challenge.solution.length || new Set(selected).size !== selected.length) return false;
  return challenge.mode === "mixer"
    ? selected.every((id) => challenge.solution.includes(id))
    : selected.every((id, index) => id === challenge.solution[index]);
}

export function validChallenge(challenge: Challenge): boolean {
  const { mode, clips, choices, solution } = challenge;
  const ids = choices.map((choice) => choice.id);
  if (new Set(ids).size !== ids.length || new Set(choices.map((choice) => choice.label)).size !== choices.length) return false;
  if (!clips.length || clips.some((clip) => !clip.length || new Set(clip).size !== clip.length || clip.some((id) => !SOUND_PACK.some((s) => s.id === id)))) return false;
  if (!solution.length || new Set(solution).size !== solution.length || solution.some((id) => !ids.includes(id))) return false;
  if (mode === "difference") {
    if (clips.length !== 2 || ids.length !== 2 || !COMPARISONS.every((choice) => ids.includes(choice.id))) return false;
    const first = clips[0]!;
    const second = clips[1]!;
    const same = first.length === second.length && first.every((id) => second.includes(id));
    return solution.length === 1 && solution[0] === (same ? "same" : "different");
  }
  if (mode === "mystery") {
    const scene = SCENES.find((item) => item.id === solution[0]);
    return !!scene && ids.length === 4 && ids.every((id) => SCENES.some((item) => item.id === id))
      && solution.length === 1 && clips.every((clip) => clip.length === 1)
      && sameClips(scene.clips, clips.flat());
  }
  const sounds = clips.flat();
  if (ids.length < 4 || ids.length > 6 || !choices.every((choice) => SOUND_PACK.some((sound) => answer(sound).id === choice.id && sound.label === choice.label))) return false;
  if (mode === "identify" && (clips.length !== 1 || sounds.length !== 1)) return false;
  if (mode === "sequence" && (clips.length < 2 || clips.length > 5 || clips.some((clip) => clip.length !== 1))) return false;
  if (mode === "mixer" && (clips.length !== 1 || sounds.length < 2 || sounds.length > 3)) return false;
  return solution.length === sounds.length && isCorrect(challenge, sounds.map((id) => answer(soundById(id)).id));
}

function sameClips(a: readonly SoundId[], b: readonly SoundId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
