export type SparkIdCardEngineOptions = {
  /** Name printed in the card display box. Defaults to "Gourab". */
  name?: string;
  /** Pointer-driven parallax inside the card canvas. Defaults to true. */
  interactive?: boolean;
  /** Called once the first frame has been painted. */
  onReady?: () => void;
};

export type SparkIdCardEngineHandle = {
  destroy: () => void;
  pause: () => void;
  resume: () => void;
};

type Particle = {
  x: number;
  y: number;
  a: number;
  l: number;
  w: number;
  s: number;
};

type BadgeTransform = {
  tilt: number;
  cx: number;
  cy: number;
  shiftX: number;
  shiftY: number;
};

/* Design space of the badge itself (the existing full-screen scene uses the
   same numbers, so the card keeps its exact proportions and layout). */
const DW = 380;
const DH = 620;

/* Design space of the embeddable component: card at the bottom, lanyard
   running up and out of the top edge. */
const SCENE_W = 420;
const SCENE_H = 1000;
const CARD_TOP = 370;
const CARD_CX = SCENE_W / 2;
const CARD_CY = CARD_TOP + DH / 2;

const MASK_SCALE = 2;
const STRAP_ANGLE = 0.4;
const STRAP_LENGTH = 430;

const TIER_ALPHA = [0.52, 0.84, 1];
const TIER_WIDTH = [0.9, 1.05, 1.25];
const GLOW_TIER_WIDTH = 2.2;

/* ------------------------------------------------------------------ utils */

function h01(n: number) {
  n = n >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

function unitSeed() {
  return (Math.random() * 2147483647) | 0;
}

function rrPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

/* ---------------------------------------------------------------- the mask */

function drawText(
  c: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
) {
  const size = 170;
  c.font = `900 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const w = c.measureText(text).width;
  // Squeeze horizontally so the word can be tall like the reference type.
  const squeeze = 0.78;
  let drawSize = size;
  if (w * squeeze > maxW * 0.94 || drawSize > maxH) {
    drawSize = Math.min((drawSize * maxW * 0.94) / (w * squeeze), maxH * 0.98);
    c.font = `900 ${drawSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  }
  c.save();
  c.translate(cx, cy);
  c.scale(squeeze, 1);
  c.globalAlpha = 1;
  c.fillText(text, 0, 0);
  c.restore();
}

function buildMask(name: string): HTMLCanvasElement {
  const mw = DW * MASK_SCALE;
  const mh = DH * MASK_SCALE;
  const off = document.createElement("canvas");
  off.width = mw;
  off.height = mh;
  const cMaybe = off.getContext("2d", { willReadFrequently: true });
  if (!cMaybe) throw new Error("Could not create the ID card mask context.");
  const c = cMaybe;

  c.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
  c.fillStyle = "#000000";
  c.fillRect(0, 0, DW, DH);
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#ffffff";
  c.fillStyle = "#ffffff";

  function strokeRR(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    lw: number,
    a: number,
  ) {
    c.globalAlpha = a;
    c.lineWidth = lw;
    rrPath(c, x, y, w, h, r);
    c.stroke();
  }

  function fillRR(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    a: number,
  ) {
    c.globalAlpha = a;
    rrPath(c, x, y, w, h, r);
    c.fill();
  }

  // Faint jittery metadata scribble bands
  function scribble(
    x: number,
    y: number,
    w: number,
    h: number,
    a: number,
    seed: number,
  ) {
    c.globalAlpha = a;
    c.lineWidth = 2.6;
    const n = Math.max(3, Math.floor(w / 17));
    for (let i = 0; i < n; i++) {
      const sw = 7 + h01(seed + i * 3) * 16;
      const sx = x + (w - sw) * h01(seed + i * 7 + 1);
      const sy = y + (h01(seed + i * 11 + 5) - 0.5) * h;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + sw, sy + (h01(seed + i * 13 + 9) - 0.5) * 2.2);
      c.stroke();
    }
  }

  // Card shell ---------------------------------------------------------
  strokeRR(10.5, 10.5, 359, 599, 22, 9, 1);
  strokeRR(20, 20, 340, 580, 17, 1.6, 0.42);

  // Punch slot + clip bar
  strokeRR(151, 28, 78, 18, 9, 4.2, 1);
  fillRR(164, 15, 52, 13, 6, 0.95);

  // Header capsules
  strokeRR(33, 61, 176, 27, 8, 4.4, 0.95);
  strokeRR(234, 54, 112, 25, 7, 4.4, 0.9);
  scribble(40, 103, 138, 5, 0.8, 101);
  scribble(244, 96, 98, 5, 0.75, 211);

  // Main display box
  strokeRR(30, 124, 320, 240, 9, 8, 1);
  strokeRR(40, 134, 300, 220, 6, 1.6, 0.35);

  drawText(c, name, 190, 244, 272, 126);

  // Metadata under the display box
  scribble(36, 378, 190, 5, 0.85, 307);
  scribble(240, 377, 100, 4, 0.7, 401);

  // Long pill bar
  strokeRR(33, 394, 254, 37, 11, 4.4, 0.95);

  // Two faint lines
  scribble(38, 447, 168, 4, 0.75, 503);
  scribble(38, 459, 106, 4, 0.6, 601);

  // Bottom capsule
  strokeRR(33, 473, 136, 33, 16, 4.4, 0.95);
  scribble(38, 516, 102, 4, 0.7, 701);

  // QR block, bottom right
  strokeRR(244, 458, 102, 124, 7, 4.4, 0.95);
  strokeRR(252, 466, 28, 28, 3, 4.4, 1);
  strokeRR(252, 547, 28, 28, 3, 4.4, 1);
  strokeRR(313, 466, 28, 28, 3, 4.4, 1);
  const mods = [
    [0, 1], [2, 0], [1, 2], [3, 1], [4, 0], [5, 2],
    [0, 3], [2, 4], [4, 3], [1, 5], [3, 5], [5, 4],
    [0, 5], [2, 6], [4, 6], [6, 2], [6, 4], [5, 6],
  ];
  const cell = 12.5;
  for (let q = 0; q < mods.length; q++) {
    fillRR(250 + mods[q][0] * cell, 464 + mods[q][1] * cell, 8.5, 8.5, 2, 0.9);
  }

  return off;
}

