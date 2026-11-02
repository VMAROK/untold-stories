// Fade the cards in one after another when the page loads
document.querySelectorAll(".card").forEach((card, i) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(20px)";
  card.style.transition = "opacity 0.8s ease, transform 0.8s ease";
  setTimeout(() => {
    card.style.opacity = "1";
    card.style.transform = "translateY(0)";
  }, 300 + i * 150);
});

// Build the sound waveform in the About section
const wave = document.querySelector(".waveform");
if (wave) {
  const bars = 90;
  for (let i = 0; i < bars; i++) {
    const bar = document.createElement("i");
    // taller in the middle, quieter at the edges, with some randomness
    const center = 1 - Math.abs(i - bars * 0.55) / (bars * 0.55);
    const h = Math.max(4, (center * 0.8 + Math.random() * 0.4) * 80 * center);
    bar.style.height = h + "px";
    bar.style.animationDelay = (Math.random() * -1.6) + "s";
    wave.appendChild(bar);
  }
}

// Highlight the nav link for the section on screen
const links = document.querySelectorAll(".nav:not(.pnav) .nav-links a");   // home page navbar only
const sections = ["home", "portfolio", "about", "contact"]
  .map((id) => document.getElementById(id))
  .filter(Boolean);

window.addEventListener("scroll", () => {
  let current = "home";
  sections.forEach((s) => {
    if (window.scrollY >= s.getBoundingClientRect().top + window.scrollY - 200) current = s.id;
  });
  links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current));
});

// Contact form: show a thank-you note (no real sending yet)
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    note.textContent = "Thanks! Your message is ready to send once a backend is hooked up.";
    form.reset();
  });
}

// Divider quote: wrap each word so it can fade in on its own
const quote = document.getElementById("quote");
if (quote) {
  let i = 0;
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {                       // plain text
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement("span");
          s.className = "w"; s.textContent = part; s.style.setProperty("--i", i++);
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        wrap(n);                                     // e.g. the <em> around "reality"
      }
    });
  };
  wrap(quote);
}

// Portfolio views: a card with data-open="<id>" opens that full-screen view
const openFolio = (id) => {
  const el = document.getElementById(id);
  if (!el || !el.classList.contains("folio")) return;
  if (el.classList.contains("open")) return;
  el.hidden = false;
  el.scrollTop = 0;
  requestAnimationFrame(() => el.classList.add("open"));
  document.body.classList.add("folio-open");
  // stagger the rows in
  el.querySelectorAll(".sp").forEach((row, i) => (row.style.transitionDelay = 0.15 + i * 0.08 + "s"));
};
const closeFolio = () => {
  document.querySelectorAll(".folio.open").forEach((el) => {
    el.classList.remove("open");
    el.querySelectorAll(".sp").forEach((row) => (row.style.transitionDelay = "0s"));
    setTimeout(() => (el.hidden = true), 600);
  });
  document.body.classList.remove("folio-open");
};

document.querySelectorAll(".card[data-open]").forEach((card) => {
  card.style.cursor = "pointer";
  card.addEventListener("click", (e) => {
    e.preventDefault();
    history.pushState({ folio: card.dataset.open }, "", "#" + card.dataset.open);
    openFolio(card.dataset.open);
  });
});
document.querySelectorAll(".folio [data-close]").forEach((btn) =>
  btn.addEventListener("click", () => {
    if (history.state && history.state.folio) history.back();   // also handles the browser Back button
    else { closeFolio(); history.replaceState(null, "", "#portfolio"); }
  })
);
window.addEventListener("popstate", () => {
  const st = history.state;
  if (!(st && st.view != null)) closeView();
  if (st && st.rel != null) { if (release && release.hidden) openRelease(st.rel, false); } else if (typeof closeRelease === "function") closeRelease();
  if (st && st.coll) { const it = document.querySelector(`.gi-coll[data-coll="${st.coll}"]`); if (it && coll.hidden) openColl(it, false); }
  else closeColl();
  if (st && st.full) { /* stays open */ } else closeFull();
  if (st && st.reader != null) { if (!(st.full)) openReader(st.reader, false); }
  else closeReader();
  const id = location.hash.slice(1);
  if (document.getElementById(id)?.classList.contains("folio")) openFolio(id);
  else closeFolio();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (release && !release.hidden) leaveRelease();
  else if (viewer && !viewer.hidden) leaveView();
  else if (coll && !coll.hidden) leaveColl();
  else if (full && !full.hidden) leaveFull();
  else if (reader && !reader.hidden) leaveReader();
  else closeFolio();
});
// opened directly via link, e.g. yoursite/#screenplays
if (document.getElementById(location.hash.slice(1))?.classList.contains("folio")) openFolio(location.hash.slice(1));

// Pages: show PER_PAGE screenplays at a time, with numbered page buttons
const PER_PAGE = 4;            // screenplays per page
const pageOf = new WeakMap();
const renderPages = (folio, scroll = false) => {
  const nav = folio.querySelector(".folio-pages");
  if (!nav) return;
  const rows = [...folio.querySelectorAll(".sp")].filter((r) => !r.classList.contains("hide"));
  const total = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const page = Math.min(pageOf.get(folio) || 1, total);
  pageOf.set(folio, page);
  folio.querySelectorAll(".sp").forEach((r) => r.classList.remove("off-page", "reveal"));
  rows.forEach((r, i) => {
    const onPage = Math.floor(i / PER_PAGE) + 1 === page;
    r.classList.toggle("off-page", !onPage);
    if (onPage && scroll) r.classList.add("reveal");
  });
  nav.hidden = total <= 1;
  nav.innerHTML =
    `<button type="button" class="arrow" data-p="${page - 1}" aria-label="Previous page" ${page === 1 ? "disabled" : ""}>‹</button>` +
    Array.from({ length: total }, (_, i) =>
      `<button type="button" data-p="${i + 1}" ${i + 1 === page ? 'class="on" aria-current="page"' : ""}>${i + 1}</button>`).join("") +
    `<button type="button" class="arrow" data-p="${page + 1}" aria-label="Next page" ${page === total ? "disabled" : ""}>›</button>`;
  if (scroll) folio.querySelector(".sp-list").scrollIntoView({ behavior: "smooth", block: "start" });
};
document.querySelectorAll(".folio").forEach((folio) => {
  renderPages(folio);
  folio.querySelector(".folio-pages")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    pageOf.set(folio, Number(btn.dataset.p));
    renderPages(folio, true);
  });
});

// Filter buttons inside a portfolio view
document.querySelectorAll(".folio-filter").forEach((group) => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    group.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
    const f = btn.dataset.filter;
    const folio = group.closest(".folio");
    folio.querySelectorAll(".sp").forEach((row) =>
      row.classList.toggle("hide", f !== "all" && row.dataset.format !== f));
    pageOf.set(folio, 1);             // each filter starts on page 1
    renderPages(folio);
  });
});

// Script reader: tap a screenplay to open its page
const reader = document.getElementById("reader");
const CONTACT_EMAIL = "hello@portfolio-showcase.com";   // where "Request the script" emails go
let readerList = [], readerIdx = 0;
const $r = (id) => document.getElementById(id);
const scriptRows = () => [...document.querySelectorAll("#screenplays .sp")].filter((r) => !r.classList.contains("hide"));

