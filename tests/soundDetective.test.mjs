import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isCorrect, makeChallenge, makeIdentifyChallenge, MODES, shuffle, validChallenge } from "../src/game/soundDetective/challenges.ts";
import { SOUND_PACK } from "../src/game/soundDetective/soundPack.ts";
import { EMPTY_STATS, isComplete, resultSummary, scoreAnswer, secondsLeft, sessionDeadline } from "../src/game/soundDetective/session.ts";
import { DetectiveAudio, loadSample } from "../src/game/soundDetective/audio.ts";
import { seededRandom, simulateSessions } from "../src/game/soundDetective/simulate.ts";

const modes = Object.keys(MODES);
const difficulties = ["easy", "normal", "hard"];
const sample = (mode, difficulty = "easy", level = 1, seed = 7) => makeChallenge(mode, difficulty, level, [], [], seededRandom(seed));

test("every mode produces exactly one valid response, with explicit sequence and mixer semantics", () => {
  for (const mode of modes) {
    for (const difficulty of difficulties) {
      for (let level = 1; level <= 4; level++) {
        for (let seed = 1; seed <= 15; seed++) {
          const question = sample(mode, difficulty, level, seed);
          assert.ok(validChallenge(question));
          assert.ok(isCorrect(question, question.solution));
          assert.equal(isCorrect(question, ["unknown"]), false);
          if (question.solution.length === 1) {
            assert.deepEqual(question.choices.filter(({ id }) => isCorrect(question, [id])).map(({ id }) => id), question.solution);
          }
        }
      }
    }
  }
});

test("the audio ID maps to a distinct answer ID and correct display label", () => {
  const heard = new Set();
  for (let seed = 1; seed <= 180; seed++) {
    const question = sample("identify", "hard", 1, seed);
    const id = question.clips[0][0];
    const sound = SOUND_PACK.find((entry) => entry.id === id);
    assert.equal(question.solution[0], `sound:${id}`);
    assert.equal(question.choices.find((answer) => answer.id === question.solution[0]).label, sound.label);
    heard.add(id);
  }
  assert.equal(heard.size, SOUND_PACK.length);
});