/* -------------------------------------------------------- particle build */

function pushParticle(
  groups: Particle[][],
  lx: number,
  ly: number,
  angle: number,
  len: number,
  tier: number,
  w: number,
) {
  groups[tier].push({
    x: lx,
    y: ly,
    a: angle,
    l: len,
    w,
    s: unitSeed(),
  });
}

function sampleMask(mask: HTMLCanvasElement, groups: Particle[][]) {
  const mw = mask.width;
  const mh = mask.height;
  const c = mask.getContext("2d", { willReadFrequently: true });
  if (!c) return;
  const data = c.getImageData(0, 0, mw, mh).data;
  const M = mw / DW;

  const A = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= mw || py >= mh) return 0;
    return data[(py * mw + px) << 2];
  };

  const step = 1.85 * M;

  for (let gy = 0; gy < mh; gy += step) {
    for (let gx = 0; gx < mw; gx += step) {
      const sx = gx + Math.random() * step;
      const sy = gy + Math.random() * step;
      const ix = sx | 0;
      const iy = sy | 0;
      const a = A(ix, iy) / 255;
      if (a < 0.05) continue;

      // Slightly mottled sampling so flat areas breathe like chalk.
      if (Math.random() > 0.6 + a * 0.4) continue;

      const lx = sx / M - DW / 2;
      const ly = sy / M - DH / 2;

      const dx = A(ix + 2, iy) - A(ix - 2, iy);
      const dy = A(ix, iy + 2) - A(ix, iy - 2);
      const gm = Math.abs(dx) + Math.abs(dy);
      const tangent = Math.atan2(dx, -dy);
      const outward = Math.atan2(-dy, -dx);

      // Work out which way the local band runs so strokes hatch along it
      // (horizontal bars get horizontal dashes, side rails get vertical ones).
      let hWhite = 0;
      let vWhite = 0;
      for (let o = -12; o <= 12; o += 4) {
        if (A(ix + o, iy) > 110) hWhite++;
        if (A(ix, iy + o) > 110) vWhite++;
      }

      let angle: number;
      const isEdge = gm > 70;
      const roll = Math.random();
      if (roll < 0.46) {
        // dominant engraving direction of the reference
        angle = -0.68 + (Math.random() - 0.5) * 0.7;
      } else if (roll < 0.68) {
        angle = 0.68 + (Math.random() - 0.5) * 0.7;
      } else if (hWhite >= 5 && hWhite > vWhite) {
        angle = (roll < 0.82 ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.35;
      } else if (vWhite >= 5 && vWhite > hWhite) {
        angle = (roll < 0.82 ? 0 : Math.PI / 2) + (Math.random() - 0.5) * 0.35;
      } else if (isEdge) {
        angle = tangent + (Math.random() - 0.5) * 0.7;
      } else {
        angle = Math.random() * Math.PI * 2;
      }

      const r = Math.random();
      let tier = r < 0.22 ? 0 : r < 0.62 ? 1 : 2;
      if (a > 0.9 && Math.random() < 0.4) tier = 2;

      let soft = 0;
      for (let so = -8; so <= 8; so += 4) {
        soft +=
          A(ix + so, iy) +
          A(ix, iy + so) +
          A(ix + so, iy + so) +
          A(ix - so, iy + so);
      }
      soft /= 36 * 255;

      const deep = soft > 0.62;
      if (!deep && tier === 2 && Math.random() < 0.6) tier = 1;

      const len = deep ? 5.0 + Math.random() * 8.0 : 2.4 + Math.random() * 4.2;
      const w = 0.8 + Math.random() * 0.4;
      pushParticle(groups, lx, ly, angle, len, tier, w);

      // Fuzzy whiskers spilling out of the edges, like a dry brush.
      if (gm > 165 && Math.random() < 0.035) {
        const spikeLen = 2.5 + Math.random() * 3.5;
        pushParticle(
          groups,
          lx + (Math.random() - 0.5) * 1.6,
          ly + (Math.random() - 0.5) * 1.6,
          outward + (Math.random() - 0.5) * 0.9,
          spikeLen,
          Math.random() < 0.3 ? 2 : Math.random() < 0.6 ? 1 : 0,
          0.9 + Math.random() * 0.3,
        );
      }
    }
  }
}

