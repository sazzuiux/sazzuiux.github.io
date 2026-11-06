/* Sazzuiux portfolio — interactions (vanilla JS, no dependencies) */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isDesktop = () => window.innerWidth >= 1024;
  const SITE = window.SITE || { services: [], steps: [] };
  const pad = (n) => String(n).padStart(2, "0");
  // true while an in-page link is scrolling the page (scroll-driven effects hold still meanwhile)
  let autoScrollUntil = 0;
  const isAutoScrolling = () => performance.now() < autoScrollUntil;

  /* ---------------- page switch: curtain transition (every device, every browser) ---------------- */
  // a visitor who already opened Resume/Pricing doesn't get the first-visit loader again on Home
  if (!document.getElementById("loader")) try { sessionStorage.setItem("szLoaded", "1"); } catch (e) {}
  const pageName = (path) => (/resume/.test(path) ? "Resume" : /pricing/.test(path) ? "Pricing" : "Home");
  const pageGo = (href) => {
    const url = new URL(href, location.href);
    // only Resume and Pricing get the curtain; going back Home (My Works, Services, About…) is a plain jump
    if (reduced || pageName(url.pathname) === "Home") { location.href = url.href; return; }
    try { sessionStorage.setItem("szPT", pageName(url.pathname)); sessionStorage.setItem("szLoaded", "1"); } catch (e) {}
    if ($(".pt")) return;
    const pt = document.createElement("div");
    pt.className = "pt"; pt.setAttribute("aria-hidden", "true");
    pt.innerHTML = '<i class="pt__o"></i><i class="pt__k"></i><span class="pt__label"><b>' + pageName(url.pathname) + "</b></span>";
    document.body.appendChild(pt);
    document.documentElement.classList.add("pt-leave");
    requestAnimationFrame(() => requestAnimationFrame(() => pt.classList.add("is-on")));
    setTimeout(() => { location.href = url.href; }, 900);
  };
  // arriving through the curtain: lift it once the page is ready to show
  if (document.documentElement.classList.contains("pt-in")) {
    const h = document.documentElement;
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add("pt-out")));
    setTimeout(() => { h.classList.remove("pt-in", "pt-out"); h.style.removeProperty("--pt-label"); }, 1500);
  }
  // any other link to another page of the site uses the curtain too (logo, footer, CTAs…)
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download") || a.hasAttribute("data-soon") || a.hasAttribute("data-to")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // a link to the page you're already on (e.g. "Resume" while reading Resume): glide back to the top, no reload
    if (url.pathname === location.pathname) {
      if (!url.hash && url.search === location.search) { e.preventDefault(); scrollToEl(document.documentElement, "#top"); }
      return;
    }
    if (pageName(url.pathname) === "Home") return;
    e.preventDefault();
    pageGo(url.href);
  });
  // back/forward from the browser cache: no curtain left on screen
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    $$(".pt").forEach((n) => n.remove());
    document.documentElement.classList.remove("pt-leave", "pt-in", "pt-out");
  });
  // warm up the next page while the finger/mouse is on its link
  const warmed = new Set();
  const warm = (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || warmed.has(url.pathname)) return;
    warmed.add(url.pathname);
    const l = document.createElement("link"); l.rel = "prefetch"; l.href = url.pathname; document.head.appendChild(l);
  };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("touchstart", warm, { passive: true });

  /* clean share-tracking junk (?fbclid=… from Facebook/Messenger, Instagram, Bing, TikTok) out of the address bar.
     utm_* tags are kept so Google Analytics still sees where visitors came from. */
  try {
    const u = new URL(location.href);
    let dirty = false;
    ["fbclid", "igshid", "igsh", "msclkid", "ttclid", "mc_eid"].forEach((k) => { if (u.searchParams.has(k)) { u.searchParams.delete(k); dirty = true; } });
    if (dirty) history.replaceState(history.state, "", u.pathname + (u.searchParams.toString() ? "?" + u.searchParams : "") + u.hash);
  } catch (e) {}

  /* ---------------- loader: first visit of the session ---------------- */
  const loader = $("#loader");
  if (loader && document.documentElement.classList.contains("is-loading")) {
    const bar = $("#loader-bar"), pct = $("#loader-pct");
    const imgs = $$("img").filter((im) => !im.closest(".loader") && im.loading !== "lazy");
    // The loader lasts exactly as long as the page really needs: it follows the real
    // loading of images, fonts and the page itself. Fast connection = a blink, slow = longer.
    // MIN only stops a jarring flash; MAX is a safety net so nobody waits forever.
    const t0 = performance.now(), MIN = 450, MAX = 6000;
    let shown = 0, done = false, pageLoaded = document.readyState === "complete", fontsReady = !document.fonts;
    window.addEventListener("load", () => { pageLoaded = true; }, { once: true });
    document.fonts && document.fonts.ready.then(() => { fontsReady = true; });
    const loadedShare = () => {
      if (!imgs.length) return 1;
      return imgs.filter((im) => im.complete).length / imgs.length;
    };
    const finish = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem("szLoaded", "1"); } catch (e) {}
      loader.classList.add("is-done");
      setTimeout(() => { document.documentElement.classList.remove("is-loading"); loader.remove(); window.dispatchEvent(new Event("sz:loaded")); }, 650);
    };
    const step = (now) => {
      const t = now - t0;
      const ready = loadedShare() * 0.8 + (fontsReady ? 0.1 : 0) + (pageLoaded ? 0.1 : 0);
      const allDone = (ready >= 0.999 && t >= MIN) || t > MAX;
      // real progress, held just below 100 until everything has actually arrived
      const goal = allDone ? 100 : Math.min(96, 8 + ready * 88);
      shown = Math.min(goal, shown + Math.max(allDone ? 4 : 0.4, (goal - shown) * (allDone ? 0.3 : 0.15)));
      const v = Math.min(100, Math.round(shown));
      bar.style.width = v + "%"; pct.textContent = v + "%";
      if (v >= 100) return setTimeout(finish, 120);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- tablet / mobile: bottom tab bar (Figma) ----------------
     A copy of the main links pinned to the bottom of the screen. Built here (not inside
     the header) so the header's blur can't trap a position:fixed bar. Contact stays in
     the top "Let's talk" button; Pricing keeps its spinning gradient stroke. */
  const mainLinks = $(".nav__links");
  if (mainLinks) {
    const bar = mainLinks.cloneNode(true);
    bar.className = "tabbar";
    bar.setAttribute("aria-label", "Sections");
    $$("a", bar).forEach((a) => {
      if (/contact/i.test(a.textContent)) a.remove();
      if (/pricing/i.test(a.textContent)) a.classList.add("nav-hot");
      if (/^\s*my works\s*$/i.test(a.textContent)) a.innerHTML = '<span class="tabbar__my">My </span>Works'; // mobile shows "Works" so both sides balance
    });
    // two halves around Pricing: on mobile Pricing sits in the exact middle and each half is spaced evenly
    const hot = $("a.nav-hot", bar);
    if (hot) {
      const left = document.createElement("span"), right = document.createElement("span");
      left.className = right.className = "tabbar__side";
      [...bar.children].forEach((a, i, all) => { const k = all.indexOf(hot); if (i < k) left.appendChild(a); else if (i > k) right.appendChild(a); });
      bar.prepend(left); bar.appendChild(right);
    }
    document.body.appendChild(bar);
    // top "Let's talk" lights up like a tab while the contact section is on screen (scroll spy below)
    $$(".nav__actions .btn").forEach((b) => { if (b.dataset.to === "contact" || /#contact$/.test(b.getAttribute("href") || "")) b.dataset.spy = "contact"; });
    // like the desktop nav: the active highlight grows in on load, and a tapped tab lights up right away
    setTimeout(() => bar.classList.add("nav-ready"), 250);
    $$("a", bar).forEach((a) => a.addEventListener("click", (e) => {
      $$("a", bar).forEach((b) => b.classList.toggle("is-active", b === a));
      const url = new URL(a.href, location.href);
      if (url.pathname === location.pathname || e.metaKey || e.ctrlKey || e.shiftKey) return; // same page: smooth scroll handles it
      e.preventDefault(); // other page: the highlight grows while the curtain comes up
      pageGo(a.href);
    }));
  }

  /* ---------------- nav ---------------- */
  const nav = $("#nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const btn = $(".nav__menu-btn", nav);
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    btn && btn.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    $$(".nav__panel a", nav).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));

    const movePill = () => {};
    // on page load (e.g. coming from the other page), the active link's highlight grows in too
    const navLinks = $(".nav__links", nav);
    navLinks && setTimeout(() => navLinks.classList.add("nav-ready"), 250);
    // links to the OTHER page: show the highlight growing first, then go
    navLinks && $$("a", navLinks).forEach((a) => a.addEventListener("click", (e) => {
      const url = new URL(a.href, location.href);
      if (a.hasAttribute("data-soon") || url.pathname === location.pathname || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      $$("a", navLinks).forEach((b) => b.classList.toggle("is-active", b === a));
      pageGo(a.href);
    }));
    // clicking a link highlights it right away (scroll spy confirms on arrival)
    $$("a[data-spy]", nav).forEach((a) => a.addEventListener("click", () => {
      $$("a[data-spy]", nav).forEach((b) => b.classList.toggle("is-active", b.dataset.spy === a.dataset.spy));
      movePill();
    }));

    // scroll spy
    const spyLinks = $$("[data-spy]");
    if (spyLinks.length) {
      const ids = [...new Set(spyLinks.map((a) => a.dataset.spy))];
      const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
      const spy = () => {
        if (isAutoScrolling()) return; // don't flick through every section on the way
        const y = document.documentElement.clientHeight * 0.35;
        let current = null;
        sections.forEach((s) => {
          const r = s.getBoundingClientRect();
          if (r.top <= y && r.bottom > y) current = s.id;
        });
        spyLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === current));
        movePill();
      };
      spy();
      window.addEventListener("scroll", spy, { passive: true });
    }
  }

  /* ---------------- typewriter: hero role + resume headline ---------------- */
  $$("[data-roles]").forEach((el) => {
    const roles = el.dataset.roles.split("|");
    // keep the typing line on ONE line: shrink it a little if the longest phrase
    // wouldn't fit (small phones, large system text), so nothing below jumps
    const line = el.closest(".r-rotator, .hero__role");
    if (line) {
      // the whole headline scales together, so both lines stay the same size
      const head = line.closest("h1") || line.parentElement;
      const fit = () => {
        const keep = el.textContent;
        head.style.fontSize = "";
        const left = line.getBoundingClientRect().left;
        let widest = 0;
        roles.forEach((t) => { el.textContent = t; widest = Math.max(widest, line.lastElementChild.getBoundingClientRect().right - left); });
        el.textContent = keep;
        const box = line.closest(".container") || line.parentElement, cs = getComputedStyle(box);
        const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
        if (widest > avail) head.style.fontSize = Math.floor(parseFloat(getComputedStyle(head).fontSize) * (avail / widest)) + "px";
      };
      fit();
      document.fonts && document.fonts.ready.then(fit);
      let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fit, 120); });
    }
    if (reduced) return;
    let r = 0, c = roles[0].length, deleting = true;
    const tick = () => {
      if (deleting) {
        c--;
        el.textContent = roles[r].slice(0, c);
        if (c <= 0) { deleting = false; r = (r + 1) % roles.length; return setTimeout(tick, 180); }
        return setTimeout(tick, 22);
      }
      c++;
      el.textContent = roles[r].slice(0, c);
      if (c >= roles[r].length) { deleting = true; return setTimeout(tick, 1300); }
      setTimeout(tick, 42);
    };
    // start only after the loader is gone, so visitors always see "Product Designer" first
    const start = () => setTimeout(tick, 1000);
    if (document.documentElement.classList.contains("is-loading")) window.addEventListener("sz:loaded", start, { once: true });
    else start();
  });

  /* ---------------- human → robot reveal ---------------- */
  $$("[data-reveal]").forEach((el) => {
    // tablet and desktop use the lens spot/size from the Figma frames (data-xt / data-yt / data-rt, at a 610px-wide photo)
    const tabMQ = matchMedia("(min-width: 768px)"); // tablet + desktop share the Figma lens spot and ratio
    const useTab = () => tabMQ.matches && el.dataset.xt;
    const home = { x: 0, y: 0 };
    const setHome = () => {
      home.x = useTab() ? +el.dataset.xt : +el.dataset.x || 60;
      home.y = useTab() ? +el.dataset.yt : +el.dataset.y || 33;
    };
    setHome();
    tabMQ.addEventListener && tabMQ.addEventListener("change", setHome);
    const baseR = +el.dataset.r || 100;
    const pos = { x: home.x, y: home.y, r: baseR };
    const target = { x: home.x, y: home.y, r: baseR };
    let inside = false, raf = 0;

    const scaleR = () => (useTab() ? +el.dataset.rt * (el.clientWidth / 610)
      : baseR * clamp(el.clientWidth / (baseR > 60 ? 540 : 240), 0.55, 1.2));
    const apply = () => {
      el.style.setProperty("--mx", pos.x + "%");
      el.style.setProperty("--my", pos.y + "%");
      el.style.setProperty("--r", pos.r + "px");
    };
    const loop = (t) => {
      if (!inside) {
        // gentle idle drift so the lens feels alive
        const wob = reduced ? 0 : 1;
        target.x = home.x + Math.sin(t / 1400) * 2.2 * wob;
        target.y = home.y + Math.cos(t / 1700) * 1.6 * wob;
        target.r = scaleR();
      }
      pos.x = lerp(pos.x, target.x, 0.14);
      pos.y = lerp(pos.y, target.y, 0.14);
      pos.r = lerp(pos.r, target.r, 0.12);
      apply();
      raf = requestAnimationFrame(loop);
    };
    const move = (e) => {
      const b = el.getBoundingClientRect();
      target.x = clamp(((e.clientX - b.left) / b.width) * 100, 0, 100);
      target.y = clamp(((e.clientY - b.top) / b.height) * 100, 0, 100);
    };
    el.addEventListener("pointerenter", (e) => { inside = true; target.r = scaleR() * 1.15; move(e); document.documentElement.classList.add("cursor-off"); });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", () => { inside = false; document.documentElement.classList.remove("cursor-off"); });

    // only animate while visible
    new IntersectionObserver(([en]) => {
      cancelAnimationFrame(raf);
      if (en.isIntersecting) raf = requestAnimationFrame(loop);
    }).observe(el);
    apply();
  });

  /* ---------------- about: scroll-reveal text ---------------- */
  $$("[data-scroll-text]").forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    const spans = $$(".w", p);
    // one-way: words light up as you scroll down and STAY lit when you scroll back up,
    // so the text is always readable. Uses the layout viewport (clientHeight), not
    // innerHeight, so iOS Safari's collapsing URL bar doesn't shift the trigger points.
    let lit = 0, ticking = false;
    const update = () => {
      ticking = false;
      if (lit >= spans.length) return;
      const r = p.getBoundingClientRect();
      const vh = document.documentElement.clientHeight;
      const start = vh * 0.9, end = vh * 0.45;
      const prog = clamp((start - r.top) / (start - end + r.height * 0.5), 0, 1);
      const on = Math.round(prog * spans.length);
      if (on <= lit) return;
      for (let i = lit; i < on; i++) spans[i].classList.add("on");
      lit = on;
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("load", queue);
  });

  /* ---------------- services ---------------- */
  const svcList = $("#svc-list");
  const svcCard = $("#svc-card");
  if (svcList && svcCard && SITE.services.length) {
    const items = $$(".svc", svcList);
    const desktopHome = svcCard.parentElement;
    const slot = document.createElement("li");
    slot.className = "svc-slot";
    let active = -1, lockUntil = 0;

    const fill = (i) => {
      const s = SITE.services[i];
      $('[data-f="label"]', svcCard).textContent = `${pad(i + 1)} / ${pad(SITE.services.length)} · ${s.label}`;
      $('[data-f="num"]', svcCard).textContent = pad(i + 1);
      $('[data-f="title"]', svcCard).innerHTML = s.head.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
      $('[data-f="list"]', svcCard).innerHTML = s.list.map((x) => `<li>${x.replace(/&/g, "&amp;")}</li>`).join("");
    };
    const placeCard = () => {
      if (svcCard.parentElement !== desktopHome) desktopHome.appendChild(svcCard);
      slot.remove();
    };
    const setActive = (i, animate = true) => {
      if (i === active) return;
      const first = active === -1;
      active = i;
      items.forEach((li, k) => {
        li.classList.toggle("is-active", k === i);
        li.classList.toggle("is-dim", k > i + 1);
        $(".svc__btn", li).setAttribute("aria-expanded", String(k === i));
      });
      if (first || !animate || reduced) { fill(i); placeCard(); return; }
      svcCard.classList.add("is-swapping");
      setTimeout(() => { fill(i); placeCard(); svcCard.classList.remove("is-swapping"); }, 220);
    };
    items.forEach((li, i) => $(".svc__btn", li).addEventListener("click", () => {
      lockUntil = performance.now() + 1200;
      setActive(i);
    }));
    setActive(0, false);

    // desktop: the row crossing the middle of the screen becomes active as you scroll
    const io = new IntersectionObserver((entries) => {
      if (!isDesktop() || performance.now() < lockUntil) return;
      entries.forEach((en) => en.isIntersecting && setActive(items.indexOf(en.target)));
    }, { rootMargin: "-48% 0px -48% 0px" });
    items.forEach((li) => io.observe(li));

    // tablet / mobile (as in Figma): the orange card opens under the active row.
    // The row that crosses the reading line becomes active; while the cards
    // open / close we keep that row still on screen so nothing jumps.
    const keepStill = (li) => {
      let prev = li.getBoundingClientRect().top + window.scrollY;
      const end = performance.now() + 800;
      const f = () => {
        if (isAutoScrolling()) return;
        const cur = li.getBoundingClientRect().top + window.scrollY;
        const d = cur - prev;
        if (Math.abs(d) > 0.5) window.scrollTo(0, window.scrollY + d);
        prev = cur;
        if (performance.now() < end) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };
    let spyTick = false, lastSpyY = window.scrollY;
    const mobileSpy = () => {
      spyTick = false;
      // one-way: cards only open as you scroll DOWN. Scrolling back up leaves the open
      // card where it is (no collapsing/re-opening under your finger), so it stays readable;
      // tapping a row still opens it.
      const y = window.scrollY, down = y > lastSpyY;
      lastSpyY = y;
      if (!down || isDesktop() || performance.now() < lockUntil || isAutoScrolling()) return;
      // layout viewport, not innerHeight: iOS Safari's collapsing URL bar would move the line
      const line = document.documentElement.clientHeight * 0.42;
      let next = 0;
      items.forEach((li, k) => { if (li.getBoundingClientRect().top <= line) next = k; });
      if (next <= active) return;
      keepStill(items[next]);
      setActive(next, false);
    };
    window.addEventListener("scroll", () => { if (!spyTick) { spyTick = true; requestAnimationFrame(mobileSpy); } }, { passive: true });
    items.forEach((li) => $(".svc__btn", li).addEventListener("click", () => { if (!isDesktop()) keepStill(li); }));
    window.addEventListener("resize", () => {
      placeCard();
      items.forEach((li, k) => li.classList.toggle("is-dim", k > active + 1));
    });
  }

  /* ---------------- works: stacked cards shrink as the next one slides over ---------------- */
  const works = $$(".work");
  if (works.length && !reduced) {
    // tablet / mobile: every card stacks. A card taller than the screen sticks
    // once its bottom reaches the screen bottom, so the whole card is always seen.
    let lastW = 0, vh = 0;
    const fit = (force) => {
      const w = window.innerWidth;
      if (!force && w === lastW) return; // ignore mobile URL-bar height changes
      lastW = w;
      vh = document.documentElement.clientHeight;
      works.forEach((card, i) => {
        if (isDesktop()) { card.style.top = ""; return; }
        const base = (w < 768 ? 76 : 84) + i * (w < 768 ? 8 : 12);
        card.style.top = Math.min(base, vh - card.offsetHeight - 16) + "px";
      });
    };
    fit(true);
    window.addEventListener("resize", () => fit(false));
    window.addEventListener("load", () => fit(true));
    const stack = () => {
      works.forEach((card, i) => {
        const next = works[i + 1];
        if (!next) { card.style.transform = ""; card.style.filter = ""; return; }
        const a = card.getBoundingClientRect(), b = next.getBoundingClientRect();
        const p = clamp(1 - (b.top - a.top) / a.height, 0, 1);
        card.style.transform = p ? `scale(${1 - p * 0.06})` : "";
        card.style.filter = p ? `brightness(${1 - p * 0.45})` : "";
      });
    };
    stack();
    window.addEventListener("scroll", () => requestAnimationFrame(stack), { passive: true });
    window.addEventListener("resize", stack);
  }

  /* ---------------- drag marquees: showreel + testimonials ----------------
     auto-scroll, pause on hover, drag left/right with momentum.
     Rows sharing data-drag-group move together when any one of them is dragged. */
  const lanes = $$("[data-drag-marquee]").map((wrap) => {
    const track = $(".marquee__track", wrap);
    const speed = +wrap.dataset.speed || -60; // px per second (negative = content moves right)
    const lane = { wrap, track, speed, x: 0, x0: 0, half: 0, vel: 0, group: wrap.dataset.dragGroup || null };
    lane.measure = () => { lane.half = track.scrollWidth / 2; };
    lane.measure();
    if (speed > 0 && lane.half) lane.x = 0; else lane.x = -(lane.half || 0) / 2;
    return lane;
  }).filter((l) => l.track);
  if (lanes.length) {
    window.addEventListener("resize", () => lanes.forEach((l) => l.measure()));
    window.addEventListener("load", () => lanes.forEach((l) => l.measure()));
    let drag = null, hoverWrap = null, moved = 0, last = performance.now();
    const peers = (lane) => (lane.group ? lanes.filter((l) => l.group === lane.group) : [lane]);
    const tick = (now) => {
      const dt = Math.min(64, now - last) / 1000; last = now;
      lanes.forEach((l) => {
        const held = drag && drag.set.includes(l);
        if (!held) {
          l.vel *= Math.pow(0.04, dt);
          const paused = reduced || (finePointer && hoverWrap && peers(l).some((p) => p.wrap === hoverWrap));
          l.x += ((paused ? 0 : -l.speed) + l.vel) * dt;
        }
        if (l.half) { while (l.x <= -l.half) l.x += l.half; while (l.x > 0) l.x -= l.half; }
        l.track.style.transform = `translate3d(${l.x}px,0,0)`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    lanes.forEach((lane) => {
      const { wrap } = lane;
      wrap.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hoverWrap = wrap; });
      wrap.addEventListener("pointerleave", () => { if (hoverWrap === wrap) hoverWrap = null; });
      wrap.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const set = peers(lane);
        set.forEach((l) => { l.x0 = l.x; l.vel = 0; });
        drag = { lane, set, sx: e.clientX, sy: e.clientY, lx: e.clientX, lt: performance.now(), id: e.pointerId, axis: null, vel: 0 };
        moved = 0;
      });
      // a drag should never open the link underneath
      wrap.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (drag.axis === "y") { drag = null; return; } // vertical swipe: let the page scroll
        drag.set.forEach((l) => l.wrap.classList.add("is-dragging"));
        try { drag.lane.wrap.setPointerCapture(e.pointerId); } catch (err) {}
      }
      moved = Math.max(moved, Math.abs(dx));
      drag.set.forEach((l) => { l.x = l.x0 + dx; });
      const now = performance.now(), dt = Math.max(1, now - drag.lt);
      drag.vel = ((e.clientX - drag.lx) / dt) * 1000; drag.lx = e.clientX; drag.lt = now;
    });
    const end = () => {
      if (!drag) return;
      const v = clamp(drag.vel, -2500, 2500), set = drag.set;
      set.forEach((l) => { l.vel = v; });
      drag = null;
      setTimeout(() => set.forEach((l) => l.wrap.classList.remove("is-dragging")), 0);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  /* ---------------- process steps ---------------- */
  const steps = $$(".step");
  const status = $("#status");
  if (steps.length && status && SITE.steps.length) {
    const S = SITE.steps;
    const f = (k) => $(`[data-s="${k}"]`, status);
    const dots = $$(".progress i", status);
    let cur = -1, lock = 0;
    const set = (i) => {
      if (i === cur) return;
      cur = i;
      steps.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.classList.toggle("done", k < i || (i === S.length - 1 && k === i)); });
      dots.forEach((d, k) => d.classList.toggle("on", k <= i));
      f("bar").style.width = `${(i / (S.length - 1)) * 100}%`;
      status.classList.add("is-swapping");
      setTimeout(() => {
        f("state").textContent = i === S.length - 1 ? "FINAL STEP" : "IN PROGRESS";
        f("count").textContent = `${pad(i + 1)} / ${pad(S.length)}`;
        f("title").textContent = `Step ${i + 1} · ${S[i].name}`;
        f("when").textContent = S[i].when;
        f("next").textContent = i < S.length - 1 ? `Next: ${S[i + 1].name} · ${S[i + 1].when}` : "Next: Launch & handover";
        status.classList.remove("is-swapping");
      }, reduced ? 0 : 200);
    };
    steps.forEach((s, i) => s.addEventListener("click", () => { lock = performance.now() + 1500; set(i); }));
    set(0);
    const io = new IntersectionObserver((entries) => {
      if (performance.now() < lock) return;
      entries.forEach((en) => en.isIntersecting && set(steps.indexOf(en.target)));
    }, { rootMargin: "-46% 0px -46% 0px" });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------------- reveal on scroll ---------------- */
  const ro = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
  }), { threshold: 0.15 });
  $$(".reveal-up").forEach((el) => ro.observe(el));

  /* ---------------- glow parallax (gradients drift with the pointer) ---------------- */
  if (finePointer && !reduced) {
    const glows = $$(".glow");
    let gx = 0, gy = 0, tx = 0, ty = 0;
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 40;
      ty = (e.clientY / window.innerHeight - 0.5) * 40;
    }, { passive: true });
    const gl = () => {
      gx = lerp(gx, tx, 0.04); gy = lerp(gy, ty, 0.04);
      glows.forEach((g, i) => { g.style.translate = `${gx * (i % 2 ? -1 : 1)}px ${gy}px`; });
      requestAnimationFrame(gl);
    };
    requestAnimationFrame(gl);
  }

  /* ---------------- custom cursor: follows the normal pointer, text spins, head shakes ---------------- */
  const cursor = $(".cursor");
  if (cursor && finePointer && !reduced) {
    document.documentElement.classList.add("has-cursor");
    const lean = $(".cursor__lean", cursor);
    const OFF = 18; // sits just below-right of the real pointer so both stay visible
    const p = { x: -300, y: -300 }, c = { x: -300, y: -300 };
    let vx = 0, shown = false;
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      p.x = e.clientX + OFF; p.y = e.clientY + OFF;
      if (!shown) { c.x = p.x; c.y = p.y; shown = true; cursor.classList.remove("is-hidden"); }
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
    document.documentElement.addEventListener("pointerenter", () => shown && cursor.classList.remove("is-hidden"));
    document.addEventListener("pointerover", (e) => {
      const t = e.target;
      cursor.classList.toggle("is-link", !!t.closest("a, button, label, [role=button]"));
      cursor.classList.toggle("is-hidden", !!t.closest("[data-reveal], input, textarea, .wa__panel") || !shown);
    });
    const loop = () => {
      const nx = lerp(c.x, p.x, 0.16), ny = lerp(c.y, p.y, 0.16);
      vx = lerp(vx, nx - c.x, 0.25);
      c.x = nx; c.y = ny;
      cursor.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      lean.style.transform = `rotate(${clamp(vx * 0.8, -14, 14)}deg)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------- water ripple on cards ---------------- */
  const turb = document.getElementById("water-turb");
  const disp = document.getElementById("water-disp");
  if (turb && disp && !reduced) {
    let target = null, start = 0, leaving = 0, raf = 0, amp = 0;
    const frame = (t) => {
      const dt = t - start;
      if (leaving) {
        amp = lerp(amp, 0, 0.12);
        if (amp < 0.3) {
          if (target) target.style.filter = "";
          target = null; leaving = 0; cancelAnimationFrame(raf); raf = 0;
          disp.setAttribute("scale", "0");
          return;
        }
      } else {
        // splash on entry that settles into a gentle, flowing ripple
        amp = 6 + 20 * Math.exp(-dt / 420);
      }
      const fx = 0.011 + 0.003 * Math.sin(t / 700);
      const fy = 0.028 + 0.008 * Math.sin(t / 520 + 1.3);
      turb.setAttribute("baseFrequency", `${fx.toFixed(4)} ${fy.toFixed(4)}`);
      disp.setAttribute("scale", amp.toFixed(2));
      raf = requestAnimationFrame(frame);
    };
    const enter = (el) => {
      if (target && target !== el) target.style.filter = "";
      target = el; leaving = 0; start = performance.now();
      turb.setAttribute("seed", String(Math.floor(Math.random() * 100)));
      el.style.filter = "url(#water)";
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = (el) => { if (target === el) leaving = 1; };
    $$(".water").forEach((el) => {
      const host = el.closest(".shot, .work__cover, .photo-card, .note") || el;
      host.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !host.closest(".is-dragging")) enter(el); });
      host.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") leave(el); });
      // touch screens have no hover: a tap (not a drag or scroll) makes the same ripple for a moment
      let t0 = null, timer = 0;
      host.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") t0 = { x: e.clientX, y: e.clientY }; }, { passive: true });
      host.addEventListener("pointerup", (e) => {
        if (e.pointerType === "mouse" || !t0) return;
        const moved = Math.hypot(e.clientX - t0.x, e.clientY - t0.y); t0 = null;
        if (moved > 10) return;
        enter(el); clearTimeout(timer); timer = setTimeout(() => leave(el), 1600);
      });
      host.addEventListener("pointercancel", () => { t0 = null; });
    });
  }

  /* ---------------- contact form (FormSubmit, no backend needed) ---------------- */
  const form = $("#contact-form");
  if (form) {
    const msg = $(".form__status", form);
    const here = location.href.split("#")[0].split("?")[0];
    if (form._next) form._next.value = `${here}?sent=1#contact`;
    if (/[?&]sent=1/.test(location.search)) {
      msg.textContent = "Thanks! Your message is on its way. I reply within 1–4 hours.";
      msg.className = "form__status ok";
      history.replaceState(null, "", here);
    }
    let nativeOk = false;
    form.addEventListener("submit", async (e) => {
      if (nativeOk) return; // fallback: let the browser post the form normally
      e.preventDefault();
      const email = form.email.value.trim(), text = form.message.value.trim();
      msg.className = "form__status";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Please add a valid email."; msg.classList.add("err"); form.email.focus(); return; }
      if (!text) { msg.textContent = "Tell me a little about the project."; msg.classList.add("err"); form.message.focus(); return; }
      const btn = $("button[type=submit]", form);
      btn.disabled = true; btn.style.opacity = 0.7;
      msg.textContent = "Sending…";
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch("https://formsubmit.co/ajax/sazzuxui@gmail.com", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data), signal: ctrl.signal,
        });
        clearTimeout(tm);
        const out = await res.json().catch(() => ({}));
        if (!res.ok || String(out.success) !== "true") throw new Error(out.message || res.status);
        form.reset();
        msg.textContent = "Thanks! Your message is on its way. I reply within 1–4 hours.";
        msg.classList.add("ok");
        btn.disabled = false; btn.style.opacity = "";
      } catch (err) {
        // the AJAX route can be blocked (ad blockers, privacy settings); a normal form post still works
        msg.textContent = "Sending…";
        nativeOk = true;
        btn.disabled = false;
        HTMLFormElement.prototype.submit.call(form);
      }
    });
  }

  /* ---------------- WhatsApp chat ---------------- */
  const wa = $("#wa");
  if (wa) {
    const panel = $("#wa-panel", wa), fab = $(".wa__fab", wa), msgBox = $("#wa-msg", wa), reply = $("#wa-reply", wa);
    const go = $("#wa-go", wa), note = $("#wa-note", wa);
    const WA = "https://wa.me/8801778968398"; // number link: lets the typed message pre-fill in WhatsApp
    const setOpen = (open) => {
      wa.classList.toggle("is-open", open);
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      fab.setAttribute("aria-label", open ? "Close chat" : "Chat on WhatsApp");
      if (open && finePointer) setTimeout(() => msgBox.focus(), 250);
    };
    fab.addEventListener("click", () => setOpen(panel.hidden));
    $(".wa__close", wa).addEventListener("click", () => { setOpen(false); fab.focus(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { setOpen(false); fab.focus(); } });
    let svc = "website design & development";
    const replies = {
      "UI/UX design": ["Great! Tell me about the product you want designed. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I need a UI/UX design for…"],
      "website design & development": ["Great! Tell me about the website you want designed and developed. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I need a website designed and developed for…"],
      "mobile app": ["Great! Tell me about the app you have in mind. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I need a mobile app designed for…"],
      "SaaS dashboard": ["Great! Tell me about your SaaS product and its users. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I need a SaaS dashboard for…"],
      "branding": ["Great! Tell me about your brand. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I need a brand identity for…"],
      "marketing kit": ["Great! Tell me about your monthly content needs: reels, posts or ads. We'll continue on WhatsApp.", "Hi Sazzad, I need a monthly marketing kit for…"],
      "something else": ["Sure! Tell me what you need. We'll continue the conversation on WhatsApp.", "Hi Sazzad, I'd like help with…"],
    };
    $$(".wa__chips button", wa).forEach((b) => b.addEventListener("click", () => {
      $$(".wa__chips button", wa).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", String(x === b)); });
      svc = b.dataset.svc;
      const r = replies[svc] || replies["something else"];
      reply.textContent = r[0]; msgBox.placeholder = r[1];
    }));
    // the typed message goes straight into the WhatsApp chat box (?text=)
    const msgText = () => msgBox.value.trim() || `Hi Sazzad, I'm interested in ${svc}.`;
    const setHref = () => { go.href = `${WA}?text=${encodeURIComponent(msgText())}`; };
    setHref();
    msgBox.addEventListener("input", setHref);
    go.addEventListener("pointerdown", setHref);
    go.addEventListener("click", () => {
      setHref(); // href is current before the browser follows it
      try { navigator.clipboard.writeText(msgText()); } catch (e) {}
      note.textContent = "Your message is ready in WhatsApp. Just hit send.";
    });
    if (typeof window.gtag === "function") fab.addEventListener("click", () => window.gtag("event", "whatsapp_open"));
  }

  /* ---------------- theme: follows the system, the toggle overrides ---------------- */
  const root = document.documentElement;
  window.addEventListener("pageshow", () => root.classList.remove("page-leave")); // back button: show the page again
  const sysLight = window.matchMedia("(prefers-color-scheme: light)");
  const themeMeta = $('meta[name="theme-color"]');
  const tg = $("#theme-toggle");
  const applyTheme = (t) => {
    root.setAttribute("data-theme", t);
    if (themeMeta) themeMeta.setAttribute("content", t === "light" ? "#f6f5f1" : "#0a0a0a");
    if (tg) tg.setAttribute("aria-label", t === "light" ? "Switch to dark mode" : "Switch to light mode");
  };
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
  const saved = () => { try { return localStorage.getItem("theme"); } catch (e) { return null; } };
  sysLight.addEventListener && sysLight.addEventListener("change", (e) => { if (!saved()) applyTheme(e.matches ? "light" : "dark"); });
  tg && tg.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.classList.add("theme-anim");
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    setTimeout(() => root.classList.remove("theme-anim"), 450);
    if (typeof window.gtag === "function") window.gtag("event", "theme_toggle", { theme: next });
  });

  /* ---------------- pricing: coming soon ---------------- */
  let toast, toastTimer;
  $$("[data-soon]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite");
      toast.innerHTML = '<span class="toast__dot" aria-hidden="true"></span><span><b>Pricing is coming soon.</b> The best prices on the market, on the way.</span>';
      document.body.appendChild(toast);
    }
    toast.classList.remove("is-on"); void toast.offsetWidth; toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 3600);
    if (typeof window.gtag === "function") window.gtag("event", "pricing_click");
  }));

  /* ---------------- in-page links: smooth scroll that lands on the section ----------------
     The target is re-measured every frame, so cards opening/closing or images loading
     on the way can't make the page stop short of (or past) the section. */
  const scrollToEl = (el, hash) => {
    const target = () => Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
    const done = () => {
      autoScrollUntil = 0; root.style.scrollBehavior = ""; window.dispatchEvent(new Event("scroll"));
      ["wheel", "touchstart", "keydown"].forEach((ev) => window.removeEventListener(ev, cancel));
    };
    let stopped = false;
    const cancel = () => { stopped = true; done(); };
    ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, cancel, { passive: true }));
    autoScrollUntil = performance.now() + 4000;
    root.style.scrollBehavior = "auto";
    // the home/logo link (#top) keeps the address clean: just the site URL
    if (location.hash) try { history.replaceState(history.state, "", location.pathname + location.search); } catch (e) {} // keep the address clean (no #section)
    const start = window.scrollY, t0 = performance.now();
    const dur = reduced ? 0 : clamp(Math.abs(target() - start) * 0.3, 450, 1100);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let settle = 0;
    const step = (now) => {
      if (stopped) return;
      const t = dur ? Math.min(1, (now - t0) / dur) : 1;
      const goal = target();
      if (t < 1) {
        window.scrollTo(0, start + (goal - start) * ease(t));
        return requestAnimationFrame(step);
      }
      // hold on the section for a moment in case anything above is still settling
      if (Math.abs(window.scrollY - goal) > 1) { window.scrollTo(0, goal); settle = 0; } else settle++;
      if (settle < 12) return requestAnimationFrame(step);
      done();
    };
    requestAnimationFrame(step);
  };
  /* ---------------- tablet / mobile: back to top (Figma "Nav / Back to top") ----------------
     Hidden while reading; fades up once the visitor reaches the end of the page. Tap → smooth scroll to top. */
  {
    const up = document.createElement("button");
    up.type = "button"; up.className = "totop"; up.setAttribute("aria-label", "Back to top");
    up.innerHTML = '<span class="totop__rocket" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M8 10l4-6 4 6z"/></svg><i class="totop__flame"></i></span><i class="totop__smoke" aria-hidden="true"></i><i class="totop__smoke" aria-hidden="true"></i><i class="totop__smoke" aria-hidden="true"></i>';
    document.body.appendChild(up);
    const check = () => {
      const left = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      const foot = $(".footer");
      const near = foot ? foot.getBoundingClientRect().top < window.innerHeight : left < 400;
      const show = near && window.scrollY > 400;
      if (show && !up.classList.contains("is-shown") && !up.classList.contains("is-launch")) up.classList.remove("is-spent"); // arrow is back for the next launch
      up.classList.toggle("is-shown", show);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    // tap = rocket launch: a little rumble, the arrow blasts off with a flame + smoke, the page follows it up
    let launching = 0;
    up.addEventListener("click", () => {
      up.blur();
      if (reduced) return scrollToEl(document.documentElement, "#top");
      if (launching) return;
      up.classList.add("is-launch");
      setTimeout(() => scrollToEl(document.documentElement, "#top"), 260);
      launching = setTimeout(() => { up.classList.add("is-spent"); up.classList.remove("is-launch"); launching = 0; check(); }, 1100);
    });
  }
  /* ---------------- section links without "#": <a href="/" data-to="works"> ----------------
     Same page: smooth scroll (as before). Other page: remember the section, open the page, land on it. */
  const sectionEl = (id) => (id === "top" ? document.documentElement : document.getElementById(id));
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-to]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname) { try { sessionStorage.setItem("szTo", a.dataset.to); } catch (err) {} }
  }, true); // capture: stored before any nav handler starts the page switch
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-to]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    e.preventDefault();
    if (url.pathname !== location.pathname) { location.href = url.pathname; return; }
    const el = sectionEl(a.dataset.to);
    if (el) scrollToEl(el, null);
    if (el && a.classList.contains("skip-link")) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
  });
  {
    let to = null;
    try { to = sessionStorage.getItem("szTo"); sessionStorage.removeItem("szTo"); } catch (e) {}
    const el = to && sectionEl(to);
    if (el && to !== "top") {
      const jump = () => { root.style.scrollBehavior = "auto"; window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY); root.style.scrollBehavior = ""; };
      jump();
      if (document.readyState !== "complete") window.addEventListener("load", () => setTimeout(jump, 30), { once: true });
    }
  }
  // arriving with a #section in an old/shared link: let the browser land on it, then tidy the address
  if (location.hash) {
    const clean = () => setTimeout(() => { try { history.replaceState(history.state, "", location.pathname + location.search); } catch (e) {} }, 800);
    if (document.readyState === "complete") clean(); else window.addEventListener("load", clean, { once: true });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"], a[href^="/#"]');
    if (!a || a.hasAttribute("data-soon") || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute("href");
    if (href.startsWith("/#") && location.pathname !== "/") return; // other page: let the browser go
    const hash = href.slice(href.indexOf("#"));
    if (hash.length < 2) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el, hash);
  });

  /* ---------------- pricing: add-ons, live total, WhatsApp hand-off ----------------
     The visitor ticks extras; the total and the 10% deposit update live, and the
     CTA opens WhatsApp with the whole order already written out. */
  const pkg = $("#launch-kit");
  if (pkg) {
    const BASE = 1249, WA_NO = "https://wa.me/8801778968398";
    const addons = $$(".addon", pkg), totalEl = $("#p-total"), sumEl = $("#p-sum"), depEl = $("#p-dep"), cta = $("#p-cta");
    const money = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    const picked = () => addons.filter((a) => a.getAttribute("aria-checked") === "true").map((a) => {
      const qty = a.classList.contains("addon--qty") ? +a.dataset.qty : 1;
      return { name: a.dataset.name, qty, price: +a.dataset.price * qty };
    });
    let last = BASE;
    const update = () => {
      const list = picked();
      const total = BASE + list.reduce((s, x) => s + x.price, 0);
      const dep = Math.round(total * 10) / 100;
      totalEl.textContent = money(total);
      depEl.textContent = money(dep);
      [10, 40, 50].forEach((p, i) => { const el = $("#pp-" + (i + 1)); if (el) el.textContent = money(Math.round(total * p) / 100); });
      const n = list.reduce((s, x) => s + x.qty, 0);
      sumEl.textContent = list.length ? `Launch Kit + ${n} add-on${n > 1 ? "s" : ""}` : "The Launch Kit";
      if (total !== last && !reduced) { totalEl.classList.remove("bump"); void totalEl.offsetWidth; totalEl.classList.add("bump"); }
      last = total;
      const lines = [`• The Launch Kit — $1,249`].concat(list.map((x) => `• ${x.name}${x.qty > 1 ? " × " + x.qty : ""} — +${money(x.price)}`));
      const msg = `Hi Sazzad! I want to start with The Launch Kit 🚀\n\n${lines.join("\n")}\n\nTotal: ${money(total)}\n10% to start: ${money(dep)}\n\nPlease send me the payment details.`;
      cta.href = `${WA_NO}?text=${encodeURIComponent(msg)}`;
    };
    const toggle = (a) => { a.setAttribute("aria-checked", String(a.getAttribute("aria-checked") !== "true")); update(); };
    addons.forEach((a) => {
      a.addEventListener("click", (e) => { if (!e.target.closest(".qty")) toggle(a); });
      a.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(a); } });
      $$(".qty__btn", a).forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const q = Math.max(1, Math.min(20, +a.dataset.qty + +b.dataset.step));
        a.dataset.qty = q; $(".qty__val", a).textContent = q;
        $(".addon__copy small", a).textContent = q > 1 ? `${q} pages × $99` : "Add as many as you need";
        update();
      }));
    });
    update();
    const plan = $("#p-plan"), planBtn = plan && $(".pplan__toggle", plan);
    planBtn && planBtn.addEventListener("click", () => {
      const open = planBtn.getAttribute("aria-expanded") !== "true";
      planBtn.setAttribute("aria-expanded", String(open));
      plan.classList.toggle("is-open", open);
      if (open && typeof window.gtag === "function") window.gtag("event", "pricing_plan_open");
    });
    cta.addEventListener("click", () => {
      if (typeof window.gtag === "function") window.gtag("event", "pricing_start", { value: +totalEl.textContent.replace(/[^0-9.]/g, ""), currency: "USD" });
    });
    const ccta = $("#c-cta");
    if (ccta) {
      ccta.href = `${WA_NO}?text=${encodeURIComponent("Hi Sazzad! 👋 My project is bigger than the Launch Kit. Here's what I need:\n\n")}`;
      ccta.addEventListener("click", () => { if (typeof window.gtag === "function") window.gtag("event", "pricing_custom"); });
    }
  }

  /* ---------------- resume: print ---------------- */
  const printBtn = $("#print-btn");
  printBtn && printBtn.addEventListener("click", () => window.print());
})();
