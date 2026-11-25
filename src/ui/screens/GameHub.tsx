import { useEffect, useRef } from "react";
import { GAME_NODES, isGameUnlocked, type GameNode } from "../../game/data/games";
import { isEverUnlocked, markUnlocked } from "../../game/systems/HubScores";

interface PositionedNode extends GameNode {
  px: number; // centre x on the map, in CSS pixels
  py: number; // centre y on the map, in CSS pixels
}

// The map is a large canvas the player scrolls/drags around, not a single
// screen — CENTER and MAP_SIZE are plain CSS pixels, matching the
// pannable .hub-map's fixed size (see .hub-map in index.css).
const CENTER = { x: 500, y: 500 };
const MAP_SIZE = 1000;

function computePositions(): PositionedNode[] {
  const byId = new Map<string, PositionedNode>();
  const root = GAME_NODES.find((n) => n.connectsTo === null);
  if (root) byId.set(root.id, { ...root, px: CENTER.x, py: CENTER.y });

  // Nodes are declared parent-before-child in GAME_NODES, so a single pass
  // can resolve each child's absolute position from its (already-placed)
  // parent's position plus its own angle/radius.
  for (const node of GAME_NODES) {
    if (node.connectsTo === null) continue;
    const parent = byId.get(node.connectsTo);
    if (!parent) continue;
    const rad = (node.angleDeg * Math.PI) / 180;
    byId.set(node.id, {
      ...node,
      px: parent.px + node.radius * Math.cos(rad),
      py: parent.py - node.radius * Math.sin(rad),
    });
  }

  return GAME_NODES.map((n) => byId.get(n.id)).filter((n): n is PositionedNode => !!n);
}

export function GameHub({
  gameScores,
  totalScore,
  onSelectGame,
  onLockedTap,
  onResetAll,
}: {
  /** Each playable game's own best score, keyed by game id. */
  gameScores: Record<string, number>;
  /** Sum of every playable game's best score — what unlock thresholds check against. */
  totalScore: number;
  onSelectGame: (gameId: string) => void;
  onLockedTap: (message: string) => void;
  onResetAll: () => void;
}) {
  const nodes = computePositions();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = GAME_NODES.find((node) => node.connectsTo === null);
  const ringRadius = GAME_NODES.find((node) => node.connectsTo === root?.id)?.radius ?? 0;

  const mapWrapRef = useRef<HTMLDivElement>(null);

  // Centre the map on its root game.
  useEffect(() => {
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    wrap.scrollLeft = CENTER.x - wrap.clientWidth / 2;
    wrap.scrollTop = CENTER.y - wrap.clientHeight / 2;
  }, []);

  // Scores keep decaying, but a game that was ever reached should never
  // lock the player back out — persist each newly-live-unlocked node so it
  // stays accessible even after its own score (and the total) decays.
  useEffect(() => {
    for (const node of GAME_NODES) {
      if (isGameUnlocked(node, totalScore)) markUnlocked(node.id);
    }
  }, [totalScore]);

  return (
    <div className="overlay overlay--opaque">
      <div className="menu-logo" style={{ marginTop: "2vh" }}>
        <h1 className="title-xl">Yaadify</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
          Active scores halve every hour. Once unlocked, a game stays unlocked.
        </p>
        <div className="hub-total-score">⭐ Total: {totalScore}</div>
      </div>

      <div className="hub-map-wrap" ref={mapWrapRef}>
        <div className="hub-map">
          <svg className="hub-map-svg" viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(242,169,58,0.45)" />
                <stop offset="100%" stopColor="rgba(242,169,58,0)" />
              </radialGradient>
            </defs>

            <circle cx={CENTER.x} cy={CENTER.y} r={ringRadius + 16} fill="url(#hubGlow)" />
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={0.6}
              strokeDasharray="2.2 2.2"
            />

            {nodes.flatMap((node) => {
              const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];

              if (node.connectsTo && node.drawParentLine !== false) {
                const parent = byId.get(node.connectsTo);
                if (parent) lines.push({ key: `${node.id}-parent`, x1: parent.px, y1: parent.py, x2: node.px, y2: node.py });
              }

              for (const otherId of node.extraConnections ?? []) {
                const other = byId.get(otherId);
                if (other) lines.push({ key: `${node.id}-${otherId}`, x1: node.px, y1: node.py, x2: other.px, y2: other.py });
              }

              return lines.map((line) => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={0.7}
                />
              ));
            })}
          </svg>

          {nodes.map((node) => {
            const unlocked = isGameUnlocked(node, totalScore) || isEverUnlocked(node.id);
            const isRoot = node.connectsTo === null;
            // Only reveal a score once the game is actually unlocked — a "???"
            // placeholder shouldn't leak that it secretly has a score of 0.
            const showScoreBadge = unlocked;
            return (
              <div className="hub-node" key={node.id} style={{ left: `${node.px}px`, top: `${node.py}px` }}>
                <div className="hub-circle-wrap">
                  <button
                    aria-label={unlocked ? node.name : `${node.playable ? node.name : "Locked game"} requires ${node.unlockScore} total points`}
                    className={`hub-circle ${isRoot && unlocked ? "hub-circle--root" : unlocked ? "hub-circle--unlocked" : "hub-circle--locked"}`}
                    onClick={() => {
                      if (unlocked) onSelectGame(node.id);
                      else onLockedTap(`Reach ${node.unlockScore} total pts to unlock!`);
                    }}
                  >
                    {unlocked ? (
                      <span className="hub-circle-emoji">{node.emoji}</span>
                    ) : (
                      <span className="hub-lock-content">
                        <span className="hub-lock-icon">🔒</span>
                        <span className="hub-lock-score">{node.unlockScore}</span>
                      </span>
                    )}
                  </button>
                  {showScoreBadge && <div className="hub-score-badge">{gameScores[node.id] ?? 0}</div>}
                </div>
                <div className="hub-node-label">
                  <div className="title-md" style={{ color: "white", fontSize: 14 }}>
                    {node.playable ? node.name : "???"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn--ghost btn--block"
        style={{ color: "white", margin: "0 auto 16px", maxWidth: 240 }}
        onClick={onResetAll}
      >
        Reset All Progress
      </button>
    </div>
  );
}