/* Lanyard straps live outside the card mask, so they are built procedurally. */
function buildStraps(groups: Particle[][]) {
  const angle = STRAP_ANGLE;
  const dirX = Math.sin(angle);
  const dirY = -Math.cos(angle);
  const halfWidth = 33;
  const bands = [-1, 1];

  for (let b = 0; b < 2; b++) {
    const side = bands[b];
    const ox = 190 + side * 15;
    const oy = -34;
    const phase = side * 1.7;

    for (let t = 0; t < STRAP_LENGTH; t += 1.8) {
      const wobble =
        Math.sin(t * 0.028 + phase) * 3.0 + Math.sin(t * 0.011 - phase) * 2.0;
      const grow = Math.min(1, 0.5 + t / 58);
      const widthNow =
        halfWidth * grow * (0.93 + 0.12 * Math.sin(t * 0.017 + phase));
      const bx = ox + side * dirX * t + Math.cos(angle) * wobble * side;
      const by = oy + dirY * t + Math.sin(angle) * wobble * side;

      for (let k = -1; k <= 1; k += 0.14) {
        const off = k * widthNow;
        const edge = Math.abs(k) > 0.7;
        const centerGap = Math.abs(k) < 0.09;
        if (centerGap) continue;
        const p = edge ? 0.85 : 0.22;
        if (Math.random() > p) continue;

        const px = bx + Math.cos(angle) * off;
        const py = by + Math.sin(angle) * off;
        const tier = Math.random() < 0.2 ? 0 : Math.random() < 0.58 ? 1 : 2;
        const len = 2.8 + Math.random() * 4.4;
        const cross = Math.random() < 0.26;
        const strokeAngle = cross
          ? angle + Math.PI / 2 + (Math.random() - 0.5) * 0.7
          : angle + (Math.random() - 0.5) * 0.55;
        pushParticle(
          groups,
          px - DW / 2,
          py - DH / 2,
          strokeAngle,
          len,
          tier,
          1.4 + Math.random() * 0.6,
        );

        if (edge && Math.random() < 0.1) {
          pushParticle(
            groups,
            px - DW / 2,
            py - DH / 2,
            angle + (side < 0 ? -1.25 : 1.25) + (Math.random() - 0.5) * 0.6,
            4 + Math.random() * 6,
            Math.random() < 0.35 ? 2 : 0,
            1.15,
          );
        }
      }
    }
  }

  // Metal loop the straps thread through, sitting on the card's top edge.
  const ringCX = 190;
  const ringCY = -11;
  const ringR = 14;
  for (let a = 0; a < Math.PI * 2; a += 0.035) {
    for (let rr = -0.6; rr <= 0.6; rr += 0.6) {
      if (Math.random() < 0.3) continue;
      const rrNow = ringR + rr * 3.2;
      const px2 = ringCX + Math.cos(a) * rrNow;
      const py2 = ringCY + Math.sin(a) * rrNow * 1.3;
      pushParticle(
        groups,
        px2 - DW / 2 + (Math.random() - 0.5) * 1.4,
        py2 - DH / 2 + (Math.random() - 0.5) * 1.4,
        a + Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        2.6 + Math.random() * 3.4,
        Math.random() < 0.55 ? 2 : 1,
        1.2 + Math.random() * 0.45,
      );
    }
  }
}

