export function ColorButtons({
  onPick,
  disabled,
}: {
  onPick: (isMatch: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="mf-answer-grid">
      <button className="mf-answer-btn mf-match-btn mf-match-btn--yes" disabled={disabled} onClick={() => onPick(true)}>
        ✓ MATCH
      </button>
      <button className="mf-answer-btn mf-match-btn mf-match-btn--no" disabled={disabled} onClick={() => onPick(false)}>
        ✕ NOT MATCH
      </button>
    </div>
  );
}
