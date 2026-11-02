/* dafaspace logo: the leaf with the d grows into the word leaf, and back.
   Built from Tastebook (rounds/site/anim.html; saved settings in rounds/site/anim-settings.json).
   Do not edit the motion here; change it in Tastebook and rebuild with tools/build_logo.py.

   Use:  <span id="logo"></span>
         <script src="logo-anim.js"></script>
         <script>dafaspaceLogo(document.getElementById('logo'), { height: 31, word: 'logo-word.svg' })</script>

   On load the letter builds the word. Each hover (or tap on a touch screen) toggles word and letter;
   while it moves, it ignores triggers. With prefers-reduced-motion it shows the end state at once. */
(function () {
window.dafaspaceLogo = function (host, opts = {}) {
// Word leaf W1 in the word file's units: ink x 115-627.5, y 328-439; pads 28 top and bottom, 50 sides.
const H = 167, PX = 50, PT = 28, X0 = 115, TOP = 328, R = 0.4 * H;
const BG = '#c65300', FG = '#F5F1E8';
const ease = { inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, out: t => 1 - (1 - t) ** 4, back: t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2 };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// defaults: Dafa's values of 2 Nov (scatter 0.5, swirl 5°, scale 5%, turn 5°, glow 90%, speed 0.5x)
let SCATTER = 0.3;                                                                // free scatter radius, as a share of the leaf height
const FX = { scale: 0.03, turn: 5, glow: 0.75 };                                  // letter life: scale, degrees, share of the way from paper to white
let SHAPE = 1;                                                                    // the logo's own S edge: 0 straight, 1 slight, 1.6 stronger
const EDGE = { anticip: 9, over: 15, s: 2.25, lag: 0 };                                       // right edge: draw-back and run-past in leaf units (of 167), S per speed
let SWIRL = 5 * Math.PI / 180;                                                    // how far each particle turns clockwise on its way in
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The leaf outline, as tools/leafshape.py draws it: with SHAPE > 0 the right edge has the slight S
// of the logo (a sharper top right tip, a graceful sag, a tucked bottom right belly), turned clockwise
// by TURN degrees on the bottom corner, whose arc starts at that angle so there is no kink.
// w is where a straight edge would stand. bend is the moving lean while the edge travels: it moves
// only the tip and the upper handle, so the lower half and the corner keep their smooth join.
let TURN = 3;                                                                    // the S edge's tilt, degrees (Dafa: 3; 5 tried)
function leafPath(ctx, w, bend = 0, sh = SHAPE) {
  const r = Math.min(R, w / 2);
  if (!sh) {
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w + bend, 0);
    ctx.bezierCurveTo(w + bend * .5, H * .2, w, H * .4, w, H - r);
    ctx.arc(w - r, H - r, r, 0, Math.PI / 2); ctx.lineTo(r, H);
  } else {
    const tip = 0.025 * H * sh, sag = 0.03 * H * sh, rbr = Math.min((0.40 - 0.06 * sh) * H, w / 2);
    const a = TURN * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const yc = H - rbr, ey = yc + rbr * sa, e = (ey + tip * sa) / ca, xc = w - rbr, ex = xc + rbr * ca;
    const P = [[tip, -e], [-sag, -.65 * e], [0, -.30 * e]].map(([x, y]) => [ex + x * ca - y * sa, ey + x * sa + y * ca]);
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(P[0][0] + bend, 0);
    ctx.bezierCurveTo(P[1][0] + bend * .5, P[1][1], P[2][0], P[2][1], ex, ey);
    ctx.arc(xc, yc, rbr, a, Math.PI / 2); ctx.lineTo(r, H);
  }
  ctx.arc(r, H - r, r, Math.PI / 2, Math.PI); ctx.lineTo(0, r);
  ctx.arc(r, r, r, Math.PI, Math.PI * 1.5); ctx.closePath();
}

fetch(opts.word || 'logo-word.svg').then(r => r.text()).then(svg => {
  const letters = [...svg.matchAll(/<path transform="translate\((-?[\d.]+) 0\)" d="([^"]+)"/g)].map(([, tx, d]) => {
    const nums = [...d.matchAll(/(-?\d+\.?\d*)[ ,](-?\d+\.?\d*)/g)].map(m => [+m[1] + +tx - X0 + PX, +m[2] - TOP + PT]);
    const xs = nums.map(p => p[0]), ys = nums.map(p => p[1]);
    const path = new Path2D(); const m = new DOMMatrix().translate(+tx - X0 + PX, PT - TOP);
    path.addPath(new Path2D(d), m);
    return { path, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  // particles: points inside each letter, ordered clockwise from twelve o'clock around its centre
  const STEP = 2.6;                                                                  // Dafa, 2 Nov: finer and more grain (was 3.2: about 1.5x as many)
  for (const L of letters) {
    const w = Math.ceil(L.x1 - L.x0) + 2, h = Math.ceil(L.y1 - L.y0) + 2;
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d');
    x.translate(-L.x0 + 1, -L.y0 + 1); x.fill(L.path);
    const img = x.getImageData(0, 0, w, h).data, pts = [];
    for (let yy = 0; yy < h; yy += STEP) for (let xx = 0; xx < w; xx += STEP) {
      const jx = xx + (Math.random() - .5) * STEP * .8, jy = yy + (Math.random() - .5) * STEP * .8;
      if (img[(Math.round(clamp(jy, 0, h - 1)) * w + Math.round(clamp(jx, 0, w - 1))) * 4 + 3] > 128) pts.push([jx + L.x0 - 1, jy + L.y0 - 1]);
    }
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    L.cx = cx; L.cy = cy;
    L.parts = pts.map(([px, py]) => {
      const dx = px - cx, dy = py - cy;
      const ang = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);          // 0 at twelve o'clock, growing clockwise
      const k = 1.7 + Math.random() * .6;                                          // starts this much further out from the centre
      // plus a free scatter (Dafa, 2 Nov: "more scattered at the start"), scaled live by the Scatter control
      const th = Math.random() * 2 * Math.PI, rr = Math.sqrt(Math.random());
      return { tx: px, ty: py, dx, dy, cx, cy, k, ox: Math.cos(th) * rr, oy: Math.sin(th) * rr, a: ang / (2 * Math.PI), r: .7 + Math.random() * .55 };   // radius 0.7-1.25 (was 0.9-1.6)
    });
  }
  const widths = letters.map(L => L.x1 + PX);                                       // the leaf's width once letter i is in
  const first = letters[0];

  // timeline (ms at 1x)
  // settle: the fill comes in from 75% of the flight on and overlaps it (Dafa, 2 Nov: the step from
// "almost gathered" to "filled" was abrupt); landed particles also swell until they close the gaps
// shorter overall (Dafa, 2 Nov: "shorter, but the particles keep their smoothness"): the pauses and
// the spacing between letters shrink, each particle's own flight stays 420ms. v1 (about 4s) is anim-v1.html.
// Dafa then set speed 0.5 as the starting point: the times below are those doubled, so 1x is now that pace (about 5.3s).
const T = { hold: 300, morph: 700, step: 300, sweep: 840, fly: 840, settle: 800, lead: 0.75 };   // settle 960 -> 800: the letters finish filling a little sooner (Dafa, 2 Nov)
const fillAt = (t, t0) => clamp((t - t0 - (T.sweep + T.fly) * T.lead) / T.settle);
  const start = i => T.hold + T.morph + (i - 1) * T.step;
  const END = start(letters.length - 1) + (T.sweep + T.fly) * T.lead + T.settle;

  // each new letter's own small life (Dafa, 2 Nov), all near the threshold of notice:
  // it grows from slightly small through a slight overshoot to 1, turns a little clockwise about its
  // centre and sways back, and brightens a touch and returns. p runs 0..1 over the letter's arrival.
  const LIFE = (T.sweep + T.fly) * T.lead + T.settle;
  function life(t, t0) {
    const p = clamp((t - t0) / LIFE);
    const q = clamp((t - t0) / (LIFE * .82));                                       // glow and scale run a little quicker (Dafa, 2 Nov)
    const scale = 1 - FX.scale + FX.scale * ease.out(q) + FX.scale * 1.2 * Math.sin(Math.PI * q) * (1 - q);
    const turn = FX.turn * Math.PI / 180 * Math.exp(-2.6 * p) * Math.sin(2 * Math.PI * 1.15 * p) * (1 - p);   // exactly 0 at the end
    const glow = FX.glow * Math.sin(Math.PI * q) ** 2;
    return { scale, turn, glow, done: p >= 1 };
  }
  const mix = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const around = (ctx, L, f) => { ctx.translate(L.cx, L.cy); ctx.rotate(f.turn); ctx.scale(f.scale, f.scale); ctx.translate(-L.cx, -L.cy); };

  // The right edge: two keyframes, one curve (Dafa, 2 Nov: "as if there were several keyframes, and a
  // strange jerk at the end"). It goes from the d's width to the whole word's along a single
  // cubic-bezier ease, the way an animator sets one move in After Effects: the first handle dips below
  // 0 (draws back left: Back), the second rises above 1 (runs past and returns: Past). No per-letter
  // steps, no spring. The handles' x (0.35, 0.25) and the end time keep the edge ahead of every letter
  // while it gathers (checked: at least 4 units of the 167 at each letter's mid-gathering).
  const T_GROW = start(1), T_EDGE = 3800;
  function bezierEase(x1, y1, x2, y2) {
    return x => {
      let lo = 0, hi = 1, m = .5;
      for (let k = 0; k < 40; k++) { m = (lo + hi) / 2; const bx = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3; bx < x ? lo = m : hi = m; }
      return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3;
    };
  }
  let EDGE_EASE = null;
  // Lag (Dafa, 2 Nov: the leaf ran a little too far ahead of the letters): the edge's whole move starts
  // this many ms later, letters unchanged. With a lag the leaf's edge may meet a letter that has already
  // begun to fill, and wipes it in as it passes.
  // second handle x 0.40 (was 0.25): the run-past peaks later and returns in about a tenth of the move
  // instead of a fifth (Dafa, 2 Nov: it went too far and took too long to come back)
  function simulate() { EDGE_EASE = bezierEase(.35, -EDGE.anticip / 100, .40, 1 + EDGE.over / 100); }
  const edge = t => widths[0] + (widths[widths.length - 1] - widths[0]) * EDGE_EASE(clamp((t - T_GROW - EDGE.lag) / (T_EDGE - T_GROW)));

  // The d's own spring (Dafa, 2 Nov: "a light bounce, a little springing, maybe some inertial sway").
  // At the moment the leaf sets off (or comes home) the d squashes a touch on its baseline, springs
  // back past its height and settles, keeping its volume (narrower when taller); at the same time it
  // leans against the leaf's motion, as if left behind, and sways back and forth to rest. Both are
  // damped oscillations that end at exactly 0. dir: +1 when the leaf moves right, -1 when it moves left.
  const D = { bounce: 0.07, sway: 7, dur: 1200 };                                 // Dafa's values, 2 Nov
  function dSpring(ctx, t, t0, dir, squash = true, dur = D.dur, att = .2) {
    const p = clamp((t - t0) / dur);
    if (p <= 0 || p >= 1) return;
    // Dafa, 2 Nov: the bounce was too abrupt - it began fully squashed in the first frame. Now both
    // start from rest: a soft attack over the first fifth, slower waves (1.4 and 1.2 per move), 1200ms
    const attack = ease.inOut(clamp(p / att)), env = attack * Math.exp(-3 * p) * (1 - p);
    const sq = -D.bounce * env * Math.sin(2 * Math.PI * 1.4 * p + Math.PI / 2 * (1 - attack));   // squash first, then the rise
    const lean = -dir * D.sway * Math.PI / 180 * env * Math.sin(2 * Math.PI * 1.2 * p);
    const bx = first.cx, by = first.y1;                                             // pivot: the d's foot on the baseline
    ctx.translate(bx, by); ctx.rotate(lean); if (squash) ctx.scale(1 - sq * .5, 1 + sq); ctx.translate(-bx, -by);
  }

  function draw(cv, t) {
    const ctx = cv.getContext('2d'), s = cv._s, dpr = devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * cv._m, dpr * cv._m);
    // background width: follows the letters, each widening eased
    const w = edge(t), raw = EDGE.s * (edge(t + 90) - edge(t - 90)) / 180 * 60;    // leans with the edge's speed over 180ms
    const BMAX = 0.035 * H, bend = -BMAX * Math.tanh(raw / BMAX);                    // the tip trails the motion (inertia), at most 3.5% of the height
    ctx.fillStyle = BG; leafPath(ctx, w, bend); ctx.fill();
    ctx.save(); leafPath(ctx, w, bend); ctx.clip(); ctx.fillStyle = FG;
    // the d keeps its size and place: it no longer grows into the mark's proportions and back
    // (Dafa, 2 Nov: the swell at the end of the way back and the shrink before the word looked odd)
    ctx.save(); dSpring(ctx, t, T_GROW - 120, 1); ctx.fill(first.path); ctx.restore();
    for (let i = 1; i < letters.length; i++) {
      const L = letters[i], t0 = start(i);
      if (t < t0) break;
      const crisp = fillAt(t, t0), f = life(t, t0);
      if (crisp > 0) {
        ctx.save(); around(ctx, L, f); ctx.fillStyle = mix(FG, '#ffffff', f.glow);
        ctx.globalAlpha = ease.inOut(crisp); ctx.fill(L.path); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // particles are not clipped: they gather from around the leaf into it
    ctx.fillStyle = FG;
    const S = SCATTER * H;
    for (let i = 1; i < letters.length; i++) {
      const L = letters[i], t0 = start(i);
      if (t < t0) break;
      const crisp = fillAt(t, t0);
      if (crisp >= 1) continue;
      const fade = 1 - ease.inOut(crisp) ** 2;                                       // particles leave after the fill has come in
      const f = life(t, t0);
      ctx.save(); around(ctx, L, f); ctx.fillStyle = mix(FG, '#ffffff', f.glow);
      for (const p of L.parts) {
        const pt = clamp((t - t0 - p.a * T.sweep) / T.fly);
        if (pt <= 0) continue;
        // on an arc: the particle turns clockwise about the letter's centre through SWIRL radians
        // while its distance shrinks from k to 1 and the free scatter closes
        const e = ease.out(pt), u = 1 - e, ph = -SWIRL * u, sc = 1 + (p.k - 1) * u, c = Math.cos(ph), sn = Math.sin(ph);
        const X = p.cx + (p.dx * c - p.dy * sn) * sc + p.ox * S * u, Y = p.cy + (p.dx * sn + p.dy * c) * sc + p.oy * S * u;
        // radius: large while flying, settles to its own size, then swells to STEP * .8 so neighbours merge
        const r = p.r * (1.6 - .6 * e) + (STEP * .8 - p.r) * ease.inOut(clamp(crisp * 1.4)) * e;
        ctx.globalAlpha = Math.min(1, pt * 3) * fade;
        ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // The way back: word to letter (Dafa, 2 Nov). Not the build played backwards, but its own gesture:
  // the letters let go from the right, one after another and quicker than they came; each one loosens
  // into its particles (the fill gives way to grain), and the grain flows left along soft arcs into the
  // d, which takes it in with a small swell and a glow. The leaf follows the letters home on the same
  // kind of single curve as on the way out: a slight push right first, then it draws in, runs a touch
  // past the d's width and settles. Last, the d returns to the proportions of the mark.
  const RB = { hold: 120, step: 150, crack: 260, sweep: 300, fly: 950, edgeDelay: 260, edgeDur: 1550, morph: 520 };
  const rStart = i => RB.hold + (letters.length - 1 - i) * RB.step;
  const R_EDGE_END = RB.edgeDelay + RB.edgeDur;
  // the way back ends when the last grain has reached the d (and the edge has settled), no earlier
  const D_HOME = RB.edgeDelay + RB.edgeDur * .66;                                   // the d's sway on the way home starts here
  // ... and when the d has finished swaying (it must never be cut off mid-lean)
  const endBack = () => Math.max(R_EDGE_END, rStart(1) + RB.crack * .4 + RB.sweep + RB.fly, D_HOME + D.dur + 400) + 60;
  let ENDR = endBack();
  const edgeBack = t => widths[widths.length - 1] - (widths[widths.length - 1] - widths[0]) * EDGE_EASE(clamp((t - RB.edgeDelay) / RB.edgeDur));
  const arrive = (t, p, i) => clamp((t - rStart(i) - RB.crack * .4 - (1 - p.a) * RB.sweep) / RB.fly);

  function drawBack(cv, t) {
    const ctx = cv.getContext('2d'), s = cv._s, dpr = devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * cv._m, dpr * cv._m);
    const w = edgeBack(t), raw = EDGE.s * (edgeBack(t + 90) - edgeBack(t - 90)) / 180 * 60;
    const BMAX = 0.035 * H, bend = -BMAX * Math.tanh(raw / BMAX);
    ctx.fillStyle = BG; leafPath(ctx, w, bend); ctx.fill();
    ctx.save(); leafPath(ctx, w, bend); ctx.clip();
    // the d takes the grain in: a small swell and glow while it arrives, then back to the mark's size
    let inflow = 0;
    for (let i = 1; i < letters.length; i++) { const k = clamp((t - rStart(i) - RB.crack - RB.fly * .45) / (RB.fly * .6)); inflow = Math.max(inflow, Math.sin(Math.PI * k)); }
    ctx.fillStyle = mix(FG, '#ffffff', FX.glow * .5 * inflow);                     // it brightens a little while it takes the grain in
    // On the way home (Dafa, 2 Nov): no squat, and not late. When the folding leaf and the grain reach
    // it, the d is nudged away from the word - its top swings left first - then sways a little and settles.
    // Dafa, 2 Nov: the main push came a little early. It now peaks as the folding leaf reaches the d
    // (when the edge runs past the d's width, about 0.12s later than before), with a softer start (attack .3, 1400ms).
    ctx.save(); dSpring(ctx, t, D_HOME, 1, false, D.dur + 400, .4); ctx.fill(first.path); ctx.restore();
    // the letters' fill gives way
    ctx.fillStyle = FG;
    for (let i = 1; i < letters.length; i++) {
      const go = clamp((t - rStart(i)) / RB.crack);
      if (go >= 1) continue;
      ctx.globalAlpha = 1 - ease.inOut(go); ctx.fill(letters[i].path);
    }
    ctx.globalAlpha = 1; ctx.restore();
    // the grain flows home along soft arcs, unclipped
    ctx.fillStyle = FG;
    const S = SCATTER * H * .25;
    for (let i = 1; i < letters.length; i++) {
      const L = letters[i], t0 = rStart(i);
      if (t < t0) continue;
      const appear = ease.out(clamp((t - t0) / RB.crack));
      for (const p of L.parts) {
        const e = ease.inOut(arrive(t, p, i));
        if (e >= 1) continue;
        const bx = first.cx + p.ox * S, by = first.cy + p.oy * S;                  // somewhere inside the d
        const dx = bx - p.tx, dy = by - p.ty, len = Math.hypot(dx, dy) || 1;
        const bulge = (p.k - 2) * 60 + p.oy * 18;                                   // each grain its own arc
        const cx = (p.tx + bx) / 2 - dy / len * bulge, cy = (p.ty + by) / 2 + dx / len * bulge;
        const u = 1 - e, X = u * u * p.tx + 2 * u * e * cx + e * e * bx, Y = u * u * p.ty + 2 * u * e * cy + e * e * by;
        ctx.globalAlpha = appear * (1 - clamp((e - .6) / .4));
        ctx.beginPath(); ctx.arc(X, Y, p.r * (1.15 - .55 * e), 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }


  // one canvas, `height` px tall, with a margin of one height around it for the particles
  const hpx = opts.height || 31, dpr = devicePixelRatio || 1, m = hpx;
  const cv = document.createElement('canvas');
  const wpx = widths[widths.length - 1] * hpx / H + 2 * m, hp = hpx + 2 * m;
  // no tap highlight on phones (Dafa, 2 Nov: a rectangle flashed around the logo on tap), no text
  // selection or double-tap zoom on it
  cv.style.cssText = `display:block;width:${wpx}px;height:${hp}px;margin:${-m}px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent;outline:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation`;
  host.style.webkitTapHighlightColor = 'transparent';
  cv.width = Math.ceil(wpx * dpr); cv.height = Math.ceil(hp * dpr); cv._s = hpx / H; cv._m = m;
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'dafaspace');
  host.replaceChildren(cv);
  host.style.display = 'inline-block'; host.style.width = (wpx - 2 * m) + 'px'; host.style.height = hpx + 'px';

  let t0 = null, raf = 0;
  const speed = 0.5;                                                                   // Dafa's pace (the times above are for 1x)
  const WARP = 0.55;
  const warp = x => x + WARP * (ease.inOut(x) - x);
  const INTRO = 120;
  const D_END = T.hold + T.morph;
  let lo = 0, hi = 1;
  for (let k = 0; k < 50; k++) { const mm = (lo + hi) / 2; (END * warp(mm) < D_END ? lo = mm : hi = mm); }
  const R0 = END * lo, TOTAL = INTRO + END - R0;

  // load builds the word; each hover (a tap on touch) toggles; a running animation ignores triggers.
  // Dafa, 2 Nov: on a phone only every second tap worked. Two causes: a tap made while the last
  // letters were still settling was thrown away, and Safari treats an element with a hover listener
  // as 'hover first, tap second'. So hover is listened to only where a real hover exists, a tap uses
  // click, and a tap in the last quarter of a move is kept and played when the move ends.
  let atWord = false, busy = false, queued = false, progress = 0;
  const done = () => { busy = false; if (queued) { queued = false; toggle(); } };
  const frame = now => {
    if (t0 === null) t0 = now;
    const tau = (now - t0) * speed;
    progress = tau / TOTAL;
    draw(cv, tau < INTRO ? T.hold + T.morph * (tau / INTRO) : END * warp(clamp((R0 + tau - INTRO) / END)));
    if (tau < TOTAL) raf = requestAnimationFrame(frame); else done();
  };
  const frameBack = now => {
    if (t0 === null) t0 = now;
    const x = clamp((now - t0) * speed / ENDR);
    progress = x;
    drawBack(cv, ENDR * warp(x));
    if (x < 1) raf = requestAnimationFrame(frameBack); else done();
  };
  const play = () => { cancelAnimationFrame(raf); t0 = null; simulate(); atWord = true; busy = true; progress = 0; if (reduced) { draw(cv, END); done(); return; } raf = requestAnimationFrame(frame); };
  const playBack = () => { cancelAnimationFrame(raf); t0 = null; simulate(); ENDR = endBack(); atWord = false; busy = true; progress = 0; if (reduced) { draw(cv, 0); done(); return; } raf = requestAnimationFrame(frameBack); };
  const toggle = () => { if (busy) return; progress = 0; atWord ? playBack() : play(); };
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canHover) cv.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') toggle(); });
  cv.addEventListener('click', () => {
    if (canHover) return;                                                              // a mouse already toggled on hover
    if (busy) { if (progress > .75) queued = true; return; }
    toggle();
  });
  if (opts.debug) window.__logo = { get busy() { return busy; }, get atWord() { return atWord; }, get progress() { return progress; }, get queued() { return queued; } };
  play();
});
};
})();
