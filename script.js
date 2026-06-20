/* =========================================================
   NINIPIE ANNIVERSARY SITE — SCRIPT
   Pure vanilla JS, no dependencies
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------
     -1) BACKGROUND VIDEO MANAGEMENT
     The moonlit beach loop sits behind everything. Some mobile
     browsers block autoplay even when muted, so we retry play()
     on first user interaction as a fallback. We also pause the
     video when the tab is hidden to save battery/CPU, matching
     the starfield's pause behavior.
     --------------------------------------------------------- */
  (function initBgVideo(){
    const bgVideo = document.getElementById('bgVideo');
    if (!bgVideo) return;

    function tryPlay(){
      const playPromise = bgVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was blocked — retry on first user interaction
          const resume = () => {
            bgVideo.play().catch(() => {});
            document.removeEventListener('touchstart', resume);
            document.removeEventListener('click', resume);
          };
          document.addEventListener('touchstart', resume, { once: true, passive: true });
          document.addEventListener('click', resume, { once: true });
        });
      }
    }
    tryPlay();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        tryPlay();
      } else {
        bgVideo.pause();
      }
    });
  })();


  /* ---------------------------------------------------------
     0) CINEMATIC STARFIELD / BOKEH CANVAS
     Lightweight particle system for the dark nebula background.
     - Two particle types: tiny twinkling stars + soft glowing bokeh orbs
     - Particle count scales down on small/mobile screens for perf
     - Animation pauses when the tab is hidden (saves battery/CPU)
     - Pure transform/opacity-style drawing on canvas, no DOM nodes
     --------------------------------------------------------- */
  (function initStarfield(){
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let width, height, dpr;
    let stars = [];
    let bokehs = [];
    let rafId = null;
    let isVisible = true;

    function isMobile(){ return window.innerWidth < 768; }

    function getCounts(){
      // Keep particle counts modest so this stays smooth on low-power devices.
      const area = window.innerWidth * window.innerHeight;
      const mobile = isMobile();
      const starCount = Math.min(mobile ? 45 : 90, Math.round(area / 12000));
      const bokehCount = mobile ? 4 : 8;
      return { starCount, bokehCount };
    }

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }

    function buildParticles(){
      const { starCount, bokehCount } = getCounts();

      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.6,
        baseAlpha: 0.25 + Math.random() * 0.55,
        twinkleSpeed: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: (Math.random() - 0.5) * 0.04
      }));

      const bokehColors = [
        'rgba(255,126,196,', // pink
        'rgba(157,107,255,', // purple
        'rgba(110,168,255,', // blue
        'rgba(176,131,255,'  // lavender
      ];

      bokehs = Array.from({ length: bokehCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 40 + Math.random() * 90,
        color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        baseAlpha: 0.05 + Math.random() * 0.08,
        speedX: (Math.random() - 0.5) * 0.12,
        speedY: (Math.random() - 0.5) * 0.12,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.2 + Math.random() * 0.3
      }));
    }

    let t = 0;
    function draw(){
      if (!isVisible) { rafId = requestAnimationFrame(draw); return; }
      t += 0.016;

      ctx.clearRect(0, 0, width, height);

      // Bokeh glow orbs (drawn first, behind stars)
      bokehs.forEach(b => {
        b.x += b.speedX;
        b.y += b.speedY;
        // gently wrap around edges
        if (b.x < -b.r) b.x = width + b.r;
        if (b.x > width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = height + b.r;
        if (b.y > height + b.r) b.y = -b.r;

        const pulse = 0.7 + 0.3 * Math.sin(t * b.pulseSpeed + b.phase);
        const alpha = b.baseAlpha * pulse;

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        gradient.addColorStop(0, b.color + alpha + ')');
        gradient.addColorStop(1, b.color + '0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Twinkling stars
      stars.forEach(s => {
        s.x += s.driftX;
        s.y += s.driftY;
        if (s.x < 0) s.x = width; if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height; if (s.y > height) s.y = 0;

        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
        const alpha = s.baseAlpha * twinkle;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      rafId = requestAnimationFrame(draw);
    }

    function start(){
      if (rafId === null) rafId = requestAnimationFrame(draw);
    }
    function stop(){
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    document.addEventListener('visibilitychange', () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) start(); else stop();
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 200);
    });

    resize();
    start();
  })();


  /* ---------------------------------------------------------
     1) LOADING SCREEN
     --------------------------------------------------------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 1800);
  });
  // Fallback in case 'load' already fired
  setTimeout(() => loader.classList.add('hidden'), 3500);


  /* ---------------------------------------------------------
     AMBIENT FLOATING HEARTS (background of entire site)
     --------------------------------------------------------- */
  const ambientContainer = document.getElementById('ambient-hearts');
  const heartEmojis = ['❤️', '💖', '💕', '✨', '💜'];

  function spawnAmbientHeart(){
    const heart = document.createElement('span');
    heart.className = 'ambient-heart';
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    const size = 14 + Math.random() * 18;
    heart.style.fontSize = size + 'px';
    heart.style.left = Math.random() * 100 + 'vw';
    const duration = 8 + Math.random() * 10;
    heart.style.animationDuration = duration + 's';
    ambientContainer.appendChild(heart);
    setTimeout(() => heart.remove(), duration * 1000 + 500);
  }
  setInterval(spawnAmbientHeart, 900);
  for (let i = 0; i < 6; i++) setTimeout(spawnAmbientHeart, i * 300);


  /* ---------------------------------------------------------
     HERO PARTICLES (small glowing dots)
     --------------------------------------------------------- */
  const heroParticles = document.querySelector('.hero-particles');
  if (heroParticles) {
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('div');
      const size = 4 + Math.random() * 8;
      dot.style.position = 'absolute';
      dot.style.width = size + 'px';
      dot.style.height = size + 'px';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.top = Math.random() * 100 + '%';
      dot.style.borderRadius = '50%';
      dot.style.background = 'radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)';
      dot.style.animation = `pulse ${2 + Math.random() * 3}s ease-in-out infinite`;
      dot.style.animationDelay = (Math.random() * 2) + 's';
      heroParticles.appendChild(dot);
    }
  }


  /* ---------------------------------------------------------
     BEAUTY SECTION SPARKLES
     --------------------------------------------------------- */
  const sparkleContainer = document.querySelector('.beauty-sparkles');
  if (sparkleContainer) {
    for (let i = 0; i < 24; i++) {
      const dot = document.createElement('div');
      dot.className = 'sparkle-dot';
      const size = 3 + Math.random() * 6;
      dot.style.width = size + 'px';
      dot.style.height = size + 'px';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.top = Math.random() * 100 + '%';
      dot.style.animationDelay = (Math.random() * 2.4) + 's';
      sparkleContainer.appendChild(dot);
    }
  }


  /* ---------------------------------------------------------
     SCROLL TO HERO BUTTON
     --------------------------------------------------------- */
  const beginBtn = document.getElementById('beginJourneyBtn');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      document.getElementById('countdown').scrollIntoView({ behavior: 'smooth' });
    });
  }


  /* ---------------------------------------------------------
     2) DOT NAVIGATION — active state on scroll
     --------------------------------------------------------- */
  const dots = document.querySelectorAll('.dot-nav .dot');
  const navSections = Array.from(dots).map(d => document.querySelector(d.getAttribute('href')));

  function updateActiveDot(){
    let currentIndex = 0;
    navSections.forEach((sec, i) => {
      if (sec && sec.getBoundingClientRect().top <= window.innerHeight * 0.4) {
        currentIndex = i;
      }
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }
  window.addEventListener('scroll', updateActiveDot, { passive: true });
  updateActiveDot();


  /* ---------------------------------------------------------
     3) SCROLL REVEAL ANIMATIONS (Intersection Observer)
     --------------------------------------------------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Gallery items get their own staggered observer
  const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), i * 60);
        galleryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.gallery-item').forEach(item => galleryObserver.observe(item));


  /* ---------------------------------------------------------
     4) COUNTDOWN TIMER — counts down to June 21 (this year,
     or next year if the date has already passed)
     --------------------------------------------------------- */
  function getTargetDate(){
    const now = new Date();
    let target = new Date(now.getFullYear(), 5, 21, 0, 0, 0); // June is month index 5
    if (target.getTime() < now.getTime()) {
      target = new Date(now.getFullYear() + 1, 5, 21, 0, 0, 0);
    }
    return target;
  }

  const targetDate = getTargetDate();
  const elDays = document.getElementById('t-days');
  const elHours = document.getElementById('t-hours');
  const elMinutes = document.getElementById('t-minutes');
  const elSeconds = document.getElementById('t-seconds');
  const itsOurDay = document.getElementById('itsOurDay');
  const timerGrid = document.querySelector('.timer-grid');

  function pad(n){ return n.toString().padStart(2, '0'); }

  function updateCountdown(){
    const now = new Date().getTime();
    const diff = targetDate.getTime() - now;

    if (diff <= 0) {
      if (timerGrid) timerGrid.style.display = 'none';
      if (itsOurDay) itsOurDay.classList.add('show');
      clearInterval(countdownInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (elDays) elDays.textContent = pad(days);
    if (elHours) elHours.textContent = pad(hours);
    if (elMinutes) elMinutes.textContent = pad(minutes);
    if (elSeconds) elSeconds.textContent = pad(seconds);
  }

  updateCountdown();
  const countdownInterval = setInterval(updateCountdown, 1000);


  /* ---------------------------------------------------------
     5) GALLERY LIGHTBOX
     --------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox(){
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });


  /* ---------------------------------------------------------
     6) TYPING EFFECT — MAIN MESSAGE
     --------------------------------------------------------- */
  const fullMessage =
`Happy Friendship Anniversary to My Ninipie!! ❤️🤗

This year our bond is turning into 4 years and the time and the memories we created were the bestttest ever, just like you 💖

No doubt many problems were there and even though I made many mistakes and hurt you, I am truly sorry for that 😔❤️

But the time with you is the bestttest. How we grew up together and how we spent time together means everything to me 🫂✨

From my best friend to my girlfriend and at the end my future wifeyyy 💍❤️

All those moments from confessing love to making this beautiful relationship were the happiest moments of my life 🥹💖

I hope this becomes our never-ending love story and our unbreakable bond forever, the strongest ever that even the highest enthalphy can't break it ♾️❤️`;

  const typingTextEl = document.getElementById('typingText');
  let hasTyped = false;

  function typeMessage(){
    if (hasTyped || !typingTextEl) return;
    hasTyped = true;

    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '\u00A0';

    function step(){
      if (i < fullMessage.length) {
        typingTextEl.textContent = fullMessage.slice(0, i + 1);
        typingTextEl.appendChild(cursor);
        i++;
        setTimeout(step, 18);
      } else {
        cursor.remove();
      }
    }
    step();
  }

  const messageSection = document.getElementById('message');
  if (messageSection) {
    const msgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          typeMessage();
          msgObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    msgObserver.observe(messageSection);
  }


  /* ---------------------------------------------------------
     7) FLIP CARDS — tap support for touch devices
     --------------------------------------------------------- */
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });
  });


  /* ---------------------------------------------------------
     8) LOVE METER — animate fill when in view
     --------------------------------------------------------- */
  const meterFill = document.getElementById('meterFill');
  const lovemeterSection = document.getElementById('lovemeter');
  if (meterFill && lovemeterSection) {
    const meterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          meterFill.style.width = '100%';
          meterObserver.disconnect();
        }
      });
    }, { threshold: 0.4 });
    meterObserver.observe(lovemeterSection);
  }


  /* ---------------------------------------------------------
     9) HIDDEN SURPRISE — double tap / double click heart
     A single guarded "trigger" function prevents this from firing
     twice when a touch device fires both our manual touchend
     double-tap detection AND a synthetic dblclick for the same
     interaction. A quick wiggle on the first tap gives feedback
     so people know to tap again.
     --------------------------------------------------------- */
  const secretHeart = document.getElementById('secretHeart');
  const surprisePopup = document.getElementById('surprisePopup');
  const surpriseClose = document.getElementById('surpriseClose');

  function openSurprise(){
    surprisePopup.classList.add('open');
    burstHearts();
    fireConfetti(80);
  }
  function closeSurprise(){
    surprisePopup.classList.remove('open');
  }

  if (secretHeart) {
    let lastTriggerTime = 0;
    function triggerSurprise(){
      const now = Date.now();
      if (now - lastTriggerTime < 600) return; // guard against double-firing
      lastTriggerTime = now;
      openSurprise();
    }

    secretHeart.addEventListener('dblclick', triggerSurprise);

    // Mobile double-tap detection with a forgiving window + first-tap feedback
    let lastTap = 0;
    secretHeart.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 600) {
        e.preventDefault();
        triggerSurprise();
        lastTap = 0; // reset so a third quick tap doesn't immediately re-trigger
      } else {
        // First tap: small wiggle to hint "tap again"
        secretHeart.classList.add('tapped-once');
        setTimeout(() => secretHeart.classList.remove('tapped-once'), 400);
        lastTap = now;
      }
    });
  }
  if (surpriseClose) surpriseClose.addEventListener('click', closeSurprise);
  if (surprisePopup) {
    surprisePopup.addEventListener('click', (e) => {
      if (e.target === surprisePopup) closeSurprise();
    });
  }


  /* ---------------------------------------------------------
     10) FINAL PROPOSAL — "Yes" button
     --------------------------------------------------------- */
  const yesButton = document.getElementById('yesButton');
  const finalPopup = document.getElementById('finalPopup');
  const finalClose = document.getElementById('finalClose');

  if (yesButton) {
    yesButton.addEventListener('click', () => {
      finalPopup.classList.add('open');
      burstHearts(true);
      fireConfetti(180);
    });
  }
  if (finalClose) {
    finalClose.addEventListener('click', () => finalPopup.classList.remove('open'));
  }
  if (finalPopup) {
    finalPopup.addEventListener('click', (e) => {
      if (e.target === finalPopup) finalPopup.classList.remove('open');
    });
  }


  /* ---------------------------------------------------------
     HEART EXPLOSION EFFECT (used by surprise + proposal)
     --------------------------------------------------------- */
  function burstHearts(big){
    const count = big ? 36 : 22;
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span');
      heart.textContent = ['❤️','💖','💕','💗'][Math.floor(Math.random() * 4)];
      heart.style.position = 'fixed';
      heart.style.left = '50vw';
      heart.style.top = '50vh';
      heart.style.fontSize = (16 + Math.random() * (big ? 26 : 18)) + 'px';
      heart.style.zIndex = 4500;
      heart.style.pointerEvents = 'none';
      heart.style.transition = 'transform 1.2s ease-out, opacity 1.2s ease-out';
      document.body.appendChild(heart);

      const angle = Math.random() * Math.PI * 2;
      const distance = 120 + Math.random() * 260;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      requestAnimationFrame(() => {
        heart.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*360}deg)`;
        heart.style.opacity = '0';
      });

      setTimeout(() => heart.remove(), 1300);
    }
  }


  /* ---------------------------------------------------------
     CONFETTI ANIMATION (canvas based)
     --------------------------------------------------------- */
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  let confettiPieces = [];
  let confettiAnimating = false;

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const confettiColors = ['#ff7eb6', '#ff4f9a', '#c9a8ff', '#a78bfa', '#fffaff', '#ffd6e8'];

  function fireConfetti(count){
    for (let i = 0; i < count; i++) {
      confettiPieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        size: 5 + Math.random() * 7,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        speedY: 2 + Math.random() * 3,
        speedX: (Math.random() - 0.5) * 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.5 ? 'circle' : 'rect'
      });
    }
    canvas.style.display = 'block';
    if (!confettiAnimating) {
      confettiAnimating = true;
      requestAnimationFrame(animateConfetti);
    }
  }

  function animateConfetti(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confettiPieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });

    confettiPieces = confettiPieces.filter(p => p.y < canvas.height + 40);

    if (confettiPieces.length > 0) {
      requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimating = false;
      canvas.style.display = 'none';
    }
  }

});
