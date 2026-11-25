/* =========================================================
   BuildSequence — scroll-scrubbed "blueprint → structure → complete"
   Each chapter image is turned into architectural linework at runtime
   (Sobel edge detection), so any image uploaded through the CMS works.
   ========================================================= */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (v, a, b) => clamp((v - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const LINE = [236, 230, 218];
  const INK = "#0b0c0f";

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img));
      img.onerror = () => reject(new Error("Failed to load " + src));
      img.src = src;
    });
  }

  const nextFrame = () => new Promise((r) => setTimeout(r, 0));

  /** Build grayscale "raw concrete" + edge "blueprint" canvases from one image. */
  async function processImage(img, workW) {
    const w = Math.min(workW, img.naturalWidth);
    const h = Math.round((w * img.naturalHeight) / img.naturalWidth);

    const src = document.createElement("canvas");
    src.width = w; src.height = h;
    const sctx = src.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(img, 0, 0, w, h);
    const data = sctx.getImageData(0, 0, w, h);
    const px = data.data;
    const n = w * h;

    // Luminance
    const L = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) L[i] = 0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2];

    // Grayscale "concrete" layer — slightly lifted, low contrast, cool tint
    const gray = sctx.createImageData(w, h);
    const g = gray.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const v = 30 + L[i] * 0.78;
      g[j] = v * 0.97; g[j + 1] = v * 0.985; g[j + 2] = v + 6; g[j + 3] = 255;
    }
    await nextFrame();

    // Blur (two passes of separable [1 2 1]) to suppress foliage noise
    const T = new Float32Array(n);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < h; y++) {
        const r = y * w;
        for (let x = 1; x < w - 1; x++) T[r + x] = (L[r + x - 1] + 2 * L[r + x] + L[r + x + 1]) * 0.25;
        T[r] = L[r]; T[r + w - 1] = L[r + w - 1];
      }
      for (let y = 1; y < h - 1; y++) {
        const r = y * w;
        for (let x = 0; x < w; x++) L[r + x] = (T[r - w + x] + 2 * T[r + x] + T[r + w + x]) * 0.25;
      }
    }
    await nextFrame();

    // Sobel magnitude + histogram
    const M = T; // reuse
    const BINS = 512, hist = new Uint32Array(BINS);
    const MAXM = 600;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const a = L[i - w - 1], b = L[i - w], c = L[i - w + 1];
        const d = L[i - 1], f = L[i + 1];
        const gg = L[i + w - 1], hh = L[i + w], k = L[i + w + 1];
        const gx = -a - 2 * d - gg + c + 2 * f + k;
        const gy = -a - 2 * b - c + gg + 2 * hh + k;
        const m = Math.sqrt(gx * gx + gy * gy);
        M[i] = m;
        hist[Math.min(BINS - 1, ((m / MAXM) * BINS) | 0)]++;
      }
    }
    const pct = (p) => {
      const target = n * p; let acc = 0;
      for (let b = 0; b < BINS; b++) { acc += hist[b]; if (acc >= target) return (b / BINS) * MAXM; }
      return MAXM;
    };
    const lo = pct(0.9), hi = Math.max(lo + 1, pct(0.994));

    const edge = sctx.createImageData(w, h);
    const e = edge.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const t = clamp((M[i] - lo) / (hi - lo));
      e[j] = LINE[0]; e[j + 1] = LINE[1]; e[j + 2] = LINE[2];
      e[j + 3] = t > 0 ? 18 + 237 * Math.pow(t, 0.9) : 0;
    }
    // Clear borders
    for (let x = 0; x < w; x++) { e[x * 4 + 3] = 0; e[((h - 1) * w + x) * 4 + 3] = 0; }
    for (let y = 0; y < h; y++) { e[(y * w) * 4 + 3] = 0; e[(y * w + w - 1) * 4 + 3] = 0; }

    const grayC = document.createElement("canvas"); grayC.width = w; grayC.height = h;
    grayC.getContext("2d").putImageData(gray, 0, 0);
    const edgeC = document.createElement("canvas"); edgeC.width = w; edgeC.height = h;
    edgeC.getContext("2d").putImageData(edge, 0, 0);
    src.width = src.height = 0; // free
    return { gray: grayC, edge: edgeC };
  }

  class BuildSequence {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.chapters = [];
      this.p = 0;
      this.intro = 0;
      this.onFrame = opts.onFrame || (() => {});
      this.dirty = true;
      this.resize = this.resize.bind(this);
      window.addEventListener("resize", this.resize);
      this.resize();
    }

    async load(list, onProgress = () => {}) {
      const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
      const workW = mobile ? 1100 : 1800;
      const total = list.length * 2;
      let done = 0;
      const tick = () => onProgress(++done / total);

      const imgs = await Promise.all(list.map((c) => loadImage(c.image).then((img) => { tick(); return img; }).catch(() => { tick(); return null; })));
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const img = imgs[i];
        if (!img) { tick(); continue; }
        const layers = await processImage(img, workW);
        out.push({ ...list[i], img, ...layers, height: 24 + ((i * 37) % 5) * 9.5 });
        tick();
      }
      this.chapters = out;
      this.dirty = true;
      this.render();
      return out.length;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const r = this.canvas.getBoundingClientRect();
      const W = Math.max(1, Math.round(r.width * dpr));
      const H = Math.max(1, Math.round(r.height * dpr));
      if (W === this.canvas.width && H === this.canvas.height) return;
      this.canvas.width = W; this.canvas.height = H;
      this.dpr = dpr;
      this.makeGrid();
      this.dirty = true;
      this.render();
    }

    makeGrid() {
      const { width: W, height: H } = this.canvas;
      const g = document.createElement("canvas"); g.width = W; g.height = H;
      const c = g.getContext("2d");
      const step = Math.round(88 * this.dpr);
      c.lineWidth = 1;
      for (let x = (W / 2) % step, k = 0; x < W; x += step, k++) {
        c.strokeStyle = `rgba(236,230,218,${k % 4 === 0 ? 0.07 : 0.035})`;
        c.beginPath(); c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, H); c.stroke();
      }
      for (let y = H % step, k = 0; y < H; y += step, k++) {
        c.strokeStyle = `rgba(236,230,218,${k % 4 === 0 ? 0.07 : 0.035})`;
        c.beginPath(); c.moveTo(0, Math.round(y) + 0.5); c.lineTo(W, Math.round(y) + 0.5); c.stroke();
      }
      // crosshair marks
      c.strokeStyle = "rgba(201,164,106,.35)";
      const s = 5 * this.dpr;
      for (let x = (W / 2) % (step * 4); x < W; x += step * 4) {
        for (let y = H % (step * 4); y < H; y += step * 4) {
          c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
        }
      }
      this.grid = g;
    }

    setProgress(p) { p = clamp(p); if (p !== this.p) { this.p = p; this.dirty = true; } }
    setIntro(v) { v = clamp(v); if (v !== this.intro) { this.intro = v; this.dirty = true; } }

    /** Normalised source rect for "cover" fit with zoom + horizontal focus. */
    coverRect(ch, zoom) {
      const { width: W, height: H } = this.canvas;
      const ia = ch.img.naturalWidth / ch.img.naturalHeight, ca = W / H;
      let w = 1, h = 1;
      if (ia > ca) w = ca / ia; else h = ia / ca;
      const fx = ch.focusX ?? 0.5;
      let x = (1 - w) * fx, y = (1 - h) * 0.5;
      const zw = w / zoom, zh = h / zoom;
      x += (w - zw) * 0.5; y += (h - zh) * 0.62;
      return { x, y, w: zw, h: zh };
    }

    drawSrc(src, r, alpha, y0, y1) {
      if (alpha <= 0.001 || y1 - y0 < 0.5) return;
      const { ctx } = this;
      const { width: W, height: H } = this.canvas;
      const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
      ctx.save();
      if (y0 > 0 || y1 < H) { ctx.beginPath(); ctx.rect(0, y0, W, y1 - y0); ctx.clip(); }
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, r.x * sw, r.y * sh, r.w * sw, r.h * sh, 0, 0, W, H);
      ctx.restore();
    }

    scanLine(y, color, glow, alpha) {
      if (alpha <= 0.01) return;
      const { ctx } = this;
      const W = this.canvas.width;
      const band = glow * this.dpr;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const gr = ctx.createLinearGradient(0, y - band, 0, y + band * 0.4);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(0.85, `rgba(${color},${0.22 * alpha})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, y - band, W, band * 1.4);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(${color},${0.9 * alpha})`;
      ctx.fillRect(0, Math.round(y), W, Math.max(1, this.dpr));
      ctx.restore();
    }

    state() {
      const N = this.chapters.length || 1;
      const t = this.p * N;
      const i = Math.min(N - 1, Math.floor(t));
      const u = clamp(t - i);
      const first = i === 0;
      const bp = first ? Math.max(this.intro, ramp(u, 0, 0.12)) : ramp(u, 0.05, 0.28);
      const st = ramp(u, 0.3, 0.58);
      const co = ramp(u, 0.5, 0.76);
      const inT = first ? 1 : smooth(ramp(u, 0, 0.1));
      const zoom = 1.12 - 0.12 * easeOut(u);
      return { N, i, u, bp: easeOut(bp), st: smooth(st), co: smooth(co), inT, zoom };
    }

    render() {
      if (!this.dirty) return;
      this.dirty = false;
      const { ctx } = this;
      const { width: W, height: H } = this.canvas;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H);
      if (!this.chapters.length) return;

      const s = this.state();
      const ch = this.chapters[s.i];
      const r = this.coverRect(ch, s.zoom);

      // 1. drafting grid
      const gridA = (1 - s.st) * 0.9 + 0.1 * (1 - s.co);
      if (this.grid) { ctx.globalAlpha = gridA; ctx.drawImage(this.grid, 0, 0); ctx.globalAlpha = 1; }

      const yB = H * (1 - s.bp); // blueprint drawn below this line
      const yS = H * (1 - s.st); // structure risen below this line

      // 2. blueprint linework (only above structure)
      this.drawSrc(ch.edge, r, 0.95, Math.max(yB, 0), Math.max(yB, Math.min(yS, H)));

      // 3. raw structure (grayscale) rising from the ground
      this.drawSrc(ch.gray, r, 1, yS, H);
      // linework ghosting over fresh structure
      this.drawSrc(ch.edge, r, 0.32 * (1 - s.co), yS, H);

      // 4. colour floods in
      this.drawSrc(ch.img, r, s.co, yS, H);

      // 5. scan lines
      if (s.bp > 0 && s.bp < 1) this.scanLine(yB, "236,230,218", 70, 1 - s.bp * 0.3);
      if (s.st > 0 && s.st < 1) this.scanLine(yS, "201,164,106", 120, 1);

      // 6. outgoing chapter fades away revealing the new blueprint
      if (s.inT < 1 && s.i > 0) {
        const prev = this.chapters[s.i - 1];
        this.drawSrc(prev.img, this.coverRect(prev, 1), 1 - s.inT, 0, H);
      }

      this.onFrame({ ...s, chapter: ch, level: ch.height * s.st });
    }
  }

  window.BuildSequence = BuildSequence;
})();
