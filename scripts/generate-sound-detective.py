#!/usr/bin/env python3
"""Render the original Sound Detective demo effects as mono PCM WAV files."""
from array import array
from math import exp, pi, sin, sqrt, tanh
from pathlib import Path
from random import Random
import sys
import wave

RATE = 24000
TAU = 2 * pi
ROOT = Path(__file__).resolve().parents[1] / "public/audio/sound-detective"
rng = Random(867211)


class Clip:
    def __init__(self, seconds=1.85):
        self.samples = [0.0] * round(RATE * seconds)

    def add(self, start, duration, shape):
        index = round(start * RATE)
        for n in range(min(round(duration * RATE), len(self.samples) - index)):
            self.samples[index + n] += shape(n / RATE)

    def resonator(self, at, modes, duration, power=1):
        def struck(t):
            return power * min(1, t / .003) * sum(
                strength * sin(TAU * f * t) * exp(-loss * t)
                for f, strength, loss in modes
            )
        self.add(at, duration, struck)

    def noise(self, at, duration, power, smoothing, envelope, highpass=False):
        last = 0.0

        def sample(t):
            nonlocal last
            dry = rng.uniform(-1, 1)
            last += smoothing * (dry - last)
            return power * envelope(t) * (dry - last if highpass else last)
        self.add(at, duration, sample)

    def voice(self, at, duration, start, end, power, kind):
        phase = 0
        partials = {
            "bark": ((1, .58), (2, .49), (3, .37), (5, .18), (7, .13)),
            "meow": ((1, .65), (2, .47), (3, .36), (4, .12), (5, .10)),
            "moo": ((1, .7), (2, .28), (3, .34), (4, .21), (6, .1)),
            "whistle": ((1, 1), (2, .07)),
            "engine": ((1, .54), (2, .45), (3, .28), (6, .18), (9, .11)),
        }[kind]

        def sample(t):
            nonlocal phase
            x = t / duration
            freq = start + (end - start) * x + (start * .16 * sin(pi * x))
            phase += TAU * freq / RATE
            if kind == "bark":
                env = min(1, t / .024) * exp(-9 * t)
            else:
                env = sin(pi * x) ** .65
            tone = sum(a * sin(h * phase) for h, a in partials)
            rough = .30 * rng.uniform(-1, 1) if kind in ("bark", "engine") else 0
            return power * env * (tone + rough)
        self.add(at, duration, sample)

    def save(self, name):
        # Tail and peak safeguards keep transients gentle and files standardized.
        fade = round(.028 * RATE)
        for i in range(fade):
            self.samples[i] *= i / fade
            self.samples[-i - 1] *= i / fade
        peak = max(abs(v) for v in self.samples)
        rms = sqrt(sum(v * v for v in self.samples) / len(self.samples))
        gain = min(.70 / peak, .14 / rms)
        pcm = array("h", (round(32767 * tanh(v * gain)) for v in self.samples))
        if sys.byteorder != "little":
            pcm.byteswap()
        with wave.open(str(ROOT / f"{name}.wav"), "wb") as wav:
            wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
            wav.writeframes(pcm.tobytes())


def metallic(clip, times, base, scale=1):
    for at in times:
        f = base * rng.uniform(.83, 1.19)
        clip.resonator(at, [(f, .78, 23), (f * 1.38, .37, 35), (f * 1.92, .19, 43)], .28, scale)


def impact(clip, at, base, strength, surface):
    clip.resonator(at, [(base, .85, 31), (base * 2.21, .34, 49), (base * 4.7, .18, 62)], .25, strength)
    clip.noise(at, .10, surface, .22, lambda t: exp(-45 * t), True)


def bell(clip, at, base, duration=1, power=1):
    clip.resonator(at, [(base, .79, 3.4), (base * 2.03, .23, 6), (base * 2.74, .12, 8)], duration, power)


