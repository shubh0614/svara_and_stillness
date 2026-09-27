(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Page-load sequence starts once fonts are ready, so nothing reflows mid-animation */
  var started = false;
  function startSequence() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add("is-loaded"); });
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startSequence);
    setTimeout(startSequence, 1200);
  } else {
    startSequence();
  }

  /* Header background after scrolling */
  var header = document.querySelector("[data-header]");
  var ticking = false;
  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(updateHeader); ticking = true; }
  }, { passive: true });
  updateHeader();

  /* Mobile menu */
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.querySelector("[data-nav-menu]");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 881px)").addEventListener("change", function (e) {
    if (e.matches) setMenu(false);
  });

  /* Highlight the current section in the nav */
  var navLinks = document.querySelectorAll(".nav__list a");
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.setAttribute("aria-current", String(link.getAttribute("href") === "#" + entry.target.id));
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["about", "sessions", "visit", "questions", "book", "top", "facilitator", "instruments"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });
  }

  /* Singing bowl: a tone synthesised with the Web Audio API, no audio files needed */
  var bowl = document.querySelector("[data-bowl]");
  var ripples = document.querySelector("[data-ripples]");
  var audio = null;
  var notes = [196.0, 220.0, 174.61, 261.63, 196.0, 146.83];
  var noteIndex = 0;

  function makeImpulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate;
    var length = Math.floor(rate * seconds);
    var buffer = ctx.createBuffer(2, length, rate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  function setupAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0.28;
    var compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 3;
    var dry = ctx.createGain();
    dry.gain.value = 0.9;
    var wet = ctx.createGain();
    wet.gain.value = 0.32;
    var reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 3.4, 2.4);
    master.connect(dry).connect(compressor);
    master.connect(reverb).connect(wet).connect(compressor);
    compressor.connect(ctx.destination);
    return { ctx: ctx, out: master };
  }

  function strikeBowl() {
    if (!audio) audio = setupAudio();
    if (!audio) return;
    var ctx = audio.ctx;
    if (ctx.state === "suspended") ctx.resume();

    var now = ctx.currentTime + 0.02;
    var f0 = notes[noteIndex++ % notes.length];
    /* Singing bowl partials are inharmonic; each pair is slightly detuned to create the slow "wah" beating */
    var partials = [
      { ratio: 1, gain: 1, decay: 14, attack: 0.03 },
      { ratio: 2.76, gain: 0.42, decay: 9, attack: 0.015 },
      { ratio: 5.4, gain: 0.16, decay: 5, attack: 0.01 },
      { ratio: 8.93, gain: 0.06, decay: 2.5, attack: 0.008 }
    ];

    partials.forEach(function (p) {
      [1, 1.0035].forEach(function (detune, k) {
        var osc = ctx.createOscillator();
        var env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f0 * p.ratio * detune;
        var peak = p.gain * 0.5 * (k === 0 ? 1 : 0.85);
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(peak, now + p.attack);
        env.gain.exponentialRampToValueAtTime(0.001, now + p.decay);
        env.gain.linearRampToValueAtTime(0, now + p.decay + 0.08);
        osc.connect(env).connect(audio.out);
        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });
    });

    /* Soft mallet contact */
    var noiseLength = Math.floor(ctx.sampleRate * 0.08);
    var noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    var nd = noiseBuffer.getChannelData(0);
    for (var i = 0; i < noiseLength; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength);
    var noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    var band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800;
    band.Q.value = 0.8;
    var ng = ctx.createGain();
    ng.gain.value = 0.05;
    noise.connect(band).connect(ng).connect(audio.out);
    noise.start(now);
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  function emitRipples() {
    if (reduceMotion || !ripples.animate) return;
    [0, 380, 760].forEach(function (delay) {
      var c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", "828");
      c.setAttribute("cy", "320");
      c.setAttribute("r", "25");
      ripples.appendChild(c);
      var anim = c.animate([
        { transform: "scale(1)", opacity: 0.85 },
        { transform: "scale(5.2)", opacity: 0 }
      ], { duration: 3200, delay: delay, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "both" });
      anim.onfinish = function () { c.remove(); };
    });
  }

  if (bowl) {
    bowl.addEventListener("click", function () {
      strikeBowl();
      emitRipples();
      bowl.classList.add("has-played");
      bowl.classList.remove("is-struck");
      void bowl.offsetWidth;
      bowl.classList.add("is-struck");
    });
  }

  /* Sessions: crossfade the sticky photo to match the session in view */
  var sessions = document.querySelectorAll("[data-session]");
  var sessionImgs = document.querySelectorAll("[data-session-img]");
  function setSession(key) {
    sessions.forEach(function (s) { s.classList.toggle("is-active", s.dataset.session === key); });
    sessionImgs.forEach(function (img) {
      var active = img.dataset.sessionImg === key;
      if (active && img.loading === "lazy") img.loading = "eager";
      img.classList.toggle("is-active", active);
    });
  }
  if ("IntersectionObserver" in window && sessions.length) {
    var sessionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setSession(entry.target.dataset.session);
      });
    }, { rootMargin: "-42% 0px -42% 0px" });
    sessions.forEach(function (s) {
      sessionObserver.observe(s);
      s.addEventListener("mouseenter", function () { setSession(s.dataset.session); });
      s.addEventListener("focusin", function () { setSession(s.dataset.session); });
    });
    /* Warm the other photos once the section is near, so the crossfade never waits on a download */
    var warm = new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) {
        sessionImgs.forEach(function (img) { img.loading = "eager"; });
        obs.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    warm.observe(document.getElementById("sessions"));
  }

  /* Session steps: draw the wave when the section comes into view */
  var steps = document.querySelector("[data-steps]");
  if (steps) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      var stepsObserver = new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) {
          steps.classList.add("is-visible");
          obs.disconnect();
        }
      }, { threshold: 0.35 });
      stepsObserver.observe(steps);
    } else {
      steps.classList.add("is-visible");
    }
  }

  /* FAQ: animate open and close */
  document.querySelectorAll(".faq__item").forEach(function (item) {
    var summary = item.querySelector("summary");
    var body = item.querySelector(".faq__body");
    var anim = null;

    summary.addEventListener("click", function (e) {
      if (reduceMotion || !body.animate) return;
      e.preventDefault();
      if (anim) anim.cancel();

      if (!item.open) {
        item.open = true;
        var h = body.offsetHeight;
        anim = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }],
          { duration: 520, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" });
        anim.onfinish = function () { anim = null; };
      } else {
        var start = body.offsetHeight;
        anim = body.animate([{ height: start + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 420, easing: "cubic-bezier(0.45, 0, 0.2, 1)" });
        anim.onfinish = function () { item.open = false; anim = null; };
      }
    });
  });

  /* Enquiry form */
  var form = document.querySelector("[data-form]");
  if (form) {
    var statusEl = form.querySelector("[data-status]");
    var submitBtn = form.querySelector("[data-submit]");
    var submitText = submitBtn.querySelector(".button__text");
    var WHATSAPP = "919019000800";

    function fieldOf(input) { return input.closest(".field"); }
    function setError(input, show) {
      var field = fieldOf(input);
      field.classList.toggle("has-error", show);
      if (show) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", input.id + "-error");
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }

    function validate() {
      var name = form.elements.name;
      var phone = form.elements.phone;
      var email = form.elements.email;
      var okName = name.value.trim().length > 1;
      var okPhone = phone.value.replace(/\D/g, "").length >= 7;
      var okEmail = !email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      setError(name, !okName);
      setError(phone, !okPhone);
      setError(email, !okEmail);
      var firstBad = !okName ? name : !okPhone ? phone : !okEmail ? email : null;
      if (firstBad) firstBad.focus();
      return !firstBad;
    }

    ["name", "phone", "email"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () {
        if (fieldOf(this).classList.contains("has-error")) setError(this, false);
      });
    });

    function setStatus(text, type) {
      statusEl.textContent = text;
      statusEl.className = "form__status" + (type ? " is-" + type : "");
    }

    function summary() {
      var f = form.elements;
      var lines = [
        "Hi, I'd like to book a sound healing session.",
        "Name: " + f.name.value.trim(),
        "Phone: " + f.phone.value.trim(),
        "Session: " + f.session.value
      ];
      if (f.email.value.trim()) lines.push("Email: " + f.email.value.trim());
      if (f.preferred_date.value) lines.push("Preferred date: " + f.preferred_date.value);
      if (f.message.value.trim()) lines.push("Note: " + f.message.value.trim());
      return lines.join("\n");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setStatus("", "");
      if (!validate()) return;
      if (form.elements.botcheck.checked) return;

      var key = form.elements.access_key.value;

      /* Until a Web3Forms key is added, send the enquiry through WhatsApp instead */
      if (!key || key.indexOf("YOUR_") === 0) {
        window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(summary()), "_blank", "noopener");
        setStatus("WhatsApp has opened with your details. Press send there and we will reply soon.", "success");
        return;
      }

      submitBtn.disabled = true;
      submitText.textContent = "Sending";

      var data = {};
      new FormData(form).forEach(function (value, k) { if (k !== "botcheck") data[k] = value; });

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); })
        .then(function (r) {
          if (!r.ok || !r.json.success) throw new Error(r.json.message || "Request failed");
          form.classList.add("is-sent");
          setStatus("Thank you. Your enquiry has been sent, and we will be in touch within a day.", "success");
          form.reset();
        })
        .catch(function () {
          setStatus("Your enquiry did not send. Check your connection and try again, or message us on WhatsApp.", "error");
        })
        .then(function () {
          submitBtn.disabled = false;
          submitText.textContent = "Send enquiry";
        });
    });
  }

  /* Footer year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
