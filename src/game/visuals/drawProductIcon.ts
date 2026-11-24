import type { ProductDef } from "../types";

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amount in [-1,1]: negative darkens toward black, positive lightens toward white. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${Math.round(mix(r))}, ${Math.round(mix(g))}, ${Math.round(mix(b))})`;
}

/** Diagonal light-to-dark gradient over a bounding box, for a soft glossy fill. */
function glossFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string): CanvasGradient {
  const grad = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  grad.addColorStop(0, shade(base, 0.38));
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, shade(base, -0.22));
  return grad;
}

function groundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(20, 30, 20, 0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a stylized, original (non-licensed) icon for a product onto a 2D
 * canvas context. Used both to build Phaser textures (BootScene) and to
 * render <img> sources in React UI (shopping list, results), so the art
 * stays visually identical across the game and the overlay chrome.
 */
export function drawProductIcon(ctx: CanvasRenderingContext2D, product: ProductDef, size: number): void {
  const [primary, secondary] = product.colors;
  const base = primary ?? "#cccccc";
  const cx = size / 2;
  const cy = size / 2;
  const pad = size * 0.1;

  ctx.save();
  ctx.clearRect(0, 0, size, size);

  // Soft card backdrop with gentle depth, for readability against any shelf color.
  ctx.save();
  const cardGrad = ctx.createLinearGradient(0, pad * 0.3, 0, size - pad * 0.3);
  cardGrad.addColorStop(0, "rgba(255,255,255,0.97)");
  cardGrad.addColorStop(1, "rgba(242,245,240,0.94)");
  ctx.shadowColor = "rgba(20, 30, 20, 0.18)";
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetY = size * 0.02;
  roundedRectPath(ctx, pad * 0.3, pad * 0.3, size - pad * 0.6, size - pad * 0.6, size * 0.16);
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.restore();

  groundShadow(ctx, cx, cy + size * 0.3, size * 0.22, size * 0.045);

  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = Math.max(1, size * 0.018);

  switch (product.shape) {
    case "round": {
      const r = size * 0.3;
      const sphereGrad = ctx.createRadialGradient(
        cx - r * 0.35,
        cy - r * 0.4,
        r * 0.1,
        cx,
        cy + size * 0.02,
        r * 1.15
      );
      sphereGrad.addColorStop(0, shade(base, 0.45));
      sphereGrad.addColorStop(0.55, base);
      sphereGrad.addColorStop(1, shade(base, -0.25));
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.02, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();
      ctx.stroke();
      // glossy highlight
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.ellipse(cx - r * 0.4, cy - r * 0.35, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // little stem
      ctx.fillStyle = shade(secondary ?? "#3f8a3f", -0.1);
      roundedRectPath(ctx, cx - size * 0.03, cy - r - size * 0.06, size * 0.06, size * 0.1, size * 0.02);
      ctx.fill();
      break;
    }
    case "banana": {
      // A chunky curved lens, thick in the middle and pointed at both tips —
      // drawn in local space (tilted) so the taper geometry stays simple.
      ctx.save();
      ctx.translate(cx, cy + size * 0.02);
      ctx.rotate(-0.32);
      const L = size * 0.66;
      const T = size * 0.26;
      const tip1x = -L / 2;
      const tip2x = L / 2;

      const bananaGrad = ctx.createLinearGradient(0, -T, 0, T * 0.2);
      bananaGrad.addColorStop(0, shade(base, 0.4));
      bananaGrad.addColorStop(0.6, base);
      bananaGrad.addColorStop(1, shade(base, -0.2));

      ctx.beginPath();
      ctx.moveTo(tip1x, 0);
      ctx.quadraticCurveTo(0, -T, tip2x, 0);
      ctx.quadraticCurveTo(0, -T * 0.32, tip1x, 0);
      ctx.closePath();
      ctx.fillStyle = bananaGrad;
      ctx.fill();
      ctx.stroke();

      // brown tips
      ctx.fillStyle = shade("#8a6a1b", -0.1);
      ctx.beginPath();
      ctx.ellipse(tip1x + size * 0.015, -size * 0.01, size * 0.03, size * 0.02, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tip2x - size * 0.015, -size * 0.01, size * 0.03, size * 0.02, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // highlight streak
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.moveTo(tip1x + size * 0.1, -T * 0.25);
      ctx.quadraticCurveTo(0, -T * 0.75, tip2x - size * 0.1, -T * 0.25);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "leafy": {
      // Overlapping pointed leaves fanning up from a stem — reads as leafy
      // greens rather than round berries.
      const leaves = [
        [-0.2, -0.02, -0.65],
        [-0.1, -0.16, -0.3],
        [0.1, -0.16, 0.3],
        [0.2, -0.02, 0.65],
        [0, -0.22, 0],
        [-0.07, 0.1, -0.15],
        [0.07, 0.1, 0.15],
      ];
      for (const [dx, dy, rot] of leaves) {
        const px = cx + dx! * size;
        const py = cy + dy! * size;
        const leafW = size * 0.2;
        const leafH = size * 0.36;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot!);
        const g = ctx.createLinearGradient(0, -leafH / 2, 0, leafH / 2);
        g.addColorStop(0, shade(base, 0.3));
        g.addColorStop(1, shade(base, -0.15));
        ctx.beginPath();
        ctx.moveTo(0, -leafH / 2);
        ctx.quadraticCurveTo(leafW / 2, 0, 0, leafH / 2);
        ctx.quadraticCurveTo(-leafW / 2, 0, 0, -leafH / 2);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = Math.max(1, size * 0.012);
        ctx.stroke();
        ctx.strokeStyle = shade(secondary ?? base, -0.2);
        ctx.lineWidth = Math.max(1, size * 0.01);
        ctx.beginPath();
        ctx.moveTo(0, -leafH / 2 + 2);
        ctx.lineTo(0, leafH / 2 - 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = shade(secondary ?? "#2a5c2a", -0.1);
      ctx.lineWidth = Math.max(2, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.1);
      ctx.lineTo(cx, cy + size * 0.22);
      ctx.stroke();
      break;
    }
    case "carrot": {
      // Tapering cones with a leafy green top — unmistakably carrots, not
      // round produce.
      const offsets = [-0.14, 0.05, 0.2];
      for (const dx of offsets) {
        const px = cx + dx * size;
        const topY = cy - size * 0.2;
        const tipY = cy + size * 0.26;
        const w = size * 0.1;
        const g = ctx.createLinearGradient(px - w, topY, px + w, tipY);
        g.addColorStop(0, shade(base, 0.3));
        g.addColorStop(1, shade(base, -0.15));
        ctx.beginPath();
        ctx.moveTo(px - w, topY);
        ctx.lineTo(px + w, topY);
        ctx.quadraticCurveTo(px + w * 0.4, tipY * 0.5 + topY * 0.5, px, tipY);
        ctx.quadraticCurveTo(px - w * 0.4, tipY * 0.5 + topY * 0.5, px - w, topY);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = Math.max(1, size * 0.012);
        ctx.stroke();
        // leafy green top
        ctx.fillStyle = shade(secondary ?? "#3f8a3f", 0.05);
        ctx.beginPath();
        ctx.moveTo(px - w * 0.8, topY);
        ctx.lineTo(px, topY - size * 0.14);
        ctx.lineTo(px + w * 0.8, topY);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "toothbrush": {
      const handleW = size * 0.09;
      const handleH = size * 0.42;
      const hx = cx - handleW / 2;
      const hy = cy - size * 0.05;
      roundedRectPath(ctx, hx, hy, handleW, handleH, handleW / 2);
      ctx.fillStyle = glossFill(ctx, hx, hy, handleW, handleH, base);
      ctx.fill();
      ctx.stroke();

      const headW = size * 0.2;
      const headH = size * 0.16;
      const headX = cx - headW / 2;
      const headY = hy - headH + size * 0.03;
      roundedRectPath(ctx, headX, headY, headW, headH, size * 0.03);
      ctx.fillStyle = shade(secondary ?? "#e8e8e8", 0.1);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.stroke();

      ctx.strokeStyle = shade(secondary ?? "#cccccc", -0.25);
      ctx.lineWidth = Math.max(1, size * 0.012);
      for (let i = 0; i < 3; i++) {
        const ly = headY + headH * (0.25 + i * 0.28);
        ctx.beginPath();
        ctx.moveTo(headX + headW * 0.15, ly);
        ctx.lineTo(headX + headW * 0.85, ly);
        ctx.stroke();
      }
      break;
    }
    case "bottle": {
      const w = size * 0.34;
      const h = size * 0.5;
      const bx = cx - w / 2;
      const by = cy - h / 2 + size * 0.05;
      roundedRectPath(ctx, bx, by, w, h, size * 0.08);
      ctx.fillStyle = glossFill(ctx, bx, by, w, h, base);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(secondary ?? "#555555", -0.1);
      roundedRectPath(ctx, cx - w * 0.22, cy - h / 2 - size * 0.08, w * 0.44, size * 0.12, size * 0.03);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      roundedRectPath(ctx, cx - w * 0.3, cy - size * 0.02, w * 0.6, h * 0.28, size * 0.02);
      ctx.fill();
      // slim specular streak
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      roundedRectPath(ctx, bx + w * 0.14, by + h * 0.08, w * 0.12, h * 0.6, size * 0.015);
      ctx.fill();
      break;
    }
    case "sack": {
      // A gathered, tied grain sack: a wide rounded body cinched into a
      // narrow neck with a twist-tie knot, not a generic smooth blob.
      const w = size * 0.5;
      const h = size * 0.42;
      const neckW = w * 0.34;
      const neckH = size * 0.09;
      const bodyTopY = cy - h / 2 + size * 0.02;
      const neckTopY = bodyTopY - neckH;
      const bodyBottomY = cy + h / 2;

      ctx.beginPath();
      ctx.moveTo(cx - neckW / 2, neckTopY);
      ctx.lineTo(cx + neckW / 2, neckTopY);
      ctx.quadraticCurveTo(cx + w * 0.38, bodyTopY, cx + w / 2, cy);
      ctx.quadraticCurveTo(cx + w / 2, bodyBottomY - size * 0.02, cx, bodyBottomY);
      ctx.quadraticCurveTo(cx - w / 2, bodyBottomY - size * 0.02, cx - w / 2, cy);
      ctx.quadraticCurveTo(cx - w * 0.38, bodyTopY, cx - neckW / 2, neckTopY);
      ctx.closePath();
      ctx.fillStyle = glossFill(ctx, cx - w / 2, bodyTopY, w, h, base);
      ctx.fill();
      ctx.stroke();

      // twist-tie knot at the neck
      ctx.fillStyle = shade(secondary ?? "#8a5a2b", -0.1);
      ctx.beginPath();
      ctx.ellipse(cx, neckTopY - size * 0.015, neckW * 0.42, size * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(secondary ?? "#8a5a2b", -0.2);
      ctx.lineWidth = Math.max(1, size * 0.015);
      for (const dx of [-0.5, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * neckW * 0.6, neckTopY - size * 0.02);
        ctx.lineTo(cx + dx * neckW * 1.3, neckTopY - size * 0.07);
        ctx.stroke();
      }

      // gathered-cloth fold lines just below the neck
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = Math.max(1, size * 0.012);
      for (const dx of [-0.28, 0, 0.28]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * w, bodyTopY);
        ctx.lineTo(cx + dx * w * 1.3, bodyTopY + size * 0.08);
        ctx.stroke();
      }

      // label stripe + soft shine
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      roundedRectPath(ctx, cx - w * 0.3, cy - size * 0.02, w * 0.6, size * 0.1, size * 0.02);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.16, cy + h * 0.12, w * 0.13, h * 0.16, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "pouch": {
      const w = size * 0.42;
      const h = size * 0.48;
      const px = cx - w / 2;
      const py = cy - h / 2;
      roundedRectPath(ctx, px, py, w, h, size * 0.1);
      ctx.fillStyle = glossFill(ctx, px, py, w, h, base);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(secondary ?? "#d13a2b", -0.05);
      roundedRectPath(ctx, px + size * 0.04, cy - h * 0.18, w - size * 0.08, h * 0.38, size * 0.05);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      roundedRectPath(ctx, px + size * 0.06, cy - h * 0.14, w * 0.3, h * 0.14, size * 0.03);
      ctx.fill();
      // top crimp notches
      ctx.fillStyle = shade(base, 0.1);
      for (const dx of [-0.12, 0, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * size, cy - h / 2);
        ctx.lineTo(cx + dx * size - size * 0.02, cy - h / 2 - size * 0.04);
        ctx.lineTo(cx + dx * size + size * 0.02, cy - h / 2 - size * 0.04);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "box": {
      const w = size * 0.52;
      const h = size * 0.42;
      const bx = cx - w / 2;
      const by = cy - h / 2;
      roundedRectPath(ctx, bx, by, w, h, size * 0.06);
      ctx.fillStyle = glossFill(ctx, bx, by, w, h, base);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(secondary ?? "#555555", -0.08);
      roundedRectPath(ctx, bx, by, w, h * 0.3, size * 0.06);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundedRectPath(ctx, bx + w * 0.06, by + h * 0.42, w * 0.34, h * 0.16, size * 0.02);
      ctx.fill();
      break;
    }
    case "bar": {
      const w = size * 0.46;
      const h = size * 0.28;
      const bx = cx - w / 2;
      const by = cy - h / 2;
      roundedRectPath(ctx, bx, by, w, h, size * 0.08);
      ctx.fillStyle = glossFill(ctx, bx, by, w, h, base);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      roundedRectPath(ctx, bx + size * 0.04, by + size * 0.03, w - size * 0.08, h * 0.35, size * 0.04);
      ctx.fill();
      break;
    }
    case "tube": {
      const w = size * 0.26;
      const h = size * 0.5;
      const bx = cx - w / 2;
      const by = cy - h / 2;
      roundedRectPath(ctx, bx, by, w, h * 0.78, size * 0.1);
      ctx.fillStyle = glossFill(ctx, bx, by, w, h * 0.78, base);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(secondary ?? "#999999", -0.1);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + w, by);
      ctx.lineTo(cx + w * 0.2, by - size * 0.08);
      ctx.lineTo(cx - w * 0.2, by - size * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      roundedRectPath(ctx, bx + w * 0.15, by + h * 0.1, w * 0.18, h * 0.5, size * 0.015);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

const iconCache = new Map<string, string>();

/** Returns a cached data-URL for a product icon, for use in React <img> tags. */
export function getProductIconDataUrl(product: ProductDef, size = 96): string {
  const key = `${product.id}:${size}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawProductIcon(ctx, product, size);
  const url = canvas.toDataURL("image/png");
  iconCache.set(key, url);
  return url;
}