function fillReader(row) {
  const title = row.querySelector("h3").textContent;
  $r("rd-num").textContent = row.querySelector(".sp-num").textContent;
  $r("rd-title").textContent = title;
  $r("rd-meta").innerHTML = row.querySelector(".sp-meta").innerHTML;
  $r("rd-log").textContent = row.querySelector(".sp-log").textContent;
  const d = row.querySelector(".sp-detail");
  $r("rd-syn").textContent = d?.querySelector(".sp-syn")?.textContent || "";
  const fullTpl = row.querySelector("template.sp-full");
  const opening = fullTpl ? [...fullTpl.content.children].slice(0, 9).map((n) => n.outerHTML).join("") : null;
  $r("rd-script").innerHTML = opening || d?.querySelector(".sp-excerpt")?.innerHTML || "<p class='ac'>Excerpt coming soon.</p>";
  $r("rd-status").innerHTML = row.querySelector(".sp-status")?.outerHTML || "";
  $r("rd-draft").textContent = row.querySelector(".cv-draft")?.textContent || "";
  const href = row.querySelector(".sp-read")?.getAttribute("href");
  const cta = $r("rd-cta");
  cta.onclick = null;
  if (fullTpl) {
    cta.href = "#"; cta.removeAttribute("target");
    cta.innerHTML = "Read the full script <span>→</span>";
    cta.onclick = (e) => { e.preventDefault(); openFull(row); };
  } else if (href && href !== "#") {
    cta.href = href; cta.target = "_blank"; cta.rel = "noopener";
    cta.innerHTML = "Read the full script <span>→</span>";
  } else {
    cta.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Script request: " + title)}`;
    cta.removeAttribute("target");
    cta.innerHTML = "Request the script <span>→</span>";
  }
  const prev = readerList[readerIdx - 1], next = readerList[readerIdx + 1];
  $r("rd-prev").disabled = !prev; $r("rd-next").disabled = !next;
  $r("rd-prev").querySelector(".t").textContent = prev ? prev.querySelector("h3").textContent : "";
  $r("rd-next").querySelector(".t").textContent = next ? next.querySelector("h3").textContent : "";
}

function openReader(i, push = true) {
  if (!reader) return;
  readerList = scriptRows();
  readerIdx = Math.max(0, Math.min(i, readerList.length - 1));
  fillReader(readerList[readerIdx]);
  if (push) history.pushState({ folio: "screenplays", reader: readerIdx }, "", "#screenplays");
  reader.hidden = false;
  reader.scrollTop = 0;
  requestAnimationFrame(() => reader.classList.add("open"));
}
function closeReader() {
  if (!reader || reader.hidden) return;
  reader.classList.remove("open");
  setTimeout(() => { if (!reader.classList.contains("open")) reader.hidden = true; }, 500);
}
function leaveReader() {
  if (history.state && history.state.reader != null) history.back();
  else closeReader();
}
function stepReader(dir) {
  const j = readerIdx + dir;
  if (j < 0 || j >= readerList.length) return;
  readerIdx = j;
  history.replaceState({ folio: "screenplays", reader: j }, "", "#screenplays");
  const paper = reader.querySelector(".rd-paper");
  reader.classList.remove("open");
  setTimeout(() => { fillReader(readerList[j]); reader.scrollTop = 0; reader.classList.add("open"); }, 250);
  paper.offsetWidth;
}

if (reader) {
  document.querySelectorAll("#screenplays .sp").forEach((row) => {
    row.querySelectorAll(".sp-cover, .sp-read, h3").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openReader(scriptRows().indexOf(row));
      });
    });
  });
  reader.querySelector("[data-reader-close]").addEventListener("click", leaveReader);
  $r("rd-prev").addEventListener("click", () => stepReader(-1));
  $r("rd-next").addEventListener("click", () => stepReader(1));
}

// Full script: lays the screenplay out on real-proportion pages
const full = document.getElementById("fullscript");
const AUTHOR = "AMAROK";
let fullRow = null, pageObserver = null;

function blocksOf(tpl) {
  // keep a character name together with its parenthetical + dialogue
  const out = []; let grp = null;
  [...tpl.content.children].forEach((el) => {
    const n = el.cloneNode(true);
    if (n.classList.contains("ch")) { grp = document.createElement("div"); grp.className = "grp"; grp.appendChild(n); out.push(grp); }
    else if (grp && (n.classList.contains("pa") || n.classList.contains("di"))) grp.appendChild(n);
    else { grp = null; out.push(n); }
  });
  return out;
}
function newPage(wrap, num) {
  const pg = document.createElement("article");
  pg.className = "fs-page";
  pg.innerHTML = (num > 1 ? `<span class="pgno">${num}.</span>` : "") + `<div class="fs-flow"></div>`;
  wrap.appendChild(pg);
  return pg;
}
function layoutFull() {
  if (!fullRow) return;
  const wrap = $r("fs-pages");
  wrap.innerHTML = "";
  const title = fullRow.querySelector("h3").textContent;
  const draft = fullRow.querySelector(".cv-draft")?.textContent || "";
  // title page
  const tp = document.createElement("article");
  tp.className = "fs-page title";
  tp.innerHTML = `<div class="t"></div><div class="w">Written by<br />${AUTHOR}</div>
    <div class="contact">${AUTHOR}<br />${CONTACT_EMAIL}</div><div class="draft"></div>`;
  tp.querySelector(".t").textContent = title;
  tp.querySelector(".draft").textContent = draft;
  wrap.appendChild(tp);
  // size the type like a real page: 12pt Courier on an 8.5in-wide sheet
  const w = tp.getBoundingClientRect().width;
  const inch = w / 8.5;
  wrap.style.setProperty("--in", inch + "px");
  // phones: keep the type readable (a little larger than true scale, margins trimmed)
  const small = w < 560;
  wrap.style.fontSize = Math.max(w / 51, small ? 10.5 : 0) + "px";
  if (small) wrap.style.setProperty("--in", Math.max(inch * 0.62, 22) + "px");
  wrap.querySelectorAll(".fs-page").forEach((p) => p.style.removeProperty("--in"));
  // pour the script into pages
  let num = 1, page = newPage(wrap, num), flow = page.querySelector(".fs-flow");
  blocksOf(fullRow.querySelector("template.sp-full")).forEach((b) => {
    flow.appendChild(b);
    if (flow.scrollHeight > flow.clientHeight + 1 && flow.children.length > 1) {
      flow.removeChild(b);
      page = newPage(wrap, ++num); flow = page.querySelector(".fs-flow");
      flow.appendChild(b);
    }
  });
  // page counter + fade-in as pages scroll into view
  const pages = [...wrap.querySelectorAll(".fs-page")];
  const total = pages.length;
  if (pageObserver) pageObserver.disconnect();
  pageObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("seen"); });
    const mid = full.getBoundingClientRect().height * 0.45;
    let cur = 1;
    pages.forEach((p, i) => { if (p.getBoundingClientRect().top < mid) cur = i + 1; });
    $r("fs-count").textContent = `Page ${cur} of ${total}`;
  }, { root: full, threshold: [0, 0.25, 0.5, 0.75, 1] });
  pages.forEach((p) => pageObserver.observe(p));
  $r("fs-count").textContent = `Page 1 of ${total}`;
}
function openFull(row, push = true) {
  if (!full) return;
  fullRow = row;
  $r("fs-title").textContent = row.querySelector("h3").textContent;
  if (push) history.pushState({ folio: "screenplays", reader: readerIdx, full: true }, "", "#screenplays");
  full.hidden = false;
  full.scrollTop = 0;
  layoutFull();
  requestAnimationFrame(() => full.classList.add("open"));
}
function closeFull() {
  if (!full || full.hidden) return;
  full.classList.remove("open");
  setTimeout(() => { if (!full.classList.contains("open")) full.hidden = true; }, 450);
}
function leaveFull() {
  if (history.state && history.state.full) history.back();
  else closeFull();
}
if (full) {
  full.querySelector("[data-full-close]").addEventListener("click", leaveFull);
  full.addEventListener("scroll", () => {
    const pages = [...full.querySelectorAll(".fs-page")];
    const mid = full.getBoundingClientRect().height * 0.45;
    let cur = 1;
    pages.forEach((p, i) => { if (p.getBoundingClientRect().top < mid) cur = i + 1; });
    $r("fs-count").textContent = `Page ${cur} of ${pages.length}`;
  }, { passive: true });
  let rt;
  window.addEventListener("resize", () => {
    if (full.hidden) return;
    clearTimeout(rt); rt = setTimeout(layoutFull, 200);
  });
}

// ===== Forgotten Spaces gallery: Film / 3D Art tabs, categories, pages =====
const gal = document.getElementById("animation");
const viewer = document.getElementById("viewer");
const GAL_PER_PAGE = { film: 6, art: 9 };   // pieces per page
const galState = { medium: "film", cat: "all", page: 1 };

