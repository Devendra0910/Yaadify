const WAVES = [8, 14, 25, 17, 35, 48, 31, 59, 40, 70, 52, 30, 51, 35, 21, 36, 18, 27, 13, 8];

export function Wave({ moving = false }: { moving?: boolean }) {
  return (
    <div className={`sd-wave ${moving ? "sd-wave--moving" : ""}`} aria-hidden="true">
      {WAVES.map((height, i) => <i key={i} style={{ height: `${height}%`, animationDelay: `${i * -42}ms` }} />)}
    </div>
  );
}

export function Volume({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="sd-volume flex items-center gap-3">
      <span aria-hidden="true">{value === 0 ? "♩" : "♪"}</span>
      <span>Volume</span>
      <input type="range" min="0" max="1" step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{Math.round(value * 100)}%</output>
    </label>
  );
}
