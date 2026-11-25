export interface GameNode {
  id: string;
  name: string;
  emoji: string;
  /** Total score across all games needed to unlock. 0 = always unlocked. */
  unlockScore: number;
  /** Whether this game actually exists yet, vs. a "coming soon" placeholder. */
  playable: boolean;
  /** Id of the node used to compute this node's position (and, for the
   * first ring, the node this draws a spoke line back to). Null for the
   * root (MemoMart). */
  connectsTo: string | null;
  /** Direction from connectsTo, in degrees (0 = right, 90 = up, counterclockwise). */
  angleDeg: number;
  /** Distance from connectsTo, in CSS pixels on the hub's pannable canvas. */
  radius: number;
  /** Whether to draw the connector line back to connectsTo. First-ring
   * nodes (direct MemoMart spokes) draw one; ring nodes that only bridge
   * two neighbours don't — connectsTo there is just for position math. */
  drawParentLine?: boolean;
  /** Extra node ids to draw a connector line to, beyond connectsTo — used
   * for the hexagon-perimeter edges between adjacent ring nodes. */
  extraConnections?: string[];
}

/**
 * The game hub's node graph is a hexagon, not a 6-spoke wheel: all six
 * surrounding games sit on one ring, 60° apart, and every adjacent pair on
 * that ring is connected — but only every *other* ring node (ChooseMax,
 * MindFlip, and the next game) also spokes back to MemoMart. The three
 * in-between ring nodes connect only to their two ring neighbours, so each
 * node ends up with at most 3 connections, 120° apart from its own point of
 * view, and the whole thing reads as a clean hexagon with alternating
 * spokes instead of one hub radiating six lines.
 *
 * Units are plain CSS pixels on a large pannable canvas (see GameHub.tsx),
 * not percentages — the map is bigger than one screen and the player
 * scrolls/drags around it, so deeper rings have room to spread out instead
 * of being squeezed into a single fixed-size viewport.
 */
const RING_RADIUS = 180;

export const GAME_NODES: GameNode[] = [
  { id: "memomart", name: "MemoMart", emoji: "🛒", unlockScore: 0, playable: true, connectsTo: null, angleDeg: 0, radius: 0 },
  // Spoked ring nodes — connect to MemoMart and to their two ring neighbours.
  // "6 Senses" lineup: this slot was ChooseMax, now repurposed for Time
  // Detective (the Time-sense ring game) — ChooseMax's code stays on disk,
  // just unhooked from App.tsx, in case it's ever brought back.
  { id: "timedetective", name: "Time Detective", emoji: "⏳", unlockScore: 100, playable: true, connectsTo: "memomart", angleDeg: 90, radius: RING_RADIUS },
  { id: "game3", name: "MindFlip", emoji: "🔀", unlockScore: 200, playable: true, connectsTo: "memomart", angleDeg: 330, radius: RING_RADIUS },
  // FactFlip reverted to a locked placeholder — reserved for a future
  // Balance-sense game. FactFlip's own code stays on disk, unhooked from
  // App.tsx, in case it's ever brought back instead.
  { id: "game4", name: "???", emoji: "🔒", unlockScore: 300, playable: false, connectsTo: "memomart", angleDeg: 210, radius: RING_RADIUS },
  // Bridging ring nodes — connect only to their two ring neighbours, no spoke to MemoMart.
  {
    id: "game5",
    name: "Sound Detective",
    emoji: "🎧",
    unlockScore: 400,
    playable: true,
    connectsTo: "memomart",
    angleDeg: 150,
    radius: RING_RADIUS,
    drawParentLine: false,
    extraConnections: ["timedetective", "game4"],
  },
  {
    id: "game6",
    name: "Dual Drive",
    emoji: "🏎️",
    unlockScore: 500,
    playable: true,
    connectsTo: "memomart",
    angleDeg: 30,
    radius: RING_RADIUS,
    drawParentLine: false,
    extraConnections: ["timedetective", "game3"],
  },
  {
    id: "game7",
    name: "???",
    emoji: "🔒",
    unlockScore: 600,
    playable: false,
    connectsTo: "memomart",
    angleDeg: 270,
    radius: RING_RADIUS,
    drawParentLine: false,
    extraConnections: ["game3", "game4"],
  },
  // Ring 2 — a mirror of ring 1's own pattern, one layer further out: three
  // "spoke" nodes continue each ring-1 bridge outward (game5/6/7 each had
  // spare capacity, degree 2, to grow one more connection), and three new
  // "bridge" nodes sit between them, connecting only to their two ring-2
  // neighbours — exactly how game5/6/7 themselves started. Every ring-2
  // spoke ends up at degree 3 just like ring 1; every ring-2 bridge sits at
  // degree 2 with the same spare capacity to grow a ring 3 later. The whole
  // hub is a true honeycomb this way: self-similar at every ring, built
  // from the same "each node connects to at most 3 others" rule throughout.
  { id: "game8", name: "???", emoji: "🔒", unlockScore: 700, playable: false, connectsTo: "game5", angleDeg: 150, radius: 150 },
  { id: "game9", name: "???", emoji: "🔒", unlockScore: 800, playable: false, connectsTo: "game6", angleDeg: 30, radius: 150 },
  { id: "game10", name: "???", emoji: "🔒", unlockScore: 900, playable: false, connectsTo: "game7", angleDeg: 270, radius: 150 },
  {
    id: "game11",
    name: "???",
    emoji: "🔒",
    unlockScore: 1000,
    playable: false,
    connectsTo: "memomart",
    angleDeg: 90,
    radius: 330,
    drawParentLine: false,
    extraConnections: ["game8", "game9"],
  },
  {
    id: "game12",
    name: "???",
    emoji: "🔒",
    unlockScore: 1100,
    playable: false,
    connectsTo: "memomart",
    angleDeg: 330,
    radius: 330,
    drawParentLine: false,
    extraConnections: ["game9", "game10"],
  },
  {
    id: "game13",
    name: "???",
    emoji: "🔒",
    unlockScore: 1200,
    playable: false,
    connectsTo: "memomart",
    angleDeg: 210,
    radius: 330,
    drawParentLine: false,
    extraConnections: ["game10", "game8"],
  },
];

export function isGameUnlocked(node: GameNode, totalScore: number): boolean {
  return node.playable && totalScore >= node.unlockScore;
}