function galItems() {
  return [...gal.querySelectorAll(".gi")].filter((g) =>
    g.dataset.medium.split(" ").includes(galState.medium) && (galState.cat === "all" || g.dataset.cat === galState.cat));
}
function renderGallery(scroll = false) {
  const grid = gal.querySelector(".gal-grid");
  grid.dataset.medium = galState.medium;
  const items = galItems();
  const per = GAL_PER_PAGE[galState.medium];
  const total = Math.max(1, Math.ceil(items.length / per));
  galState.page = Math.min(galState.page, total);
  gal.querySelectorAll(".gi").forEach((g) => g.classList.remove("show"));
  items.slice((galState.page - 1) * per, galState.page * per).forEach((g) => g.classList.add("show"));
  const nav = gal.querySelector(".gal-pages");
  nav.hidden = total <= 1;
  const p = galState.page;
  nav.innerHTML =
    `<button type="button" class="arrow" data-p="${p - 1}" aria-label="Previous page" ${p === 1 ? "disabled" : ""}>‹</button>` +
    Array.from({ length: total }, (_, i) =>
      `<button type="button" data-p="${i + 1}" ${i + 1 === p ? 'class="on" aria-current="page"' : ""}>${i + 1}</button>`).join("") +
    `<button type="button" class="arrow" data-p="${p + 1}" aria-label="Next page" ${p === total ? "disabled" : ""}>›</button>`;
  if (scroll) grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (gal) {
  // real artwork: use data-src as the tile image, data-poster for a film's thumbnail
  gal.querySelectorAll(".gi").forEach((g) => {
    const pic = g.dataset.poster || g.dataset.src;
    if (pic) { const m = g.querySelector(".gi-media"); m.style.background = `url("${pic}") center / cover no-repeat`; }
  });
  gal.querySelectorAll(".gal-tabs button").forEach((b) => b.addEventListener("click", () => {
    galState.medium = b.dataset.medium; galState.cat = "all"; galState.page = 1;
    gal.querySelectorAll(".gal-tabs button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
    gal.querySelectorAll(".gal-chips").forEach((c) => {
      c.hidden = c.dataset.for !== galState.medium;
      c.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.cat === "all"));
    });
    renderGallery();
  }));
  gal.querySelectorAll(".gal-chips").forEach((chips) => chips.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    galState.cat = b.dataset.cat; galState.page = 1;
    chips.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    renderGallery();
  }));
  gal.querySelector(".gal-pages").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    galState.page = Number(b.dataset.p); renderGallery(true);
  });
  gal.querySelectorAll(".gi").forEach((g) => g.querySelector(".gi-media").addEventListener("click", () => {
    if (g.classList.contains("gi-coll")) openColl(g);
    else openView(galItems().filter((x) => !x.classList.contains("gi-coll")).map(pieceFromItem),
                  galItems().filter((x) => !x.classList.contains("gi-coll")).indexOf(g));
  }));
  renderGallery();
}

// ===== Viewer: plays a film or shows a still large =====
let viewList = [], viewIdx = 0, viewCtx = null;
const $v = (id) => document.getElementById(id);
function embedFor(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `<iframe src="https://www.youtube.com/embed/${yt[1]}?rel=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>`;
  return `<video src="${url}" controls playsinline preload="metadata"></video>`;
}
// a "piece" is anything the viewer can show
function pieceFromItem(g) {
  return {
    kind: g.dataset.kind, video: g.dataset.video, src: g.dataset.src,
    ph: [...g.querySelector(".gi-media").classList].find((c) => c.startsWith("ph-")),
    shape: g.dataset.medium === "art" ? g.dataset.orient : "wide",
    cat: g.querySelector(".gi-cat").textContent, title: g.querySelector("h3").textContent,
    desc: g.querySelector(".gi-desc")?.textContent || "", year: g.dataset.year || "",
    spec: g.dataset.spec || "", tools: g.dataset.tools || "",
  };
}
function fillView(p) {
  const media = $v("vw-media");
  const isVideo = p.kind === "video";
  if (isVideo && p.video) media.innerHTML = embedFor(p.video);
  else if (p.src) { media.innerHTML = `<img src="${p.src}" alt="" />`; media.querySelector("img").alt = p.title; }
  else {
    const shape = p.shape === "tall" ? "tall" : p.shape === "square" ? "square" : "";
    media.innerHTML = `<div class="ph ${p.ph || ""} ${shape}"><span>${isVideo ? "Your film plays here" : "Your render shows here"}</span></div>`;
    if (isVideo) media.firstElementChild.insertAdjacentHTML("afterbegin", '<span class="gi-play" style="position:absolute"></span>');
  }
  $v("vw-cat").textContent = p.cat;
  $v("vw-title").textContent = p.title;
  $v("vw-desc").textContent = p.desc;
  $v("vw-year").textContent = p.year;
  const [k, ...v] = (p.spec || "").split(":");
  $v("vw-spec-k").textContent = k || "";
  $v("vw-spec").textContent = v.join(":").trim();
  $v("vw-tools").textContent = p.tools;
  $v("vw-tools").previousElementSibling.textContent = p.toolsLabel || "Made with";
  $v("vw-year").parentElement.hidden = !p.year;
  $v("vw-tools").parentElement.hidden = !p.tools;
  $v("vw-prev").disabled = viewIdx === 0;
  $v("vw-next").disabled = viewIdx === viewList.length - 1;
  $v("vw-count").textContent = p.countLabel || `${viewIdx + 1} / ${viewList.length}`;
}
function openView(list, i, ctx = null, push = true) {
  if (!viewer || !list.length) return;
  viewList = list; viewCtx = ctx;
  viewIdx = Math.max(0, Math.min(i, list.length - 1));
  fillView(viewList[viewIdx]);
  const fol = (history.state && history.state.folio) || "animation";
  if (push) history.pushState({ ...(history.state || {}), folio: fol, view: viewIdx }, "", "#" + fol);
  viewer.hidden = false; viewer.scrollTop = 0;
  requestAnimationFrame(() => viewer.classList.add("open"));
}
function closeView() {
  if (!viewer || viewer.hidden) return;
  viewer.classList.remove("open");
  setTimeout(() => {
    if (!viewer.classList.contains("open")) { viewer.hidden = true; $v("vw-media").innerHTML = ""; }   // stops any playing video
  }, 400);
}
function leaveView() {
  if (history.state && history.state.view != null) history.back();
  else closeView();
}
function stepView(d) {
  const j = viewIdx + d;
  if (j < 0 || j >= viewList.length) return;
  viewIdx = j;
  history.replaceState({ ...(history.state || {}), view: j }, "", location.hash || "#animation");
  fillView(viewList[j]);
}
if (viewer) {
  viewer.querySelector("[data-viewer-close]").addEventListener("click", leaveView);
  $v("vw-prev").addEventListener("click", () => stepView(-1));
  $v("vw-next").addEventListener("click", () => stepView(1));
  document.addEventListener("keydown", (e) => {
    if (viewer.hidden) return;
    if (e.key === "ArrowLeft") stepView(-1);
    if (e.key === "ArrowRight") stepView(1);
  });
}