test("choice positions are randomized and recent sounds are avoided", () => {
  const positions = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const question = makeChallenge("identify", "easy", 1, ["rain", "bicycle", "dog"], [], seededRandom(seed));
    positions.add(question.choices.findIndex(({ id }) => id === question.solution[0]));
    assert.ok(!["rain", "bicycle", "dog"].includes(question.clips[0][0]));
  }
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(input, seededRandom(17)).sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test("sequence requires the exact order and scores a correct response", () => {
  const question = sample("sequence", "hard", 4);
  const reversed = [...question.solution].reverse();
  assert.equal(isCorrect(question, reversed), false);
  assert.equal(isCorrect(question, question.solution.slice(0, -1)), false);
  assert.equal(scoreAnswer(EMPTY_STATS, isCorrect(question, reversed)).score, 0);
  const correct = scoreAnswer(EMPTY_STATS, isCorrect(question, question.solution));
  assert.equal(correct.correct, 1);
  assert.ok(correct.score > 0);
});

test("mixer accepts any order, rejects missing, repeated and extra selections", () => {
  const question = sample("mixer", "hard", 4);
  assert.equal(question.solution.length, 3);
  const [first, second, third] = question.solution;
  const distractor = question.choices.find(({ id }) => !question.solution.includes(id)).id;
  assert.ok(isCorrect(question, [third, second, first]));
  for (const answer of [[first, second], [first, second, second], [first, second, distractor], [first, second, third, distractor]]) {
    assert.equal(isCorrect(question, answer), false);
  }
});

test("validation rejects duplicate choices, unknown clips and mismatched solutions", () => {
  const question = sample("identify");
  const [first, ...rest] = question.choices;
  assert.equal(validChallenge({ ...question, choices: [first, first, ...rest.slice(1)] }), false);
  assert.equal(validChallenge({ ...question, choices: [first, { ...rest[0], label: first.label }, ...rest.slice(1)] }), false);
  assert.equal(validChallenge({ ...question, clips: [["unavailable"]] }), false);
  const incorrect = question.choices.find(({ id }) => id !== question.solution[0]);
  assert.equal(validChallenge({ ...question, solution: [incorrect.id] }), false);
  assert.equal(validChallenge({ ...sample("difference"), clips: [["doorbell"]] }), false);
});

test("the 120-second timer starts at playback and completes at its deadline", () => {
  assert.equal(secondsLeft(null, 500_000), 120);
  assert.equal(isComplete(null, 500_000), false);
  const start = 1000;
  const deadline = sessionDeadline(start);
  assert.equal(deadline - start, 120_000);
  assert.equal(secondsLeft(deadline, start), 120);
  assert.equal(secondsLeft(deadline, deadline - 1), 1);
  assert.equal(isComplete(deadline, deadline - 1), false);
  assert.equal(secondsLeft(deadline, deadline), 0);
  assert.equal(isComplete(deadline, deadline), true);
  assert.equal(secondsLeft(deadline, deadline + 10_000), 0);
});

test("optional challenge generators keep their question counts within bounds", () => {
  for (const difficulty of difficulties) assert.equal(sample("sequence", difficulty, 1).solution.length, 2);
  assert.equal(sample("sequence", "easy", 4).solution.length, 3);
  assert.equal(sample("sequence", "hard", 4).solution.length, 5);
  assert.equal(sample("identify", "easy", 4).choices.length, 4);
  assert.equal(sample("identify", "normal", 4).choices.length, 6);
  assert.equal(sample("mixer", "easy", 4).noise, false);
  assert.equal(sample("mixer", "hard", 4).noise, true);
});

test("every correct answer awards the current level and goes up one; wrong answers go down with a floor of one", () => {
  let stats = EMPTY_STATS;
  for (const [correct, score, level] of [
    [false, 0, 1], [true, 1, 2], [true, 3, 3], [true, 6, 4],
    [false, 6, 3], [true, 9, 4], [false, 9, 3], [false, 9, 2],
    [false, 9, 1], [false, 9, 1],
  ]) {
    stats = scoreAnswer(stats, correct);
    assert.equal(stats.score, score);
    assert.equal(stats.level, level);
  }
});

test("Identify starts with familiar sounds and adapts to the player's current level", () => {
  const familiar = new Set(SOUND_PACK.filter(({ familiar }) => familiar).map(({ id }) => `sound:${id}`));
  for (let seed = 1; seed <= 40; seed++) {
    for (const level of [1, 5]) {
      const question = makeIdentifyChallenge(level, [], seededRandom(seed));
      assert.equal(question.choices.length, 4);
      assert.ok(question.choices.every(({ id }) => familiar.has(id)));
    }
    assert.equal(makeIdentifyChallenge(6, [], seededRandom(seed)).choices.length, 4);
    assert.equal(makeIdentifyChallenge(11, [], seededRandom(seed)).choices.length, 6);
  }
});

test("finishing a session produces accuracy and stars without score inflation", () => {
  let stats = EMPTY_STATS;
  for (let i = 0; i < 10; i++) stats = scoreAnswer(stats, i < 8);
  assert.equal(stats.bestStreak, 8);
  assert.equal(stats.streak, 0);
  assert.deepEqual(resultSummary(stats), { accuracy: 80, stars: 2 });
  assert.deepEqual(resultSummary(EMPTY_STATS), { accuracy: 0, stars: 0 });
});

test("audio load failures are surfaced for retry or skip", async () => {
  await assert.rejects(loadSample("/bad.wav", async () => ({ ok: false }), async () => assert.fail("do not decode a failed response")), /unavailable/);
  await assert.rejects(loadSample("/bad.wav", async () => { throw new Error("offline"); }, async () => {}), /offline/);
  const bytes = new ArrayBuffer(16);
  const success = async () => ({ ok: true, arrayBuffer: async () => bytes });
  await assert.rejects(loadSample("/bad.wav", success, async () => { throw new Error("malformed WAV"); }), /malformed/);
  assert.equal(await loadSample("/good.wav", success, async (value) => value.byteLength), 16);
});

test("all 23 bundled samples are distinct, non-silent and below the peak limit", async () => {
  const hashes = new Set();
  for (const sound of SOUND_PACK) {
    const path = new URL(`../public/audio/sound-detective/${sound.id}.wav`, import.meta.url);
    const wav = await readFile(path);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt16LE(34), 16);
    const duration = wav.readUInt32LE(40) / wav.readUInt32LE(28);
    assert.ok(duration >= 1 && duration <= 3, sound.id);
    let peak = 0;
    let energy = 0;
    for (let i = 44; i < wav.length; i += 2) {
      const sample = wav.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    assert.ok(peak > 0.1 && peak <= 0.95, sound.id);
    assert.ok(Math.sqrt(energy / ((wav.length - 44) / 2)) > 0.015, sound.id);
    hashes.add(createHash("sha256").update(wav).digest("hex"));
  }
  assert.equal(hashes.size, SOUND_PACK.length);
});

test("1,000 deterministic sessions complete with valid challenges", () => {
  const report = simulateSessions();
  assert.equal(report.passed, 1000, report.errors.slice(0, 5).join("\n"));
  assert.ok(report.challenges >= 10_000);
  assert.deepEqual(report.errors, []);
});

test("Identify schedules the bundled sample after a gesture, supports replay and recovers from a failed request", async (t) => {
  class Source extends EventTarget {
    connect(gain) { return gain; }
    disconnect() {}
    start(at) { this.at = at; }
    stop() { this.dispatchEvent(new Event("ended")); }
  }
  class Context {
    state = "suspended";
    currentTime = 3;
    destination = {};
    sources = [];
    constructor() { Context.latest = this; }
    createGain() { return { gain: { value: 1, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
    resume() { this.state = "running"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
    decodeAudioData(bytes) {
      const header = new DataView(bytes);
      assert.equal(header.getUint32(0), 0x52494646);
      return Promise.resolve({ duration: header.getUint32(40, true) / header.getUint32(28, true) });
    }
    createBufferSource() {
      const source = new Source();
      this.sources.push(source);
      return source;
    }
  }
  const originalFetch = globalThis.fetch;
  globalThis.window = { AudioContext: Context };
  const requests = [];
  let missing = true;
  globalThis.fetch = async (url) => {
    requests.push(url);
    if (missing) return { ok: false };
    const name = url.split("/").pop();
    const bytes = await readFile(new URL(`../public/audio/sound-detective/${name}`, import.meta.url));
    return new Response(bytes);
  };
  const audio = new DetectiveAudio("/audio/sound-detective/");
  t.after(() => {
    audio.dispose();
    globalThis.fetch = originalFetch;
    delete globalThis.window;
  });
  const question = sample("identify");
  const soundId = question.clips[0][0];
  await assert.rejects(audio.play(question, () => assert.fail("missing audio should not start")), /unavailable/);
  missing = false;
  for (let i = 0; i < 2; i++) {
    let started;
    const ready = new Promise((resolve) => { started = resolve; });
    const playback = audio.play(question, started);
    await ready;
    const voice = Context.latest.sources.at(-1);
    assert.equal(voice.at, 3.05);
    assert.ok(voice.buffer.duration >= 1 && voice.buffer.duration <= 3);
    if (i === 0) {
      voice.dispatchEvent(new Event("ended"));
      assert.equal(await playback, true);
    } else {
      audio.stop();
      assert.equal(await playback, false);
    }
  }
  assert.equal(Context.latest.state, "running");
  assert.deepEqual(requests, Array(2).fill(`/audio/sound-detective/${soundId}.wav`));
  assert.ok(isCorrect(question, [`sound:${soundId}`]));
});
