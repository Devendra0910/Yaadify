import { COLOR_HEX, type MindFlipQuestion } from "../../../../game/systems/mindflipEngine";
import type { MindFlipOutcome } from "../../../../game/systems/useMindFlipRun";

export function QuestionCard({
  question,
  feedback,
  feedbackKey,
  reduceMotion,
}: {
  question: MindFlipQuestion;
  feedback: MindFlipOutcome | null;
  feedbackKey: number;
  reduceMotion: boolean;
}) {
  const feedbackClass =
    feedback === "correct"
      ? reduceMotion
        ? "mf-feedback-correct-reduced"
        : "mf-feedback-correct"
      : feedback === "wrong"
        ? reduceMotion
          ? "mf-feedback-wrong-reduced"
          : "mf-feedback-wrong"
        : "";

  return (
    <div key={feedbackKey} className="mf-boxes-row">
      <div className="mf-box-col">
        <div className="mf-box-header">{question.box1Attr}</div>
        <div className={`mf-stimulus-card mf-stimulus-card--small ${feedbackClass}`}>
          <span className="mf-word mf-word--small" style={{ color: COLOR_HEX[question.box1Ink] }}>
            {question.box1Word}
          </span>
        </div>
      </div>
      <span className="mf-vs">vs</span>
      <div className="mf-box-col">
        <div className="mf-box-header">{question.box2Attr}</div>
        <div className={`mf-stimulus-card mf-stimulus-card--small ${feedbackClass}`}>
          <span className="mf-word mf-word--small" style={{ color: COLOR_HEX[question.box2Ink] }}>
            {question.box2Word}
          </span>
        </div>
      </div>
    </div>
  );
}
