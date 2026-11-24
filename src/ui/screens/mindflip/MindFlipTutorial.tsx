import { useMemo, useState } from "react";
import { buildTutorialQuestion, type MindFlipRule } from "../../../game/systems/mindflipEngine";
import { MindFlipSave } from "../../../game/systems/MindFlipSave";
import { SoundManager } from "../../../game/systems/SoundManager";
import { QuestionCard } from "./components/QuestionCard";
import { ColorButtons } from "./components/ColorButtons";

const STEPS: { rule: MindFlipRule; isMatch: boolean; hint: string }[] = [
  { rule: "WORD_WORD", isMatch: true, hint: "Both boxes are labelled WORD — compare what each box says." },
  { rule: "INK_INK", isMatch: false, hint: "Both boxes are labelled INK — compare the colour of the letters." },
  {
    rule: "INK_WORD",
    isMatch: true,
    hint: "Box 1 is labelled INK, box 2 is labelled WORD — compare box 1's ink colour to box 2's word.",
  },
  {
    rule: "WORD_INK",
    isMatch: false,
    hint: "Box 1 is labelled WORD, box 2 is labelled INK — compare box 1's word to box 2's ink colour.",
  },
];
const ADVANCE_DELAY = 650;
const RETRY_DELAY = 480;

export function MindFlipTutorial({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const step = STEPS[stepIndex]!;
  const question = useMemo(() => buildTutorialQuestion(step.rule, step.isMatch), [step.rule, step.isMatch]);

  function handlePick(guessMatch: boolean) {
    if (feedback) return;
    if (guessMatch === question.isMatch) {
      setFeedback("correct");
      SoundManager.pickupCorrect();
      window.setTimeout(() => {
        setFeedback(null);
        if (stepIndex < STEPS.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          MindFlipSave.setTutorialSeen();
          onDone();
        }
      }, ADVANCE_DELAY);
    } else {
      setFeedback("wrong");
      SoundManager.pickupWrong();
      window.setTimeout(() => setFeedback(null), RETRY_DELAY);
    }
  }

  return (
    <div className="overlay overlay--opaque">
      <div className="menu-logo" style={{ marginTop: "2vh" }}>
        <h1 className="title-md" style={{ color: "white" }}>
          How to Play
        </h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      <div className="mf-play-area">
        <p className="mf-match-hint">Do they match?</p>
        <QuestionCard question={question} feedback={feedback} feedbackKey={stepIndex} reduceMotion={false} />
        <p className="subtitle mf-tutorial-hint">{step.hint} Tap MATCH or NOT MATCH to continue.</p>
      </div>

      <ColorButtons onPick={handlePick} disabled={feedback === "correct"} />
    </div>
  );
}
