/* =========================================================
   WM GROUP — site controller
   Content comes from ./content/site.json (edited via Decap CMS at /admin).
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (v, a, b) => clamp((v - a) / (b - a));
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) document.documentElement.classList.add("reduced");

  /* ---------------- i18n ---------------- */
  const I18N = {
    en: {
      loading: "Drafting the blueprint",
      navAbout: "About", navServices: "Services", navWorks: "Projects", navGallery: "Gallery", navContact: "Contact",
      stageBlueprint: "Blueprint", stageStructure: "Structure", stageComplete: "Complete",
      scrollHint: "Scroll to build",
      eyebrowAbout: "About the studio", eyebrowServices: "Services", eyebrowD2B: "From design to reality",
      eyebrowWorks: "Selected works", devTitle: "In development", eyebrowGallery: "Gallery",
      eyebrowOffices: "Offices", eyebrowContact: "Partner with us",
      servicesTitle: "Four disciplines,<br><em>one standard.</em>",
      servicesLead: "From the first sketch to the final handover, every discipline sits under one roof — so nothing is lost between design and construction.",
      worksTitle: "Projects that shape<br><em>the skyline.</em>",
      galleryTitle: "Inside <em>&amp; out.</em>",
      ctaWhatsapp: "Start a conversation", backTop: "Back to top", close: "Close",
      soundOn: "Sound on", soundOff: "Sound off",
      est: (y) => `Est. ${y}`,
      localTime: "Local time", maps: "Open in Maps", menuFoot: "Damascus · Dubai",
      images: (n) => `${n} images`, projects: (n) => `${n} projects`,
      address: "Address", copyright: (y) => `© ${y} Waleed Medaa Group`,
      phone: "Phone", featured: "Featured project",
    },
    ar: {
      loading: "جارٍ رسم المخطط",
      navAbout: "من نحن", navServices: "الخدمات", navWorks: "المشاريع", navGallery: "المعرض", navContact: "تواصل",
      stageBlueprint: "المخطط", stageStructure: "الهيكل", stageComplete: "الإنجاز",
      scrollHint: "مرّر للبناء",
      eyebrowAbout: "عن المجموعة", eyebrowServices: "الخدمات", eyebrowD2B: "من التصميم إلى الواقع",
      eyebrowWorks: "أعمال مختارة", devTitle: "قيد التطوير", eyebrowGallery: "المعرض",
      eyebrowOffices: "مكاتبنا", eyebrowContact: "تعاون معنا",
      servicesTitle: "أربعة اختصاصات،<br><em>معيار واحد.</em>",
      servicesLead: "من الرسم الأول حتى التسليم النهائي، تجتمع كل الاختصاصات تحت سقف واحد — فلا يضيع شيء بين التصميم والتنفيذ.",
      worksTitle: "مشاريع ترسم<br><em>ملامح الأفق.</em>",
      galleryTitle: "من الداخل <em>والخارج.</em>",
      ctaWhatsapp: "ابدأ المحادثة", backTop: "العودة للأعلى", close: "إغلاق",
      soundOn: "الصوت مفعّل", soundOff: "الصوت مكتوم",
      est: (y) => `تأسست ${toArabicDigits(y)}`,
      localTime: "التوقيت المحلي", maps: "افتح في الخرائط", menuFoot: "دمشق · دبي",
      images: (n) => `${toArabicDigits(n)} صورة`, projects: (n) => `${toArabicDigits(n)} مشاريع`,
      address: "العنوان", copyright: (y) => `© ${toArabicDigits(y)} مجموعة وليد ميدع`,
      phone: "الهاتف", featured: "مشروع مميز",
    },
  };

  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  function toArabicDigits(s) { return String(s ?? "").replace(/\d/g, (d) => AR_DIGITS[+d]); }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  let SITE = {};
  let LANG = "en";
  const L = (k, ...a) => { const v = I18N[LANG][k] ?? I18N.en[k]; return typeof v === "function" ? v(...a) : v; };
  const t = (v) => (v == null ? "" : typeof v === "string" ? v : v[LANG] ?? v.en ?? v.ar ?? "");
  const num = (s) => (LANG === "ar" ? toArabicDigits(s) : String(s));
  const pad2 = (n) => String(n).padStart(2, "0");
  const asset = (p) => {
    if (!p) return "";
    if (/^(https?:)?\/\//i.test(p) || p.startsWith("./") || p.startsWith("/")) return p;
    return "./" + p;
  };

  /** "Let's shape tomorrow together." → "Let's shape<br><em>tomorrow together.</em>" */
  function emSplit(text) {
    text = String(text || "").trim();
    const dot = text.search(/[.،,]\s/);
    if (dot > 0 && dot < text.length - 3) {
      return `${esc(text.slice(0, dot + 1))}<br><em>${esc(text.slice(dot + 2))}</em>`;
    }
    const words = text.split(/\s+/);
    if (words.length < 2) return esc(text);
    const k = Math.max(1, Math.ceil(words.length / 2.5));
    return `${esc(words.slice(0, -k).join(" "))}<br><em>${esc(words.slice(-k).join(" "))}</em>`;
  }

  function getLang() { return localStorage.getItem("lang") || SITE.langDefault || "en"; }
  function setLang(lang) {
    LANG = lang === "ar" ? "ar" : "en";
    localStorage.setItem("lang", LANG);
    document.documentElement.lang = LANG;
    document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  }

  const ICON_ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function whatsappUrl(e164, message) {
    const d = String(e164 || "").replace(/\D/g, "");
    if (!d) return "";
    const m = String(message || "").trim();
    return `https://wa.me/${d}${m ? `?text=${encodeURIComponent(m)}` : ""}`;
  }
  function fmtPhone(e164) {
    const d = String(e164 || "").replace(/\D/g, "");
    if (!d) return "";
    const cc = d.slice(0, 3), rest = d.slice(3);
    return `+${cc} ${rest.replace(/(\d{3})(?=\d)/g, "$1 ")}`.trim();
  }

  /* ---------------- Rendering ---------------- */
  function renderStatic() {
    $$("[data-i18n]").forEach((el) => {
      const v = L(el.dataset.i18n);
      if (v != null) el.innerHTML = v;
    });
    $("#langLabel").textContent = LANG === "ar" ? "EN" : "عربي";
    $("#navEst").textContent = L("est", SITE.brand?.established || "1998");
    $("#menuFoot").textContent = L("menuFoot");
    $("#servicesTitle").innerHTML = L("servicesTitle");
    $("#worksTitle").innerHTML = L("worksTitle");
    $("#galleryTitle").innerHTML = L("galleryTitle");
    $("#footCopy").textContent = L("copyright", new Date().getFullYear());
  }

  function renderBrand() {
    const b = SITE.brand || {};
    $("#brandName").textContent = b.name || "WM GROUP";
    if (b.logoLight) $$("#brandLogo, .loader-logo, .about-mark img").forEach((i) => (i.src = asset(b.logoLight)));
    $("#brandTagline").textContent = t(b.tagline) || "Architecture · Engineering · Design-Build";
  }

  function renderAbout() {
    const words = t(SITE.intro?.statement).split(/\s+/).filter(Boolean);
    $("#introStatement").innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
    $("#aboutP1").textContent = t(SITE.about?.p1);
    $("#aboutP2").textContent = t(SITE.about?.p2);
    const stats = Array.isArray(SITE.stats) ? SITE.stats : [];
    $("#stats").innerHTML = stats.map((s) => `
      <div class="stat rv">
        <div class="stat-num"><span class="count" data-to="${esc(s.value)}">${num(0)}</span><sup>${esc(s.suffix || "")}</sup></div>
        <div class="stat-label caps">${esc(t(s.label))}</div>
      </div>`).join("");
    $("#stats").style.display = stats.length ? "" : "none";
  }

  function renderServices() {
    const list = Array.isArray(SITE.services) ? SITE.services : [];
    $("#svcList").innerHTML = list.map((s, i) => `
      <article class="svc rv">
        <div class="ph">${s.image ? `<img src="${esc(asset(s.image))}" alt="${esc(t(s.title))}" loading="lazy">` : ""}</div>
        <span class="svc-n caps">${num(s.num || pad2(i + 1))}</span>
        <h3>${esc(t(s.title))}</h3>
        <p class="svc-body">${esc(t(s.text))}</p>
        <ul class="svc-tags">${(s.bullets || []).map((b) => `<li>${esc(t(b.bullet ?? b))}</li>`).join("")}</ul>
      </article>`).join("");
  }

  function renderD2B() {
    const d = SITE.designBuilt;
    const sec = $("#design-built");
    if (!d || !d.render || !d.built) { sec.style.display = "none"; return; }
    $("#d2bTitle").innerHTML = emSplit(t(d.title));
    $("#d2bText").textContent = t(d.text);
    $("#d2bRender").src = asset(d.render);
    $("#d2bBuilt").src = asset(d.built);
    $("#d2bRender").alt = t(d.renderLabel);
    $("#d2bBuilt").alt = t(d.builtLabel);
    $("#d2bRenderLabel").textContent = t(d.renderLabel);
    $("#d2bBuiltLabel").textContent = t(d.builtLabel);
  }

  function imagesOf(p) {
    return (Array.isArray(p.images) ? p.images : []).map((x) => asset(x?.image ?? x)).filter(Boolean);
  }

  function renderWorks() {
    const list = Array.isArray(SITE.projects) ? SITE.projects : [];
    $("#worksList").innerHTML = list.map((p, i) => {
      const imgs = imagesOf(p);
      const title = t(p.title).trim();
      return `
      <article class="work rv" data-work="${i}">
        <div class="work-frame">
          ${imgs.length > 1 ? `<span class="work-count caps">${num(1)} / ${num(imgs.length)}</span>` : ""}
          ${imgs.map((src, k) => `<img src="${esc(src)}" alt="${esc(title)}" class="${k === 0 ? "on" : ""}" loading="lazy" data-k="${k}">`).join("")}
        </div>
        <span class="work-n caps">${num(pad2(i + 1))}</span>
        <h3>${esc(title)}</h3>
        <span class="work-meta caps">${esc(t(p.meta))}</span>
        <p class="work-desc">${esc(t(p.desc))}</p>
      </article>`;
    }).join("");

    // Hovering a project cycles through its images; clicking opens them full screen
    $$(".work").forEach((w) => {
      const imgs = $$(".work-frame img", w);
      const count = $(".work-count", w);
      let k = 0, timer = null;
      const show = (n) => {
        k = (n + imgs.length) % imgs.length;
        imgs.forEach((im, j) => im.classList.toggle("on", j === k));
        if (count) count.textContent = `${num(k + 1)} / ${num(imgs.length)}`;
      };
      const frame = $(".work-frame", w);
      if (imgs.length > 1) {
        frame.addEventListener("mouseenter", () => { show(k + 1); timer = setInterval(() => show(k + 1), 1800); });
        frame.addEventListener("mouseleave", () => clearInterval(timer));
      }
      frame.addEventListener("click", () => {
        clearInterval(timer);
        openLightbox(imgs.map((im) => ({ src: im.src, cap: $("h3", w).textContent })), k);
      });
    });
  }

  let GALLERY = [];
  function renderGallery() {
    GALLERY = (Array.isArray(SITE.gallery) ? SITE.gallery : [])
      .map((g) => ({ src: asset(g?.image ?? g), cap: t(g?.caption) }))
      .filter((g) => g.src);
    $("#gallery").style.display = GALLERY.length ? "" : "none";
    $("#galleryCount").textContent = L("images", GALLERY.length);
    $("#galleryTrack").innerHTML = GALLERY.map((g, i) => `
      <figure class="g-item clip-rv" data-i="${i}">
        <img src="${esc(g.src)}" alt="${esc(g.cap)}" loading="lazy" decoding="async">
        ${g.cap ? `<figcaption class="caps">${esc(g.cap)}</figcaption>` : ""}
      </figure>`).join("");
    $$(".g-item").forEach((el) => el.addEventListener("click", () => openLightbox(GALLERY, +el.dataset.i)));
  }

  function officeData() {
    const c = SITE.partner?.contact || {};
    const links = Array.isArray(c.addressLinks) ? c.addressLinks : [];
    const phones = [c.phoneE164, c.phone2E164];
    return links.map((l, i) => {
      const text = t(l.text);
      const [head, ...rest] = text.split(/\s+[—–-]\s+/);
      const city = head.split(/[،,]/)[0].trim();
      const country = head.split(/[،,]/).slice(1).join(",").trim();
      const isDubai = /dubai|دبي|uae|الإمارات/i.test(text);
      return { city, country, address: rest.join(" — ") || text, url: l.url, phone: (phones[i] || "").trim(), tz: isDubai ? "Asia/Dubai" : "Asia/Damascus" };
    });
  }

  function renderOffices() {
    const offices = officeData();
    $("#officesGrid").style.display = offices.length ? "" : "none";
    $("#officesGrid").innerHTML = offices.map((o, i) => `
      <div class="office rv">
        <span class="caps" style="color:var(--muted)">${num(pad2(i + 1))} — ${esc(o.country)}</span>
        <h3 class="office-city">${esc(o.city)}</h3>
        <span class="office-time caps" data-tz="${esc(o.tz)}"></span>
        <div class="office-addr">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noreferrer">${esc(o.address)}</a>` : esc(o.address)}</div>
        ${o.phone ? `<a class="office-phone" href="tel:${esc(o.phone.replace(/\s/g, ""))}">${esc(fmtPhone(o.phone))}</a>` : ""}
      </div>`).join("");
    tickClocks();
  }
  function tickClocks() {
    $$(".office-time").forEach((el) => {
      try {
        const time = new Intl.DateTimeFormat(LANG === "ar" ? "ar-SY" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: el.dataset.tz }).format(new Date());
        el.textContent = `${L("localTime")} · ${time}`;
      } catch (e) { el.textContent = ""; }
    });
  }

  function renderContact() {
    const p = SITE.partner || {};
    const c = p.contact || {};
    $("#contactTitle").innerHTML = emSplit(t(p.title));
    $("#contactDesc").textContent = t(p.desc);
    const bg = p.image && !/logo/i.test(p.image) ? p.image : (SITE.chapters?.[1]?.image || "");
    $("#contactBg").style.backgroundImage = bg ? `url('${asset(bg)}')` : "";

    const wa = whatsappUrl(c.whatsappNumberE164, t(c.whatsappMessage));
    const cta = $("#contactCta");
    cta.style.display = wa ? "" : "none";
    if (wa) cta.href = wa;

    const igName = (c.instagramName || "").trim();
    const igUrl = c.instagramUrl || (igName ? `https://instagram.com/${igName}` : "");
    $("#footIg").href = igUrl || "#";
    $("#footIg").style.display = igUrl ? "" : "none";

    const row = (label, value, href, ext) => `
      <a class="c-row" href="${esc(href)}"${ext ? ' target="_blank" rel="noreferrer"' : ""}>
        <span class="caps">${esc(label)}</span>
        <span class="c-val">${value}</span>
        <span class="c-arrow">${ICON_ARROW}</span>
      </a>`;
    const rows = [];
    if (c.email) rows.push(row(t(c.emailLabel) || "Email", esc(c.email), `mailto:${c.email}`));
    if (wa) rows.push(row(t(c.whatsappLabel) || "WhatsApp", `<span class="ltr">${esc(fmtPhone(c.whatsappNumberE164))}</span>`, wa, true));
    if (igUrl) rows.push(row(t(c.instagramLabel) || "Instagram", `<span class="ltr">@${esc(igName || "instagram")}</span>`, igUrl, true));
    $("#contactRows").innerHTML = rows.join("");
  }

  function renderAll() {
    renderStatic();
    renderBrand();
    renderAbout();
    renderServices();
    renderD2B();
    renderWorks();
    renderGallery();
    renderOffices();
    renderContact();
    buildUI.relabel();
  }

  /* ---------------- Build sequence UI ---------------- */
  const buildUI = (() => {
    const sec = $("#build");
    const l1 = $("#buildL1"), l2 = $("#buildL2");
    const idx = $("#buildIndex"), name = $("#buildName"), loc = $("#buildLoc");
    const ticksEl = $("#buildTicks"), stagesEl = $("#buildStages"), level = $("#buildLevel"), hint = $("#buildHint");
    const TICKS = 44;
    let seq = null, chapters = [], cur = -1, lastStage = -1, lastTick = -1;

    ticksEl.innerHTML = Array.from({ length: TICKS }, () => "<i></i>").join("");
    const ticks = $$("i", ticksEl);

    function setText(i) {
      const c = chapters[i];
      if (!c) return;
      l1.textContent = t(c.line1);
      l2.textContent = t(c.line2);
      name.textContent = t(c.project);
      loc.textContent = t(c.location);
      idx.textContent = chapters.length > 1 ? `${num(pad2(i + 1))} / ${num(pad2(chapters.length))}` : L("featured");
    }

    function styleLine(el, a, out) {
      const o = a * out;
      const y = (1 - a) * 36 - (1 - out) * 26;
      const blur = (1 - a) * 10 + (1 - out) * 8;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
      el.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "none";
    }

    function onFrame(s) {
      if (s.i !== cur) { cur = s.i; setText(cur); }
      const last = s.i === s.N - 1;
      let a1, a2;
      if (s.i === 0) {
        const intro = seq ? seq.intro : 1;
        a1 = Math.max(ramp(intro, 0.25, 0.75), ramp(s.u, 0, 0.1));
        a2 = Math.max(ramp(intro, 0.45, 0.95), ramp(s.u, 0, 0.14));
      } else {
        a1 = ramp(s.u, 0.06, 0.2);
        a2 = ramp(s.u, 0.12, 0.28);
      }
      const out = last ? 1 : 1 - ramp(s.u, 0.84, 0.97);
      styleLine(l1, a1, out);
      styleLine(l2, a2, out);

      const stage = s.co > 0.5 ? 2 : s.st > 0.02 ? 1 : 0;
      if (stage !== lastStage) {
        lastStage = stage;
        $$("span", stagesEl).forEach((sp, k) => sp.classList.toggle("on", k <= stage));
      }
      level.textContent = `+ ${num(s.level.toFixed(2).padStart(5, "0"))} m`;

      const p = (s.i + s.u) / s.N;
      const tk = Math.round(p * (TICKS - 1));
      if (tk !== lastTick) {
        lastTick = tk;
        const per = (TICKS - 1) / s.N;
        ticks.forEach((el, k) => {
          el.classList.toggle("on", k <= tk);
          el.classList.toggle("now", k === tk);
          el.classList.toggle("major", Math.abs(k / per - Math.round(k / per)) < 0.5 / per);
        });
      }
      hint.style.opacity = p > 0.015 ? 0 : 1;
    }

    function progress() {
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - window.innerHeight;
      return total > 0 ? clamp(-r.top / total) : 0;
    }

    function sizeSection() {
      const n = chapters.length || 1;
      sec.style.height = REDUCED ? "100svh" : `calc(${n === 1 ? 170 : n * 150}svh + 100svh)`;
    }

    async function init(onLoad) {
      chapters = (Array.isArray(SITE.chapters) ? SITE.chapters : []).filter((c) => c && c.image).map((c) => ({ ...c, image: asset(c.image) }));
      if (!chapters.length) { sec.style.display = "none"; onLoad(1); return; }
      sizeSection();
      seq = new window.BuildSequence($("#buildCanvas"), { onFrame });
      const okCount = await seq.load(chapters, onLoad);
      chapters = seq.chapters;
      if (!okCount) { sec.style.display = "none"; return; }
      sizeSection();
      if (REDUCED) { seq.setIntro(1); seq.setProgress(0.9 / chapters.length); }
      setText(0);
      const loop = () => {
        if (!REDUCED) seq.setProgress(progress());
        seq.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    function playIntro() {
      if (!seq) return;
      if (REDUCED) { seq.setIntro(1); return; }
      const o = { v: 0 };
      gsap.to(o, { v: 1, duration: 2.6, ease: "power2.inOut", onUpdate: () => seq.setIntro(o.v) });
    }

    function relabel() {
      if (!seq) return;
      chapters = seq.chapters;
      if (cur >= 0) setText(cur);
      seq.dirty = true;
    }

    return { init, playIntro, relabel, end: () => sec.offsetTop + sec.offsetHeight };
  })();

  /* ---------------- Smooth scroll + header ---------------- */
  let lenis = null;
  function initScroll() {
    if (!REDUCED && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.9 });
      lenis.on("scroll", () => window.ScrollTrigger && ScrollTrigger.update());
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    $$("[data-scroll]").forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || !id.startsWith("#")) return;
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      document.body.classList.remove("menu-open");
      $("#menuBtn").setAttribute("aria-expanded", "false");
      if (lenis) { lenis.start(); lenis.scrollTo(target, { duration: 1.6 }); }
      else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: REDUCED ? "auto" : "smooth" });
    }));

    const nav = $("#nav");
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const pastHero = y > buildUI.end() - 90;
      nav.classList.toggle("is-solid", pastHero);
      const down = y > lastY + 2, up = y < lastY - 2;
      if (pastHero && down && !document.body.classList.contains("menu-open")) nav.classList.add("is-hidden");
      else if (up || !pastHero) nav.classList.remove("is-hidden");
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    $("#menuBtn").addEventListener("click", () => {
      const open = document.body.classList.toggle("menu-open");
      $("#menuBtn").setAttribute("aria-expanded", String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
    });
  }

  /* ---------------- Lightbox ---------------- */
  let LB = { items: [], i: 0 };
  function openLightbox(items, i) {
    LB = { items, i };
    showLb();
    $("#lightbox").classList.add("open");
    if (lenis) lenis.stop();
  }
  function showLb() {
    const it = LB.items[LB.i];
    if (!it) return;
    $("#lbImg").src = it.src;
    $("#lbCap").textContent = `${it.cap ? it.cap + "  ·  " : ""}${num(LB.i + 1)} / ${num(LB.items.length)}`;
  }
  function closeLb() { $("#lightbox").classList.remove("open"); if (lenis) lenis.start(); }
  function stepLb(d) { LB.i = (LB.i + d + LB.items.length) % LB.items.length; showLb(); }
  function initLightbox() {
    $("#lbClose").addEventListener("click", closeLb);
    $("#lbPrev").addEventListener("click", () => stepLb(-1));
    $("#lbNext").addEventListener("click", () => stepLb(1));
    $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLb(); });
    document.addEventListener("keydown", (e) => {
      if (!$("#lightbox").classList.contains("open")) return;
      const rtl = LANG === "ar";
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") stepLb(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") stepLb(rtl ? 1 : -1);
    });
    let x0 = null;
    $("#lightbox").addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    $("#lightbox").addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) stepLb((dx < 0 ? 1 : -1) * (LANG === "ar" ? -1 : 1));
      x0 = null;
    });
  }

  /* ---------------- Scroll animations ---------------- */
  let mm = null;
  function initAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (mm) mm.revert();
    ScrollTrigger.getAll().forEach((st) => st.kill());
    mm = gsap.matchMedia();

    if (REDUCED) {
      $$(".count").forEach((el) => (el.textContent = num(el.dataset.to)));
      $$(".statement .w").forEach((w) => (w.style.opacity = 1));
      return;
    }

    // Anything already scrolled past (e.g. after a language switch) shows immediately
    $$(".rv, .clip-rv").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
        el.classList.remove("rv", "clip-rv");
        gsap.set(el, { clearProps: "opacity,transform,clipPath" });
      }
    });

    // Generic reveals
    ScrollTrigger.batch(".rv", {
      start: "top 88%",
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.08, overwrite: true }),
    });

    // Clip reveals (images rise like the hero)
    $$(".clip-rv").forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });

    // Statement — words light up as you read
    const words = $$(".statement .w");
    if (words.length) {
      gsap.to(words, {
        opacity: 1, stagger: 0.1, ease: "none",
        scrollTrigger: { trigger: "#introStatement", start: "top 80%", end: "bottom 45%", scrub: true },
      });
    }

    // Stats count-up
    $$(".count").forEach((el) => {
      const to = parseFloat(el.dataset.to) || 0;
      const o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 2.2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => (el.textContent = num(Math.round(o.v))),
      });
    });

    // Design → built parallax
    gsap.fromTo("#d2bRender", { yPercent: -6 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".d2b-pair", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo("#d2bBuilt", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".d2b-pair", start: "top bottom", end: "bottom top", scrub: true } });

    // Contact background drift
    gsap.fromTo("#contactBg", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: "#contact", start: "top bottom", end: "bottom top", scrub: true } });

    ScrollTrigger.refresh();
  }

  /* ---------------- Boot ---------------- */
  async function boot() {
    try {
      const res = await fetch("./content/site.json", { cache: "no-store" });
      if (!res.ok) throw new Error("site.json " + res.status);
      SITE = await res.json();
    } catch (e) {
      console.warn("[WM] content failed to load", e);
      SITE = {};
    }
    setLang(getLang());
    renderAll();
    initScroll();
    initLightbox();

    const pctEl = $("#loaderPct"), bar = $("#loaderBar");
    let shown = 0;
    const onLoad = (p) => {
      shown = Math.max(shown, p);
      pctEl.textContent = num(pad2(Math.round(shown * 99)));
      bar.style.transform = `scaleX(${shown})`;
    };

    const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 12000));
    await Promise.race([Promise.all([buildUI.init(onLoad), fonts]), timeout]).catch((e) => console.warn(e));

    onLoad(1);
    pctEl.textContent = num("100");
    await new Promise((r) => setTimeout(r, 250));
    $("#loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    window.scrollTo(0, window.scrollY);
    initAnimations();
    buildUI.playIntro();
    setInterval(tickClocks, 30000);

    $("#langToggle").addEventListener("click", () => {
      setLang(LANG === "en" ? "ar" : "en");
      renderAll();
      initAnimations();
    });

    let rz;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => ScrollTrigger.refresh(), 200); });
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  boot();
})();
