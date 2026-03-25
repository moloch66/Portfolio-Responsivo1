/* =========================================
   Global Falling Particles
   Direction: top → bottom only (mouse-independent)
   Colors: purple & blue spectrum
   ========================================= */

const Particles = (() => {
  let canvas, ctx, particles = [], animId;

  const COLORS = ['#00c8ff', '#4f46e5', '#7c3aed', '#a855f7', '#c084fc'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile  = () => window.innerWidth < 768;

  function targetCount() {
    if (reduced) return 30;
    return mobile() ? 80 : 180;
  }

  function spawn(startSpread) {
    return {
      x:       Math.random() * (canvas?.width  || window.innerWidth),
      y:       startSpread ? Math.random() * (canvas?.height || window.innerHeight) : -6,
      r:       0.8 + Math.random() * 2,
      speed:   reduced ? 0.1 : 0.3 + Math.random() * 0.9,
      drift:   (Math.random() - 0.5) * 0.18,
      opacity: 0.15 + Math.random() * 0.38,
      color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  function init() {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    particles = Array.from({ length: targetCount() }, () => spawn(true));

    window.addEventListener('resize', onResize);
    loop();
  }

  function onResize() {
    resize();
    // adjust or reset particles to new canvas size
    particles.forEach(p => {
      if (p.x > canvas.width) p.x = Math.random() * canvas.width;
    });
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function loop() {
    animId = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const n = targetCount();
    // grow/shrink particle array as viewport changes
    while (particles.length < n) particles.push(spawn(false));
    if (particles.length > n) particles.length = n;

    particles.forEach(p => {
      // move
      p.y += p.speed;
      p.x += p.drift;

      // reset at bottom
      if (p.y > canvas.height + 6) {
        p.y = -6;
        p.x = Math.random() * canvas.width;
      }
      // clamp horizontal drift
      if (p.x < -6 || p.x > canvas.width + 6) {
        p.x = Math.random() * canvas.width;
      }

      // draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', onResize);
  }

  return { init, destroy };
})();

window.Particles = Particles;