// ===== Collections: a world > locations > angles =====
const coll = document.getElementById("coll");
let collItem = null;
const pad2 = (n) => String(n).padStart(2, "0");
function anglePiece(a, i, total, world, locName, base) {
  return {
    kind: a.dataset.kind, video: a.dataset.video, src: a.dataset.src, ph: a.dataset.ph,
    shape: a.dataset.orient || "wide",
    cat: locName ? `${world} · ${locName}` : world,
    title: a.dataset.title || `${base.piece || "Angle"} ${i + 1}`,
    desc: a.textContent.trim(), year: base.year, spec: a.dataset.spec || "", tools: base.tools,
    countLabel: locName ? `${base.piece || "Angle"} ${i + 1} of ${total}` : "",
  };
}
function angleTile(a, label, cap) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "ang-btn";
  const pic = a.dataset.poster || a.dataset.src;
  b.innerHTML = `<div class="ang-tile ${pic ? "" : a.dataset.ph || ""}"${pic ? ` style="background:url('${pic}') center / cover no-repeat"` : ""}>
      <span class="ang-no">${label}</span>${a.dataset.kind === "video" ? '<span class="gi-play"></span>' : ""}</div>
    <div class="ang-cap"><h4></h4><p>${cap}</p></div>`;
  b.querySelector("h4").textContent = a.dataset.title || label;
  return b;
}
function collWords(item) {
  const d = item.dataset;
  return { unit: d.unit || "Location", units: d.units || "locations", piece: d.piece || "Angle", pieces: d.pieces || "angles" };
}
function collCounts(item) {
  const d = item.querySelector(".coll-data");
  return { locs: d.querySelectorAll(".loc").length, pieces: d.querySelectorAll(".ang").length };
}
function openColl(item, push = true) {
  if (!coll) return;
  collItem = item;
  const world = item.querySelector("h3").textContent;
  const W = collWords(item);
  const base = { year: item.dataset.year || "", tools: item.dataset.tools || "", piece: W.piece };
  const d = item.querySelector(".coll-data");
  const { locs, pieces } = collCounts(item);
  $v("cl-kicker").textContent = item.querySelector(".gi-cat").textContent;
  $v("cl-title").textContent = world;
  $v("cl-intro").textContent = item.querySelector(".gi-desc").textContent;
  $v("cl-stats").textContent = `${locs} ${W.units} · ${pieces} pieces`;
  // featured piece(s) that sit outside any location
  const feat = $v("cl-feature"); feat.innerHTML = "";
  const loose = [...d.children].filter((el) => el.classList.contains("ang"));
  loose.forEach((a, i) => {
    const kindLbl = a.dataset.kind === "video" ? a.dataset.spec.replace(/^[^:]*:\s*/, "") : "Still";
    const t = angleTile(a, "Featured", kindLbl);
    t.addEventListener("click", () => openView(loose.map((x, j) => anglePiece(x, j, loose.length, world, "", base)), i, "coll"));
    feat.appendChild(t);
  });
  // locations
  const wrap = $v("cl-locs"); wrap.innerHTML = "";
  [...d.querySelectorAll(".loc")].forEach((loc, li) => {
    const angs = [...loc.querySelectorAll(".ang")];
    const sec = document.createElement("section");
    sec.className = "loc";
    const gid = `loc-grid-${li}`;
    sec.innerHTML = `<div class="loc-toggle" role="button" tabindex="0" aria-expanded="false" aria-controls="${gid}">
        <div class="loc-head"><span class="loc-num">${W.unit} ${pad2(li + 1)}</span><h3></h3><p></p>
          <span class="loc-count">${angs.length} ${W.pieces}</span></div>
        <div class="loc-cover"><div class="loc-dots"></div>
          <span class="loc-cta"><span class="open-t">View ${angs.length} ${W.pieces}</span><span class="close-t">Hide ${W.pieces}</span><i>⌄</i></span></div>
      </div>
      <div class="loc-body" id="${gid}"><div class="loc-body-in"><div class="loc-grid"></div></div></div>`;
    sec.querySelector("h3").textContent = loc.dataset.name;
    sec.querySelector(".loc-head p").textContent = loc.dataset.note || "";
    // cover: a slow crossfade through this location's stills (falls back to all angles)
    const cover = sec.querySelector(".loc-cover");
    const stills = angs.filter((a) => a.dataset.kind !== "video");
    (stills.length ? stills : angs).forEach((a, k) => {
      const sl = document.createElement("div");
      const pic = a.dataset.src || a.dataset.poster;
      sl.className = "loc-slide " + (pic ? "" : a.dataset.ph || "") + (k === 0 ? " on" : "");
      if (pic) sl.style.background = `url("${pic}") center / cover no-repeat`;
      cover.insertBefore(sl, cover.querySelector(".loc-dots"));
      cover.querySelector(".loc-dots").insertAdjacentHTML("beforeend", `<i${k === 0 ? ' class="on"' : ""}></i>`);
    });
    const toggle = sec.querySelector(".loc-toggle");
    const flip = () => {
      const open = sec.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
      if (open) setTimeout(() => sec.querySelector(".loc-body").scrollIntoView({ behavior: "smooth", block: "nearest" }), 350);
    };
    toggle.addEventListener("click", flip);
    toggle.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    const grid = sec.querySelector(".loc-grid");
    const list = angs.map((a, i) => anglePiece(a, i, angs.length, world, loc.dataset.name, base));
    angs.forEach((a, i) => {
      const cap = (a.dataset.kind === "video" ? "Film · " + a.dataset.spec.replace(/^[^:]*:\s*/, "") : "Still");
      const t = angleTile(a, `${W.piece} ${pad2(i + 1)}`, cap);
      t.addEventListener("click", () => openView(list, i, "coll"));
      grid.appendChild(t);
    });
    wrap.appendChild(sec);
  });
  if (push) history.pushState({ folio: "animation", coll: item.dataset.coll }, "", "#animation");
  coll.hidden = false; coll.scrollTop = 0;
  requestAnimationFrame(() => coll.classList.add("open"));
}
function closeColl() {
  if (!coll || coll.hidden) return;
  coll.classList.remove("open");
  setTimeout(() => { if (!coll.classList.contains("open")) coll.hidden = true; }, 450);
}
function leaveColl() {
  if (history.state && history.state.coll) history.back();
  else closeColl();
}
// location covers: advance every few seconds, only while the collection is open
const COVER_SECONDS = 4;
setInterval(() => {
  if (!coll || coll.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  coll.querySelectorAll(".loc-cover").forEach((cv) => {
    const slides = cv.querySelectorAll(".loc-slide");
    if (slides.length < 2) return;
    const r = cv.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;            // off screen: leave it
    const dots = cv.querySelectorAll(".loc-dots i");
    const cur = [...slides].findIndex((x) => x.classList.contains("on"));
    const nxt = (cur + 1) % slides.length;
    slides[cur].classList.remove("on"); slides[nxt].classList.add("on");
    dots[cur]?.classList.remove("on"); dots[nxt]?.classList.add("on");
  });
}, COVER_SECONDS * 1000);

if (coll) {
  coll.querySelector("[data-coll-close]").addEventListener("click", leaveColl);
  // show each collection's size on its gallery tile
  document.querySelectorAll(".gi-coll").forEach((g) => {
    const { locs, pieces } = collCounts(g);
    const W = collWords(g);
    g.querySelector(".gi-collbadge").innerHTML = `<b>Collection</b><small>${locs} ${W.units} · ${pieces} pieces</small>`;
  });
}

// ===== Unseen Perspectives: music =====
const musicEl = document.getElementById("music");
const release = document.getElementById("release");
const MUSIC = JSON.parse(document.getElementById("music-data")?.textContent || "[]");
const ARTIST = "VMAROK";                 // the name your music is released under
const MU_PER_PAGE = 12;
const muState = { type: "all", page: 1 };
const $m = (id) => document.getElementById(id);
const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toSec = (t) => { const [m, s] = String(t).split(":").map(Number); return (m || 0) * 60 + (s || 0); };
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

function coverHTML(r, extra = "") {
  const img = /[./]/.test(r.cover || "");
  // r.art = real artwork (SoundCloud). If it can't load, the designed cover underneath shows instead.
  const art = r.art ? `<img class="ca-img" src="${escH(r.art)}" alt="${escH(r.title)} artwork" loading="lazy" referrerpolicy="no-referrer" />` : "";
  return `<div class="cover-art ${img ? "has-img" : escH(r.cover || "mc-1")} ${extra}"${img ? ` style="background-image:url('${escH(r.cover)}')"` : ""}>
    <span class="ca-t">${escH(r.title)}</span><span class="ca-a">${ARTIST}</span>${art}</div>`;
}
function recHTML(r) {
  return `<div class="rec" data-rel="${escH(r.id)}" style="--lbl:${escH(r.label || "#8e2533")}"><div class="vinyl"></div>${coverHTML(r)}</div>`;
}
function tracksHTML(r) {
  return `<ol class="tracks">${r.tracks.map((t, i) => `
    <li class="trk" data-rel="${escH(r.id)}" data-ti="${i}" role="button" tabindex="0" aria-label="Play ${escH(t[0])}">
      <span class="n"><span class="num">${i + 1}</span><span class="pi"></span></span>
      <span class="tt">${escH(t[0])}</span><span class="d">${escH(t[1] || "")}</span></li>`).join("")}</ol>`;
}
function linksHTML(r) {
  const L = Object.entries(r.links || {}).filter(([, u]) => u);
  return L.length ? `<div class="mu-links">${L.map(([k, u]) => `<a href="${escH(u)}" target="_blank" rel="noopener">${escH(k)}</a>`).join("")}</div>` : "";
}
function metaLine(r) {
  const total = r.tracks.reduce((a, t) => a + toSec(t[1]), 0);
  return `${escH(r.type)} · ${escH(r.date || r.year)} · ${r.tracks.length} track${r.tracks.length > 1 ? "s" : ""}${total ? " · " + Math.round(total / 60) + " min" : ""}`;
}
function embedMusic(url) {
  if (/open\.spotify\.com\//.test(url)) return `<iframe src="${url.replace("open.spotify.com/", "open.spotify.com/embed/")}" height="352" allow="encrypted-media" loading="lazy"></iframe>`;
  if (/soundcloud\.com\//.test(url)) return `<iframe height="300" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%238e2533&visual=true" loading="lazy"></iframe>`;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|playlist\?list=)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `<iframe style="aspect-ratio:16/9;height:auto" src="https://www.youtube.com/embed/${yt[1]}" allowfullscreen loading="lazy"></iframe>`;
  if (/music\.apple\.com\//.test(url)) return `<iframe height="450" src="${url.replace("music.apple.com", "embed.music.apple.com")}" allow="autoplay *; encrypted-media *;" loading="lazy"></iframe>`;
  return "";
}

function renderFeature() {
  const r = MUSIC[0]; if (!r) return;
  $m("mu-feature").innerHTML = `${recHTML(r)}
    <div>
      <p class="mu-eyebrow">Latest release</p>
      <h3 class="mu-title">${escH(r.title)}</h3>
      <p class="mu-meta">${metaLine(r)}</p>
      ${r.tags ? `<p class="rl-tags">${escH(r.tags)}</p>` : ""}
      <p class="mu-about">${escH(r.about || "")}</p>
      <div class="mu-actions">
        <button type="button" class="mu-play" data-rel="${escH(r.id)}">Play</button>
        <button type="button" class="mu-open" data-open-rel="0">Open release <span>→</span></button>
      </div>
      ${linksHTML(r)}
    </div>`;
  $m("mu-all").innerHTML = allTracksHTML();
}
// every track from every release, newest first
function allTracksHTML() {
  let n = 0;
  return `<h3 class="mu-all-h">All tracks</h3><ol class="tracks all-tracks">${MUSIC.map((r) => r.tracks.map((t, i) => `
    <li class="trk" data-rel="${escH(r.id)}" data-ti="${i}" role="button" tabindex="0" aria-label="Play ${escH(t[0])}">
      <span class="n"><span class="num">${++n}</span><span class="pi"></span></span>
      <span class="tt">${escH(t[0])}<small>${escH(r.tags ? r.tags.split(" · ")[0] : r.type)} · ${r.year}</small></span><span class="d">${escH(t[1] || "")}</span></li>`).join("")).join("")}</ol>`;
}
function muItems() { return MUSIC.map((r, i) => ({ r, i })).filter(({ r }) => muState.type === "all" || r.type === muState.type); }
function renderGrid(scroll = false) {
  const items = muItems();
  const total = Math.max(1, Math.ceil(items.length / MU_PER_PAGE));
  muState.page = Math.min(muState.page, total);
  $m("mu-grid").innerHTML = items.slice((muState.page - 1) * MU_PER_PAGE, muState.page * MU_PER_PAGE).map(({ r, i }) => `
    <li><button type="button" class="rel-btn" data-open-rel="${i}" aria-label="Open ${escH(r.title)}">
      ${recHTML(r)}
      <div class="rel-cap"><h4>${escH(r.title)}</h4><p>${escH(r.type)} · ${r.year}</p></div>
    </button></li>`).join("");
  const nav = $m("mu-pages"), p = muState.page;
  nav.hidden = total <= 1;
  nav.innerHTML = `<button type="button" class="arrow" data-p="${p - 1}" ${p === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>` +
    Array.from({ length: total }, (_, k) => `<button type="button" data-p="${k + 1}" ${k + 1 === p ? 'class="on"' : ""}>${k + 1}</button>`).join("") +
    `<button type="button" class="arrow" data-p="${p + 1}" ${p === total ? "disabled" : ""} aria-label="Next page">›</button>`;
  if (scroll) $m("mu-grid").scrollIntoView({ behavior: "smooth", block: "start" });
  syncPlayingUI();
}

// --- release page ---
let relIdx = 0;
function fillRelease(i) {
  const r = MUSIC[i]; relIdx = i;
  release.style.setProperty("--lbl", r.label || "#8e2533");
  $m("release-inner").innerHTML = `${recHTML(r)}
    <div>
      <p class="mu-eyebrow">${escH(r.type)}</p>
      <h2 class="mu-title" id="rl-title">${escH(r.title)}</h2>
      <p class="mu-meta">${metaLine(r)}</p>
      ${r.tags ? `<p class="rl-tags">${escH(r.tags)}</p>` : ""}
      <p class="mu-about">${escH(r.about || "")}</p>
      <div class="mu-actions"><button type="button" class="mu-play" data-rel="${escH(r.id)}">Play</button></div>
      ${tracksHTML(r)}
      ${linksHTML(r)}
      ${r.embed ? `<div class="rl-embed">${embedMusic(r.embed)}</div>` : ""}
      ${(r.credits || []).length ? `<dl class="rl-credits">${r.credits.map(([k, v]) => `<div><dt>${escH(k)}</dt><dd>${escH(v)}</dd></div>`).join("")}</dl>` : ""}
    </div>`;
  const prev = MUSIC[i - 1], next = MUSIC[i + 1];
  $m("rl-prev").disabled = !prev; $m("rl-next").disabled = !next;
  $m("rl-prev").querySelector(".t").textContent = prev ? prev.title : "";
  $m("rl-next").querySelector(".t").textContent = next ? next.title : "";
  syncPlayingUI();
}
function openRelease(i, push = true) {
  if (!release || !MUSIC[i]) return;
  fillRelease(i);
  if (push) history.pushState({ folio: "music", rel: i }, "", "#music");
  release.hidden = false; release.scrollTop = 0;
  requestAnimationFrame(() => release.classList.add("open"));
}
function closeRelease() {
  if (!release || release.hidden) return;
  release.classList.remove("open");
  setTimeout(() => { if (!release.classList.contains("open")) release.hidden = true; }, 450);
}
function leaveRelease() {
  if (history.state && history.state.rel != null) history.back();
  else closeRelease();
}
function stepRelease(d) {
  const j = relIdx + d; if (!MUSIC[j]) return;
  history.replaceState({ folio: "music", rel: j }, "", "#music");
  fillRelease(j); release.scrollTop = 0;
}

// --- player: SoundCloud tracks play through a hidden SoundCloud player; audio files play directly ---
const IN_FRAME = window.self !== window.top;
let scW = null, scFrame = null, scApi = null, scPos = 0, scDock = null, scWait = null;
function scLoadApi() {
  if (!scApi) scApi = new Promise((ok, no) => {
    if (window.SC && SC.Widget) return ok();
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js"; s.onload = ok; s.onerror = no;
    document.head.appendChild(s);
  });
  return scApi;
}
// iPad / iPhone (and some browsers) only let SoundCloud start after a tap inside its own player,
// so the real player pops up above the mini player. Once it's playing, it tucks itself away.
const dockShow = () => scDock && scDock.classList.add("show");
const dockHide = () => scDock && scDock.classList.remove("show");
function scPlay(url) {
  scPos = 0;
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false&show_comments=false&show_reposts=false&hide_related=true&color=%238e2533`;
  clearTimeout(scWait); scWait = setTimeout(dockShow, 1200);          // not playing on its own? show the player
  if (scW) { scW.load(url, { auto_play: true, visual: false, show_comments: false, hide_related: true, color: "8e2533", callback: () => scW.play() }); return; }
  if (!scDock) {
    scDock = document.createElement("div");
    scDock.className = "sc-dock";
    scDock.innerHTML = `<div class="sc-dock-h"><span>Tap ▶ to start</span><button type="button" aria-label="Hide player">⌄</button></div>`;
    scDock.querySelector("button").onclick = dockHide;
    scFrame = document.createElement("iframe");
    scFrame.title = "SoundCloud player"; scFrame.allow = "autoplay; encrypted-media"; scFrame.src = src;
    scDock.appendChild(scFrame); document.body.appendChild(scDock);
    scLoadApi().then(() => {
      scW = SC.Widget(scFrame);
      scW.bind(SC.Widget.Events.READY, () => { if (MP.mode === "sc") scW.play(); });
      scW.bind(SC.Widget.Events.PLAY, () => {
        clearTimeout(scWait); MP.paused = false; syncPlayingUI(); setTimeout(dockHide, 500);
        window.onlyOne && onlyOne("player");
      });
      scW.bind(SC.Widget.Events.PAUSE, () => { MP.paused = true; syncPlayingUI(); });
      scW.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => (scPos = e.currentPosition / 1000));
      scW.bind(SC.Widget.Events.FINISH, () => nextTrack(1));
    }).catch(() => dockShow());
  } else scFrame.src = src;
}
// --- placeholder tracks (no link or file) play a soft generated tone ---
const PREVIEW_SECONDS = 30;
const MP = { r: null, ti: 0, mode: null, audio: new Audio(), ctx: null, synth: null, t0: 0, dur: 0, paused: false };
MP.audio.preload = "metadata";
function seedOf(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function synthStart(seed) {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  MP.ctx = MP.ctx || new AC(); const ctx = MP.ctx; ctx.resume();
  const now = ctx.currentTime;
  const master = ctx.createGain(); master.gain.setValueAtTime(0, now); master.gain.linearRampToValueAtTime(0.08, now + 2.5); master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.7; lp.connect(master);
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07 + (seed % 5) * 0.02; lfoG.gain.value = 380; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  const roots = [110, 98, 87.31, 130.81, 123.47, 146.83, 116.54];
  const root = roots[seed % roots.length];
  const chord = seed % 2 ? [1, 1.189, 1.498, 2] : [1, 1.26, 1.498, 1.887];
  const oscs = [];
  chord.forEach((r, k) => [-4, 4].forEach((det) => {
    const o = ctx.createOscillator(); o.type = k % 2 ? "triangle" : "sine"; o.frequency.value = root * r; o.detune.value = det + k * 2;
    const g = ctx.createGain(); g.gain.value = 0.22 / (k + 1); o.connect(g); g.connect(lp); o.start(); oscs.push(o);
  }));
  return { stop() { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop(); master.disconnect(); }, 700); } };
}
function stopSound() {
  MP.audio.pause();
  if (scW && MP.mode === "sc") scW.pause();
  clearTimeout(scWait); dockHide();
  if (MP.synth) { MP.synth.stop(); MP.synth = null; }
}
function playTrack(r, ti) {
  const t = r.tracks[ti];
  // SoundCloud tracks: play through SoundCloud's own player. Where outside players are blocked
  // (e.g. this preview), open the track on SoundCloud instead.
  if (!t[2] && t[3] && IN_FRAME) { muToast(t[0], t[3]); return; }
  stopSound();
  MP.r = r; MP.ti = ti; MP.paused = false;
  if (t[3] && !t[2]) {
    MP.mode = "sc"; MP.dur = toSec(t[1]) || 0; MP.paused = true;   // becomes "playing" once SoundCloud actually starts
    scPlay(t[3]);
  } else if (t[2]) {
    window.onlyOne && onlyOne("player");
    MP.mode = "audio"; MP.audio.src = t[2]; MP.dur = toSec(t[1]) || 0;
    MP.audio.play().catch(() => {});
  } else {
    MP.mode = "synth"; MP.dur = PREVIEW_SECONDS;
    MP.synth = synthStart(seedOf(r.id + ti));
    MP.t0 = MP.ctx ? MP.ctx.currentTime : 0;
  }
  showMini(); syncPlayingUI();
}
function curTime() {
  if (MP.mode === "audio") return MP.audio.currentTime || 0;
  if (MP.mode === "sc") return scPos;
  if (MP.mode === "synth" && MP.ctx) return MP.ctx.currentTime - MP.t0;
  return 0;
}
function togglePause() {
  if (!MP.r) return;
  MP.paused = !MP.paused;
  if (MP.mode === "audio") MP.paused ? MP.audio.pause() : MP.audio.play().catch(() => {});
  else if (MP.mode === "sc") {
    if (!scW) return;
    if (MP.paused) { scW.pause(); }
    else { MP.paused = true; scW.play(); clearTimeout(scWait); scWait = setTimeout(dockShow, 1200); }   // "playing" again when SoundCloud confirms
  }
  else if (MP.ctx) MP.paused ? MP.ctx.suspend() : MP.ctx.resume();
  syncPlayingUI();
}
function nextTrack(d = 1) {
  if (!MP.r) return;
  const j = MP.ti + d;
  if (j >= 0 && j < MP.r.tracks.length) return playTrack(MP.r, j);
  // past the end of a release: carry on into the next (or previous) release in the list
  const k = MUSIC.indexOf(MP.r) + d;
  if (MUSIC[k]) playTrack(MUSIC[k], d > 0 ? 0 : MUSIC[k].tracks.length - 1);
  else if (d > 0) stopAll();
}
function stopAll() {
  stopSound(); if (MP.ctx && MP.ctx.state === "suspended") MP.ctx.resume();
  MP.r = null; MP.mode = null; MP.paused = false;
  $m("mini").hidden = true; document.body.classList.remove("mini-on"); syncPlayingUI();
}
MP.audio.addEventListener("ended", () => nextTrack(1));
MP.audio.addEventListener("loadedmetadata", () => { if (isFinite(MP.audio.duration)) MP.dur = MP.audio.duration; });
function showMini() {
  const r = MP.r, t = r.tracks[MP.ti];
  $m("mini").hidden = false;
  document.body.classList.add("mini-on");
  $m("mini-art").outerHTML = coverHTML(r, "mini-art").replace('class="cover-art', 'id="mini-art" class="cover-art');
  $m("mini-title").textContent = t[0];
  $m("mini-sub").textContent = `${ARTIST} · ${MP.mode === "sc" ? "SoundCloud" : MP.mode === "synth" ? "placeholder tone" : r.title}`;
}
function syncPlayingUI() {
  const on = MP.r ? MP.r.id : null;
  document.querySelectorAll(".trk").forEach((el) => {
    const p = on && el.dataset.rel === on && Number(el.dataset.ti) === MP.ti;
    el.classList.toggle("playing", !!p); el.classList.toggle("paused", !!p && MP.paused);
  });
  document.querySelectorAll(".rec").forEach((el) => el.classList.toggle("spin", !!on && el.dataset.rel === on && !MP.paused));
  document.querySelectorAll(".mu-play").forEach((b) => {
    const p = on && b.dataset.rel === on && !MP.paused;
    b.classList.toggle("is-on", !!p); b.textContent = p ? "Pause" : on && b.dataset.rel === on ? "Resume" : "Play";
  });
  $m("mini")?.classList.toggle("paused", MP.paused);
}
(function tick() {
  if (MP.r) {
    const c = curTime(), d = MP.dur || 0;
    if (MP.mode === "synth" && !MP.paused && c >= d) nextTrack(1);
    $m("mini-fill").style.width = d ? Math.min(100, (c / d) * 100) + "%" : "0%";
    $m("mini-cur").textContent = fmt(Math.max(0, c)); $m("mini-dur").textContent = fmt(d);
  }
  requestAnimationFrame(tick);
})();

if (musicEl && MUSIC.length) {
  renderFeature(); renderGrid();
  // clicks anywhere in music / release pages
  const onClick = (e) => {
    const trk = e.target.closest(".trk");
    if (trk) {
      const r = MUSIC.find((x) => x.id === trk.dataset.rel), ti = Number(trk.dataset.ti);
      if (MP.r && MP.r.id === r.id && MP.ti === ti) togglePause(); else playTrack(r, ti);
      return;
    }
    const play = e.target.closest(".mu-play");
    if (play) {
      const r = MUSIC.find((x) => x.id === play.dataset.rel);
      if (MP.r && MP.r.id === r.id) togglePause(); else playTrack(r, 0);
      return;
    }
    const op = e.target.closest("[data-open-rel]");
    if (op) openRelease(Number(op.dataset.openRel));
  };
  musicEl.addEventListener("click", onClick);
  release.addEventListener("click", onClick);
  [musicEl, release].forEach((el) => el.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("trk")) { e.preventDefault(); e.target.click(); }
  }));
  musicEl.querySelector(".mu-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    muState.type = b.dataset.type; muState.page = 1;
    musicEl.querySelectorAll(".mu-filter button").forEach((x) => x.classList.toggle("on", x === b));
    renderGrid();
  });
  $m("mu-pages").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    muState.page = Number(b.dataset.p); renderGrid(true);
  });
  release.querySelector("[data-release-close]").addEventListener("click", leaveRelease);
  $m("rl-prev").addEventListener("click", () => stepRelease(-1));
  $m("rl-next").addEventListener("click", () => stepRelease(1));
  // mini player
  $m("mini-play").addEventListener("click", togglePause);
  $m("mini-prev").addEventListener("click", () => nextTrack(-1));
  $m("mini-next").addEventListener("click", () => nextTrack(1));
  $m("mini-x").addEventListener("click", stopAll);
  $m("mini-track").addEventListener("click", (e) => {
    if (MP.mode === "sc" && scW && MP.dur) { const b = e.currentTarget.getBoundingClientRect(); scW.seekTo(((e.clientX - b.left) / b.width) * MP.dur * 1000); return; }
    if (MP.mode !== "audio" || !MP.dur) return;   // seeking works on real audio files
    const b = e.currentTarget.getBoundingClientRect();
    MP.audio.currentTime = ((e.clientX - b.left) / b.width) * MP.dur;
  });
}

// Spotify / SoundCloud players: load them when the site runs on its own (hosted or Live Server).
// Inside the preview viewer outside players are blocked, so the "Listen on" cards show instead.
(function () {
  const box = document.querySelector(".mu-embeds");
  if (!box) return;
  let framed = true;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (framed) return;
  box.querySelectorAll("iframe[data-src]").forEach((f) => { f.src = f.dataset.src; f.hidden = false; });
  box.classList.add("live");
})();

// ===== Modern Traces: dance =====
const danceEl = document.getElementById("dance");
const dnState = { disc: "fire", prop: "all" };
const DISC_NAME = { fire: "Fire spinning", belly: "Belly dance" };
const PROP_LABEL = { fire: "Prop", belly: "Style" };
function dnItems() {
  return [...danceEl.querySelectorAll(".dc")].filter((d) => d.dataset.disc === dnState.disc && (dnState.prop === "all" || d.dataset.prop === dnState.prop));
}
function dnPiece(d) {
  const propBtn = danceEl.querySelector(`.dn-chips[data-for="${d.dataset.disc}"] [data-prop="${d.dataset.prop}"]`);
  const propName = propBtn ? propBtn.textContent : d.dataset.prop;
  return {
    kind: d.dataset.kind, video: d.dataset.video, src: d.dataset.src, ph: d.dataset.ph, shape: d.dataset.orient,
    cat: `${DISC_NAME[d.dataset.disc]} · ${propName}`, title: d.dataset.title, desc: d.dataset.desc || d.textContent.trim(),
    year: d.dataset.year || "", spec: d.dataset.kind === "video" ? d.dataset.spec : "Type: Photo",
    tools: propName, toolsLabel: PROP_LABEL[d.dataset.disc],
  };
}
function renderDance() {
  danceEl.querySelectorAll(".dc").forEach((d) => d.classList.remove("show"));
  dnItems().forEach((d) => d.classList.add("show"));
}
if (danceEl) {
  // build each tile once from its data
  danceEl.querySelectorAll(".dc").forEach((d) => {
    const desc = d.textContent.trim(); d.dataset.desc = desc;
    const pic = d.dataset.poster || d.dataset.src;
    const dur = d.dataset.kind === "video" ? d.dataset.spec.replace(/^[^:]*:\s*/, "") : "Photo";
    d.innerHTML = `<button type="button" class="dn-tile ${pic ? "" : d.dataset.ph}" aria-label="Open ${d.dataset.title}"
        ${pic ? `style="background:url('${pic}') center / cover no-repeat"` : ""}>
        ${d.dataset.kind === "video" ? '<span class="gi-play" aria-hidden="true"></span>' : ""}<span class="dn-dur">${dur}</span></button>
      <div class="dn-cap"><p></p><h4></h4></div>`;
    d.querySelector(".dn-cap h4").textContent = d.dataset.title;
    d.querySelector(".dn-cap p").textContent = dnPiece(d).cat;
    d.querySelector(".dn-tile").addEventListener("click", () => {
      const list = dnItems(); openView(list.map(dnPiece), list.indexOf(d));
    });
  });
  // showreel
  const reel = danceEl.querySelector(".dn-reel");
  const rb = reel.querySelector(".dn-reel-btn");
  if (reel.dataset.poster || reel.dataset.src) rb.style.background = `url('${reel.dataset.poster || reel.dataset.src}') center / cover no-repeat`;
  else rb.classList.add(reel.dataset.ph);
  rb.addEventListener("click", () => openView([{
    kind: "video", video: reel.dataset.video, ph: reel.dataset.ph, shape: "wide", cat: "Showreel",
    title: reel.dataset.title, desc: reel.dataset.desc, year: reel.dataset.year, spec: reel.dataset.spec, tools: "Fire spinning · Belly dance", toolsLabel: "Featuring",
  }], 0));
  // tabs + filters
  danceEl.querySelectorAll(".dn-tabs button").forEach((b) => b.addEventListener("click", () => {
    dnState.disc = b.dataset.disc; dnState.prop = "all";
    danceEl.querySelectorAll(".dn-tabs button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); });
    danceEl.querySelectorAll(".dn-chips, .dn-blurb").forEach((el) => (el.hidden = el.dataset.for !== dnState.disc));
    danceEl.querySelectorAll(".dn-chips button").forEach((x) => x.classList.toggle("on", x.dataset.prop === "all"));
    renderDance();
  }));
  danceEl.querySelectorAll(".dn-chips").forEach((chips) => chips.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    dnState.prop = b.dataset.prop;
    chips.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    renderDance();
  }));
  // "Enquire": close the dance view, jump to the contact form with the subject filled in
  danceEl.querySelectorAll("[data-book]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const subject = a.dataset.book;
    if (history.state && history.state.folio) history.back(); else closeFolio();
    setTimeout(() => {
      const contact = document.getElementById("contact");
      contact.scrollIntoView({ behavior: "smooth", block: "start" });
      const f = document.querySelector('#contactForm input[name="subject"]');
      if (f) { f.value = subject; setTimeout(() => document.querySelector('#contactForm input[name="first"]')?.focus({ preventScroll: true }), 700); }
    }, 650);
  }));
  renderDance();
}

/* ---------- Site footer: same footer at the bottom of every portfolio page ---------- */
(() => {
  const foot = document.getElementById("siteFoot");
  if (!foot) return;
  document.querySelectorAll(".sf-year").forEach((y) => (y.textContent = new Date().getFullYear()));
  document.querySelectorAll(".folio, .coll, .release").forEach((sec) => {
    const f = foot.cloneNode(true);
    f.removeAttribute("id");
    f.classList.add("site-foot-copy");
    sec.appendChild(f);
  });
})();

/* ---------- Twinkling stars behind About + Contact ---------- */
(() => {
  const box = document.querySelector(".wall-bottom .twinkles");
  if (!box) return;
  const colors = ["#ffffff", "#cfe0ff", "#ffe9c8", "#bcd0ff"];
  const count = window.innerWidth <= 640 ? 18 : window.innerWidth <= 1100 ? 26 : 36;
  for (let i = 0; i < count; i++) {
    const t = document.createElement("span");
    t.className = "tw";
    t.innerHTML = "<i></i>";
    const big = Math.random() < 0.18;
    t.style.cssText =
      `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;` +
      `--s:${big ? 22 + Math.random() * 14 : 8 + Math.random() * 10}px;` +
      `--c:${colors[i % colors.length]};` +
      `--d:${(3 + Math.random() * 5).toFixed(1)}s;--dl:${(-Math.random() * 8).toFixed(1)}s;`;
    box.appendChild(t);
  }
})();

/* ---------- Shooting stars behind About + Contact ---------- */
(() => {
  const box = document.querySelector(".wall-bottom .twinkles");
  const wall = document.querySelector(".wall-bottom");
  if (!box || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let onScreen = false;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(wall);
  const fire = () => {
    if (onScreen && !document.hidden) {
      const s = document.createElement("span");
      s.className = "shoot";
      const phone = innerWidth <= 640;
      const len = (phone ? 90 : 140) + Math.random() * (phone ? 60 : 120);
      const dur = 0.9 + Math.random() * 0.7;
      s.style.cssText =
        `left:${(35 + Math.random() * 60).toFixed(1)}%;top:${(5 + Math.random() * 45).toFixed(1)}%;` +
        `--len:${len.toFixed(0)}px;--ang:${(-(18 + Math.random() * 22)).toFixed(1)}deg;--dur:${dur.toFixed(2)}s;`;
      box.appendChild(s);
      setTimeout(() => s.remove(), dur * 1000 + 200);
    }
    setTimeout(fire, 3500 + Math.random() * 6000);
  };
  setTimeout(fire, 1500);
})();

/* ---------- Portfolio navbar: the home page navbar, shown on top of the portfolio pages ---------- */
(() => {
  const bar = document.getElementById("pnav");
  if (!bar) return;
  const sync = () => {
    const cur = document.querySelector(".folio.open");
    bar.querySelectorAll("[data-folio]").forEach((b) => b.classList.toggle("current", !!cur && b.dataset.folio === cur.id));
    if (cur) { bar.hidden = false; requestAnimationFrame(() => bar.classList.add("open")); }
    else { bar.classList.remove("open"); setTimeout(() => { if (!document.querySelector(".folio.open")) bar.hidden = true; }, 600); }
  };
  document.querySelectorAll(".folio").forEach((f) => new MutationObserver(sync).observe(f, { attributes: true, attributeFilter: ["class"] }));
  sync();
  // each link leaves the portfolio, then scrolls to that part of the home page
  bar.querySelectorAll("[data-leave]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = a.dataset.leave;
    if (history.state && history.state.folio) history.back();
    else { closeFolio(); history.replaceState(null, "", "#" + target); }
    setTimeout(() => {
      if (target === "home") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 650);
  }));
})();

/* ---------- Portfolio dropdown: a bar under the navbar (portfolio pages only) ---------- */
(() => {
  const bar = document.getElementById("pnav");
  const drop = bar && bar.querySelector(".nav-drop");
  if (!drop) return;
  const link = drop.querySelector(":scope > a");
  const menu = drop.querySelector(".drop-menu");
  bar.appendChild(menu);                                   // full-width bar right under the navbar
  const touch = matchMedia("(hover: none)").matches;
  let t;
  const open = () => { clearTimeout(t); bar.classList.add("drop-on"); };
  const close = (delay = 0) => { clearTimeout(t); t = setTimeout(() => bar.classList.remove("drop-on"), delay); };
  if (!touch) {
    [link, menu].forEach((el) => {
      el.addEventListener("mouseenter", open);
      el.addEventListener("mouseleave", () => close(220));   // grace time to move the mouse down to the bar
    });
  }
  if (!touch) link.addEventListener("focus", open);      // keyboard users
  // iPad / phone: first tap on "Portfolio" opens the bar, a second tap follows the link
  link.addEventListener("click", (e) => {
    if (touch && !bar.classList.contains("drop-on")) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
    else close();
  }, true);
  menu.querySelectorAll("[data-folio]").forEach((b) => b.addEventListener("click", () => {
    close(); document.activeElement?.blur();
    const id = b.dataset.folio;
    const cur = document.querySelector(".folio.open");
    if (cur && cur.id === id) { cur.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (cur) {
      history.replaceState({ folio: id }, "", "#" + id);       // switch: Back still returns to the home page
      cur.classList.remove("open");
      setTimeout(() => { if (!cur.classList.contains("open")) cur.hidden = true; }, 600);
    } else history.pushState({ folio: id }, "", "#" + id);
    openFolio(id);
  }));
  document.addEventListener("click", (e) => { if (!e.target.closest("#pnav")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.querySelectorAll(".folio").forEach((f) => f.addEventListener("scroll", () => close(), { passive: true }));
})();

/* ---------- Music: tidy-ups for real releases ---------- */
(() => {
  // only show the type filter if there's more than one kind of release
  const types = new Set(MUSIC.map((r) => r.type));
  const filt = document.querySelector("#music .mu-filter");
  if (filt) {
    filt.querySelectorAll("[data-type]").forEach((b) => { if (b.dataset.type !== "all" && !types.has(b.dataset.type)) b.remove(); });
    if (types.size < 2) filt.style.display = "none";
  }
  // real artwork that can't load (blocked or offline) is removed, so the designed cover shows
  document.addEventListener("error", (e) => { if (e.target.classList?.contains("ca-img")) e.target.remove(); }, true);
})();

/* ---------- Preview notice: outside players are blocked here, so offer the SoundCloud link ---------- */
function muToast(title, url) {
  let el = document.getElementById("mu-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "mu-toast"; el.className = "mu-toast"; el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.innerHTML = `<p><strong>${escH(title)}</strong> plays right here on your published site.
    This preview blocks outside players.</p>
    <a href="${escH(url)}" target="_blank" rel="noopener">Listen on SoundCloud ↗</a>
    <button type="button" aria-label="Close">×</button>`;
  el.querySelector("button").onclick = () => el.classList.remove("show");
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(muToast.t); muToast.t = setTimeout(() => el.classList.remove("show"), 7000);
}

/* ---------- One thing playing at a time: track player, SoundCloud box, Spotify box ---------- */
(() => {
  const box = document.querySelector(".mu-embeds");
  if (!box) return;
  const spF = box.querySelector('iframe[title*="Spotify"]');
  const scF = box.querySelector('iframe[title*="SoundCloud"]');
  let scBox = null, spOn = false;
  const stopSpotify = () => { if (spF && spOn && spF.src) { spF.src = spF.dataset.src; spOn = false; } };   // reloading stops it
  const stopSCBox = () => { if (scBox) scBox.pause(); };
  const stopPlayer = () => { if (typeof MP !== "undefined" && MP.r) stopAll(); };
  window.onlyOne = (who) => {
    if (who !== "player") stopPlayer();
    if (who !== "spotify") stopSpotify();
    if (who !== "soundcloud") stopSCBox();
  };
  // SoundCloud box: its own player tells us when it starts
  if (scF) {
    const hook = () => {
      if (!scF.src || scBox) return;
      scLoadApi().then(() => {
        scBox = SC.Widget(scF);
        scBox.bind(SC.Widget.Events.PLAY, () => onlyOne("soundcloud"));
      }).catch(() => {});
    };
    scF.addEventListener("load", hook); hook();
  }
  // Spotify box: it can't report playback, so a tap inside it counts as "playing"
  window.addEventListener("blur", () => setTimeout(() => {
    const a = document.activeElement;
    if (a === spF) { spOn = true; onlyOne("spotify"); }
    else if (a === scF) { stopPlayer(); stopSpotify(); }
  }, 0));
})();