def make_clip(name):
    clip = Clip(2.25 if name in ("rain", "train", "thunder", "wind", "rickshaw") else 1.65)
    if name == "doorbell":
        bell(clip, .08, 687, 1.2)
        bell(clip, .55, 519, 1.06)
    elif name == "bicycle":
        for at in (.12, .40, .78, .98):
            clip.resonator(at, [(1248, .7, 6), (1797, .36, 8), (2662, .13, 11)], .56)
    elif name == "alarm":
        for at in (.08, .23, .38, .53, .88, 1.03, 1.18, 1.33):
            clip.add(at, .110, lambda t: min(1, t * 100, (.11 - t) * 100) * (
                .65 * sin(TAU * 812 * t) + .22 * sin(TAU * 1624 * t)))
    elif name == "keys":
        metallic(clip, [.12, .17, .185, .23, .32, .59, .65, .72, .75, 1.05, 1.08, 1.12], 1600)
    elif name == "coins":
        metallic(clip, [.10, .19, .28, .39, .52, .58, .63, .68, .72, .75, .78, .81], 2290)
        impact(clip, .12, 310, .32, .46)
    elif name == "utensils":
        metallic(clip, [.17, .65, .72, 1.11], 1070)
        for at in (.39, .89):
            clip.noise(at, .15, .27, .25, lambda t: sin(pi * t / .15), True)
    elif name == "unlock":
        metallic(clip, [.12, .17, .58, .64], 1350, .45)
        for at in (.39, .73, 1.05):
            impact(clip, at, 210, .76, .48)
        clip.noise(.67, .28, .64, .12, lambda t: sin(pi * t / .28), True)
    elif name == "pour":
        clip.noise(.11, 1.30, .53, .65, lambda t: sin(pi * t / 1.30) ** .52)
        for i in range(110):
            t = rng.uniform(.15, 1.44)
            f = 325 + 420 * t + rng.uniform(-140, 140)
            clip.resonator(t, [(f, .19, 120)], .041)
    elif name == "rain":
        clip.noise(.05, 2.15, .23, .29, lambda t: min(1, t * 8, (2.15 - t) * 8))
        for _ in range(120):
            t = rng.uniform(.05, 2.05)
            f = rng.uniform(500, 3300)
            clip.resonator(t, [(f, rng.uniform(.04, .21), 195)], .032)
    elif name == "wind":
        clip.noise(.02, 2.2, 1.3, .028, lambda t: sin(pi * t / 2.2) ** .7 * (.6 + .37 * sin(9 * t)))
        clip.noise(.14, 1.92, .21, .2, lambda t: sin(pi * t / 1.92) ** 2)
    elif name == "thunder":
        clip.noise(.05, 2.18, 2.7, .016, lambda t: min(1, t * 10) * exp(-1.4 * t) * (1 + .32 * sin(14 * t)))
        for at, f, power in ((.13, 54, .82), (.48, 78, .52), (.72, 43, .65), (1.12, 61, .37)):
            clip.resonator(at, [(f, power, 4.3), (f * 1.8, .22, 5.3)], .85)
    elif name == "cooker":
        for at in (.07, .61, 1.08):
            clip.noise(at, .43, .92, .43, lambda t: sin(pi * t / .43) ** .45 * (.8 + .18 * sin(110 * t)), True)
            clip.voice(at + .03, .31, 1530, 1690, .15, "whistle")
    elif name == "birds":
        for at, duration, f1, f2 in ((.09,.15,1360,2260),(.30,.12,1970,1440),(.52,.18,1450,2460),(.96,.15,1720,2300),(1.19,.17,2100,1360)):
            clip.voice(at, duration, f1, f2, .69, "whistle")
    elif name == "dog":
        for at, duration, f1, f2 in ((.10,.25,240,153),(.43,.25,214,133),(.98,.32,228,121)):
            clip.voice(at, duration, f1, f2, .9, "bark")
            clip.noise(at, .12, .22, .22, lambda t: exp(-18*t), True)
    elif name == "cat":
        clip.voice(.14, .54, 556, 326, .92, "meow")
        clip.voice(.92, .50, 603, 398, .72, "meow")
    elif name == "cow":
        clip.voice(.13, 1.41, 129, 84, 1, "moo")
        clip.voice(.27, 1.19, 140, 93, .22, "moo")
    elif name == "horn":
        for at, duration in ((.10,.33),(.72,.49)):
            for f, a in ((403,.61),(491,.63),(806,.21),(982,.17)):
                clip.add(at, duration, lambda t, f=f, a=a, d=duration: a * sin(TAU * f * t) * min(1, t * 42, (d - t) * 34))
    elif name == "train":
        clip.noise(.05, 2.15, .9, .045, lambda t: sin(pi * t / 2.15))
        for i in range(12):
            impact(clip, .11 + i * .164, 98, .38 + .23 * sin(i * pi / 12), .60)
        clip.voice(.17, .47, 298, 275, .43, "whistle")
        clip.voice(.17, .49, 385, 355, .33, "whistle")
    elif name == "rickshaw":
        clip.voice(.06, 2.10, 40, 84, 1, "engine")
        clip.noise(.09, 1.96, .28, .17, lambda t: sin(pi * t / 1.96) * (1 + .4 * sin(190 * t)))
        for i in range(17):
            impact(clip, .14 + i * .105, 128, .25, .25)
    elif name == "clap":
        for i in range(24):
            t = .12 + i * .053 + rng.uniform(-.028, .028)
            clip.noise(t, .12, rng.uniform(.7, 1.25), .52, lambda t: exp(-34*t), True)
            impact(clip, t, rng.uniform(220, 375), .22, .35)
    elif name == "steps":
        for at, f in ((.10,100),(.58,122),(1.06,110)):
            impact(clip, at, f, .8, .40)
            clip.noise(at + .045, .22, .22, .35, lambda t: sin(pi*t/.22)**2)
    elif name == "knock":
        for at in (.17, .37, .57, 1.08):
            impact(clip, at, 196, .86, .49)
    elif name == "clock":
        for at, f in ((.10,1040),(.46,790),(.82,1040),(1.18,790)):
            clip.resonator(at, [(f, .8, 134), (f * 1.8, .36, 190)], .09)
            clip.noise(at, .035, .21, .32, lambda t: exp(-150 * t), True)
    else:
        raise ValueError(name)
    return clip


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    sounds = ("doorbell keys pour utensils cooker knock unlock rain birds wind thunder dog cat cow "
              "bicycle horn train rickshaw clap steps clock coins alarm").split()
    for sound in sounds:
        make_clip(sound).save(sound)
    print(f"Rendered {len(sounds)} original demo clips to {ROOT}")