/* --------------------------------------------------------------- engine */

export function createSparkIdCardEngine(
  canvas: HTMLCanvasElement,
  options: SparkIdCardEngineOptions = {},
): SparkIdCardEngineHandle {
  const name = (options.name ?? "Gourab").trim() || "Gourab";
  const interactive = options.interactive !== false;
  const ctxMaybe = canvas.getContext("2d", { alpha: true });
  if (!ctxMaybe) {
    return { destroy() {}, pause() {}, resume() {} };
  }
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const glowCanvas = document.createElement("canvas");
  const glowCtxMaybe = glowCanvas.getContext("2d", { alpha: true });
  if (!glowCtxMaybe) {
    return { destroy() {}, pause() {}, resume() {} };
  }
  const glowCtx: CanvasRenderingContext2D = glowCtxMaybe;

  const groups: Particle[][] = [[], [], []];
  const tierStart = [0, 0, 0];
  const tierEnd = [0, 0, 0];
  let segs = new Float32Array(0);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  let time = 0;
  let lastTime = 0;
  let raf = 0;
  let running = false;
  let ready = false;
  let destroyed = false;

  let pointerX = 0;
  let pointerY = 0;
  let easeX = 0;
  let easeY = 0;

  let quality = 1;
  let frameAvg = 16.7;
  let qualityTimer = 0;

  /* Mask is built once; the card layout does not depend on display size. */
  const mask = buildMask(name);
  sampleMask(mask, groups);
  // Release the mask bitmap; only the sampled particles are needed from here.
  mask.width = 1;
  mask.height = 1;
  buildStraps(groups);

  let total = 0;
  for (let i = 0; i < 3; i++) {
    tierStart[i] = total;
    total += groups[i].length;
    tierEnd[i] = total;
  }
  segs = new Float32Array(total * 4);

  /* ------------------------------------------------------------ drawing */

  function computeSegments() {
    const boil = Math.floor(time * 11);
    let n = 0;
    for (let ti = 0; ti < 3; ti++) {
      const arr = groups[ti];
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        const s = p.s;
        const r1 = h01(s + Math.imul(boil, 1013904223));
        const r2 = h01(Math.imul(s, 3) + Math.imul(boil, 1664525) + 17);
        const r3 = h01(Math.imul(s, 7) + Math.imul(boil, 22695477) + 31);
        const r4 = h01(Math.imul(s, 13) + Math.imul(boil, 2654435761) + 7);

        const o = n * 4;
        n++;

        if (
          r2 < 0.045 ||
          (ti === 0 && quality < 1 && h01(s + 977) > quality)
        ) {
          // let a few strokes rest each boil frame
          segs[o] = 0;
          segs[o + 1] = 0;
          segs[o + 2] = 0;
          segs[o + 3] = 0;
          continue;
        }

        const ang = p.a + (r1 - 0.5) * 0.38;
        const len = p.l * (0.55 + r2 * 0.95);
        const jx = p.x + (r3 - 0.5) * 0.6;
        const jy = p.y + (r4 - 0.5) * 0.6;
        const hx = Math.cos(ang) * len * 0.5;
        const hy = Math.sin(ang) * len * 0.5;

        segs[o] = jx - hx;
        segs[o + 1] = jy - hy;
        segs[o + 2] = jx + hx;
        segs[o + 3] = jy + hy;
      }
    }
  }

  function strokeTier(
    g: CanvasRenderingContext2D,
    ti: number,
    lineWidth: number,
    style: string,
  ) {
    const start = tierStart[ti] * 4;
    const end = tierEnd[ti] * 4;
    g.beginPath();
    for (let o = start; o < end; o += 4) {
      const x1 = segs[o];
      const y1 = segs[o + 1];
      if (x1 === 0 && y1 === 0 && segs[o + 2] === 0 && segs[o + 3] === 0) {
        continue;
      }
      g.moveTo(x1, y1);
      g.lineTo(segs[o + 2], segs[o + 3]);
    }
    g.lineWidth = lineWidth;
    g.strokeStyle = style;
    g.stroke();
  }

  function getBadgeTransform(): BadgeTransform {
    const tilt = -0.05 + Math.sin(time * 0.33) * 0.007 + easeY * 0.05;
    const floatY = Math.sin(time * 0.72) * 2.4;
    return {
      tilt,
      cx: offsetX + CARD_CX * scale + easeX * 10 * scale,
      cy: offsetY + CARD_CY * scale + floatY * scale,
      shiftX: -Math.sin(easeX) * 20,
      shiftY: Math.sin(easeY) * 12,
    };
  }

  function drawBadge(t: BadgeTransform) {
    ctx.save();
    ctx.translate(t.cx, t.cy);
    ctx.rotate(t.tilt);
    ctx.scale(scale, scale);
    ctx.translate(t.shiftX, t.shiftY);
    ctx.lineCap = "round";
    for (let ti = 0; ti < 3; ti++) {
      strokeTier(
        ctx,
        ti,
        TIER_WIDTH[ti],
        `rgba(255,255,255,${TIER_ALPHA[ti]})`,
      );
    }
    ctx.restore();
  }

  function drawGlow(t: BadgeTransform) {
    glowCtx.setTransform(1, 0, 0, 1, 0, 0);
    glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
    glowCtx.save();
    // Glow buffer is half the CSS size, so the whole scene is drawn at 0.5x.
    glowCtx.scale(0.5, 0.5);
    glowCtx.translate(t.cx, t.cy);
    glowCtx.rotate(t.tilt);
    glowCtx.scale(scale, scale);
    glowCtx.translate(t.shiftX, t.shiftY);
    glowCtx.lineCap = "round";
    for (let ti = 1; ti < 3; ti++) {
      strokeTier(
        glowCtx,
        ti,
        GLOW_TIER_WIDTH,
        `rgba(255,255,255,${ti === 2 ? 0.3 : 0.16})`,
      );
    }
    glowCtx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.2;
    ctx.filter = "blur(1.6px)";
    ctx.drawImage(glowCanvas, 0, 0, width, height);
    ctx.restore();
  }

  function drawFrame() {
    if (destroyed || width < 1 || height < 1) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    computeSegments();
    const t = getBadgeTransform();
    drawBadge(t);
    if (quality > 0.5) drawGlow(t);

    if (!ready) {
      ready = true;
      options.onReady?.();
    }
  }

  /* ------------------------------------------------------------- sizing */

  function applySize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w < 2 || h < 2) return;

    const nextDpr = Math.min(
      window.devicePixelRatio || 1,
      w * h > 1_600_000 ? 1.5 : 2,
    );

    if (w === width && h === height && nextDpr === dpr) return;

    width = w;
    height = h;
    dpr = nextDpr;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));

    glowCanvas.width = Math.max(2, Math.floor(w / 2));
    glowCanvas.height = Math.max(2, Math.floor(h / 2));

    scale = Math.min(width / SCENE_W, height / SCENE_H);
    offsetX = (width - SCENE_W * scale) / 2;
    offsetY = (height - SCENE_H * scale) / 2;

    // Canvas resets its bitmap on resize; repaint immediately when paused.
    if (!running) drawFrame();
  }

  // Build particles before the first paint, then size to the container.
  applySize();

  /* -------------------------------------------------------------- loop */

  function loop(now: number) {
    if (!running || destroyed) return;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    time += dt;

    frameAvg = frameAvg * 0.94 + dt * 1000 * 0.06;
    qualityTimer += dt;
    if (qualityTimer > 1.5) {
      qualityTimer = 0;
      if (frameAvg > 27 && quality > 0.65) {
        quality = Math.max(0.65, quality - 0.08);
      } else if (frameAvg < 17.5 && quality < 1) {
        quality = Math.min(1, quality + 0.05);
      }
    }

    easeX += (pointerX - easeX) * 0.05;
    easeY += (pointerY - easeY) * 0.05;

    drawFrame();
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (!running) return;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
  }

  function resume() {
    if (running || destroyed) return;
    running = true;
    lastTime = 0;
    raf = requestAnimationFrame(loop);
  }

  /* --------------------------------------------------------- visibility */

  let inView = true;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function syncPlayback() {
    const hidden = document.visibilityState === "hidden";
    if (!reduced && inView && !hidden) resume();
    else pause();
  }

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            inView = entry.isIntersecting;
            syncPlayback();
          },
          { rootMargin: "120px" },
        )
      : null;
  io?.observe(canvas);

  document.addEventListener("visibilitychange", syncPlayback);

  let resizeTimer = 0;
  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      applySize();
    }, 80);
  }

  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleResize) : null;
  ro?.observe(canvas);
  window.addEventListener("resize", scheduleResize);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function onMotionChange(event: MediaQueryListEvent) {
    reduced = event.matches;
    if (reduced) {
      pause();
      drawFrame();
    } else {
      syncPlayback();
    }
  }
  motionQuery.addEventListener?.("change", onMotionChange);

  /* ------------------------------------------------------------ pointer */

  function clamp(v: number) {
    return Math.max(-1, Math.min(1, v));
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    pointerX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    pointerY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  function onPointerLeave() {
    pointerX = 0;
    pointerY = 0;
  }

  if (interactive) {
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
  }

  // Respect reduced motion, then start only if the card is actually visible.
  if (!reduced) syncPlayback();

  return {
    pause,
    resume: syncPlayback,
    destroy() {
      destroyed = true;
      pause();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("resize", scheduleResize);
      motionQuery.removeEventListener?.("change", onMotionChange);
      window.clearTimeout(resizeTimer);
      if (interactive) {
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
      }
    },
  };
}
