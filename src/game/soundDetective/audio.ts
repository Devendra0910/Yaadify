import { SOUND_PACK } from "./soundPack.ts";
import type { SoundId } from "./soundPack.ts";
import type { Challenge } from "./challenges.ts";

export async function loadSample<T>(
  url: string,
  fetchSample: (url: string) => Promise<Pick<Response, "ok" | "arrayBuffer">>,
  decode: (data: ArrayBuffer) => Promise<T>,
): Promise<T> {
  const response = await fetchSample(url);
  if (!response.ok) throw new Error("Sound file unavailable");
  return decode(await response.arrayBuffer());
}

async function resumeAudio(context: AudioContext) {
  if (context.state === "running") return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio could not start")), 4000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export class DetectiveAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private clips = new Map<SoundId, Promise<AudioBuffer>>();
  private playing = new Set<AudioBufferSourceNode>();
  private revision = 0;
  private volume = 0.65;
  private endPlayback: (() => void) | null = null;

  private readonly assetDirectory: string;

  constructor(assetDirectory: string) {
    this.assetDirectory = assetDirectory;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.output) {
      this.output.gain.setTargetAtTime(this.volume * 0.74, this.context.currentTime, 0.025);
    }
  }

  prepare(): Promise<void> {
    // Call directly from the Play button so browsers can authorize Web Audio.
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return Promise.reject(new Error("Web Audio unavailable"));
    try {
      if (!this.context) {
        const context = new Audio();
        const output = context.createGain();
        output.gain.value = this.volume * 0.74;
        output.connect(context.destination);
        this.context = context;
        this.output = output;
      }
      return resumeAudio(this.context);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  preload(ids: readonly SoundId[] = SOUND_PACK.map(({ id }) => id)) {
    if (this.context) for (const id of new Set(ids)) void this.getClip(id).catch(() => {});
  }

  private getClip(id: SoundId): Promise<AudioBuffer> {
    const existing = this.clips.get(id);
    if (existing) return existing;
    const context = this.context;
    if (!context) return Promise.reject(new Error("Audio not ready"));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const clip = loadSample(
      `${this.assetDirectory}${id}.wav`,
      (url) => fetch(url, { signal: controller.signal }),
      (bytes) => context.decodeAudioData(bytes),
    ).finally(() => clearTimeout(timeout));
    this.clips.set(id, clip);
    void clip.catch(() => {
      if (this.clips.get(id) === clip) this.clips.delete(id);
    });
    return clip;
  }

  async play(challenge: Challenge, started: () => void): Promise<boolean> {
    this.stop();
    const revision = this.revision;
    await this.prepare();
    if (revision !== this.revision) return false;
    const context = this.context!;
    const output = this.output!;
    const buffers = await Promise.all(challenge.clips.map((group) => Promise.all(group.map((id) => this.getClip(id)))));
    if (revision !== this.revision) return false;

    let begin = context.currentTime + 0.05;
    const first = begin;
    let latest: AudioBufferSourceNode | null = null;
    let lastEnd = begin;
    for (const group of buffers) {
      const loudness = group.length === 1 ? 1 : 1 / Math.sqrt(group.length * 1.4);
      for (const buffer of group) {
        const source = this.schedule(buffer, begin, loudness, output);
        if (begin + buffer.duration > lastEnd) {
          latest = source;
          lastEnd = begin + buffer.duration;
        }
      }
      begin += Math.max(...group.map((buffer) => buffer.duration)) + 0.25;
    }
    if (challenge.noise) {
      const noise = context.createBuffer(1, Math.ceil((lastEnd - first) * context.sampleRate), context.sampleRate);
      const data = noise.getChannelData(0);
      let filtered = 0;
      for (let i = 0; i < data.length; i++) {
        filtered += 0.085 * (Math.random() * 2 - 1 - filtered);
        data[i] = filtered * Math.min(1, i / 600, (data.length - 1 - i) / 600);
      }
      this.schedule(noise, first, 0.065, output);
    }

    return new Promise<boolean>((resolve) => {
      this.endPlayback = () => resolve(false);
      latest!.addEventListener("ended", () => {
        if (revision === this.revision) {
          this.endPlayback = null;
          resolve(true);
        }
      }, { once: true });
      started();
    });
  }

  private schedule(buffer: AudioBuffer, at: number, loudness: number, destination: GainNode) {
    const context = this.context!;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = loudness;
    source.connect(gain);
    gain.connect(destination);
    source.addEventListener("ended", () => {
      this.playing.delete(source);
      source.disconnect();
      gain.disconnect();
    }, { once: true });
    this.playing.add(source);
    source.start(at);
    return source;
  }

  stop() {
    this.revision++;
    this.endPlayback?.();
    this.endPlayback = null;
    for (const source of this.playing) source.stop();
    this.playing.clear();
  }

  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.output = null;
    this.clips.clear();
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
}
