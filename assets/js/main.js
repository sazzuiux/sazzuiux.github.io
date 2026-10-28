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

    // scroll spy (landing page only)
    const spyLinks = $$("[data-spy]");
    if (spyLinks.length) {
      const ids = [...new Set(spyLinks.map((a) => a.dataset.spy))];
      const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
      const spy = () => {
        const y = window.innerHeight * 0.35;
        let current = null;
        sections.forEach((s) => {
          const r = s.getBoundingClientRect();
          if (r.top <= y && r.bottom > y) current = s.id;
        });
        spyLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === current));
      };
      spy();
      window.addEventListener("scroll", spy, { passive: true });
    }
  }

  /* ---------------- hero role typewriter ---------------- */
  const role = $("#role");
  if (role && !reduced) {
    const roles = role.dataset.roles.split("|");
    let r = 0, c = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      if (deleting) {
        c--;
        role.textContent = word.slice(0, c);
        if (c <= 0) { deleting = false; r = (r + 1) % roles.length; return setTimeout(tick, 320); }
        return setTimeout(tick, 45);
      }
      c++;
      role.textContent = roles[r].slice(0, c);
      if (c >= roles[r].length) { deleting = true; return setTimeout(tick, 2200); }
      setTimeout(tick, 85);
    };
    setTimeout(tick, 2600);
  }

  /* ---------------- human → robot reveal ---------------- */
  $$("[data-reveal]").forEach((el) => {
    const home = { x: +el.dataset.x || 60, y: +el.dataset.y || 33 };
    const baseR = +el.dataset.r || 100;
    const pos = { x: home.x, y: home.y, r: baseR };
    const target = { x: home.x, y: home.y, r: baseR };
    let inside = false, raf = 0;

    const scaleR = () => baseR * clamp(el.clientWidth / (baseR > 60 ? 540 : 240), 0.55, 1.2);
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
    const update = () => {
      const r = p.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85, end = vh * 0.3;
      const prog = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1);
      const on = Math.round(prog * spans.length);
      spans.forEach((s, i) => s.classList.toggle("on", i < on));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
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
      if (isDesktop()) {
        if (svcCard.parentElement !== desktopHome) desktopHome.appendChild(svcCard);
        slot.remove();
      } else {
        items[active].after(slot);
        if (svcCard.parentElement !== slot) slot.appendChild(svcCard);
      }
    };
    const setActive = (i, animate = true) => {
      if (i === active) return;
      const first = active === -1;
      active = i;
      items.forEach((li, k) => {
        li.classList.toggle("is-active", k === i);
        li.classList.toggle("is-dim", isDesktop() && k > i + 1);
        $(".svc__btn", li).setAttribute("aria-expanded", String(k === i));
      });
      if (first || !animate || reduced) { fill(i); placeCard(); return; }
      svcCard.classList.add("is-swapping");
      setTimeout(() => { fill(i); placeCard(); svcCard.classList.remove("is-swapping"); }, 220);
    };
    items.forEach((li, i) => $(".svc__btn", li).addEventListener("click", () => {
      lockUntil = performance.now() + 1200;
      setActive(i);
      if (!isDesktop()) setTimeout(() => li.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 260);
    }));
    setActive(0, false);

    // desktop: the row crossing the middle of the screen becomes active as you scroll
    const io = new IntersectionObserver((entries) => {
      if (!isDesktop() || performance.now() < lockUntil) return;
      entries.forEach((en) => en.isIntersecting && setActive(items.indexOf(en.target)));
    }, { rootMargin: "-48% 0px -48% 0px" });
    items.forEach((li) => io.observe(li));
    window.addEventListener("resize", () => {
      placeCard();
      items.forEach((li, k) => li.classList.toggle("is-dim", isDesktop() && k > active + 1));
    });
  }

  /* ---------------- works: stacked cards shrink as the next one slides over ---------------- */
  const works = $$(".work");
  if (works.length && !reduced) {
    const stack = () => {
      works.forEach((card, i) => {
        const next = works[i + 1];
        if (!isDesktop() || !next) { card.style.transform = ""; card.style.filter = ""; return; }
        const a = card.getBoundingClientRect(), b = next.getBoundingClientRect();
        const p = clamp(1 - (b.top - a.top) / a.height, 0, 1);
        card.style.transform = `scale(${1 - p * 0.06})`;
        card.style.filter = `brightness(${1 - p * 0.45})`;
      });
    };
    stack();
    window.addEventListener("scroll", () => requestAnimationFrame(stack), { passive: true });
    window.addEventListener("resize", stack);
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
      steps.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.classList.toggle("done", k < i); });
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

  /* ---------------- custom cursor: spinning "Hire me now" + face that follows ---------------- */
  const cursor = $(".cursor");
  const dot = $(".cursor-dot");
  if (cursor && dot && finePointer) {
    document.documentElement.classList.add("has-cursor");
    const face = $(".cursor__face", cursor);
    const p = { x: -200, y: -200 }, c = { x: -200, y: -200 };
    let vx = 0, vy = 0, shown = false;
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      p.x = e.clientX; p.y = e.clientY;
      dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (!shown) { c.x = p.x; c.y = p.y; shown = true; cursor.classList.remove("is-hidden"); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("pointerenter", () => cursor.classList.remove("is-hidden"));
    document.addEventListener("pointerover", (e) => {
      const t = e.target;
      cursor.classList.toggle("is-link", !!t.closest("a, button, label, [role=button]"));
      const off = !!t.closest("[data-reveal], input, textarea");
      cursor.classList.toggle("is-hidden", off);
    });
    const loop = () => {
      const nx = lerp(c.x, p.x, 0.18), ny = lerp(c.y, p.y, 0.18);
      vx = lerp(vx, nx - c.x, 0.25); vy = lerp(vy, ny - c.y, 0.25);
      c.x = nx; c.y = ny;
      cursor.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      // the head leans and nods in the direction of travel
      const rot = clamp(vx * 1.4, -22, 22);
      const tx = clamp(vx * 0.5, -8, 8), ty = clamp(vy * 0.5, -8, 8);
      face.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${1 + clamp(Math.hypot(vx, vy) / 120, 0, 0.08)})`;
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
      host.addEventListener("pointerenter", () => enter(el));
      host.addEventListener("pointerleave", () => leave(el));
    });
  }

  /* ---------------- contact form (FormSubmit, no backend needed) ---------------- */
  const form = $("#contact-form");
  if (form) {
    const msg = $(".form__status", form);
    form.addEventListener("submit", async (e) => {
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
        const res = await fetch("https://formsubmit.co/ajax/sazzuxui@gmail.com", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        msg.textContent = "Thanks! Your message is on its way. I reply within 24 hours.";
        msg.classList.add("ok");
      } catch (err) {
        msg.innerHTML = 'Something went wrong. Email me directly at <a href="mailto:sazzuxui@gmail.com" style="text-decoration:underline">sazzuxui@gmail.com</a>.';
        msg.classList.add("err");
      } finally { btn.disabled = false; btn.style.opacity = ""; }
    });
  }

  /* ---------------- resume: print ---------------- */
  const printBtn = $("#print-btn");
  printBtn && printBtn.addEventListener("click", () => window.print());
})();
