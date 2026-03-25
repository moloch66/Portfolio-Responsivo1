/* =========================================
   Isometric 3D Background — Three.js
   Full-page persistent scene behind all sections.
   Animation intensity: SOFT — slow, continuous drift.
   ========================================= */

const IsoScene = (() => {
  let renderer, scene, camera, animId;
  let mouseX = 0, mouseY = 0;
  let tiltX = 0, tiltY = 0;
  let scrollY = 0;
  let cubes = [];

  const isMobile = () => window.innerWidth < 768;

  // Blue–violet–purple palette
  const C = {
    cyan:   0x00c8ff,
    indigo: 0x4f46e5,
    violet: 0x7c3aed,
    purple: 0xa855f7,
  };
  const palette = [C.cyan, C.indigo, C.violet, C.purple, C.indigo, C.violet];

  // ---- Init --------------------------------------------------------
  function init(canvasEl) {
    if (isMobile()) return false;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        antialias: false,   // off for perf on background layer
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      const w = canvasEl.clientWidth  || window.innerWidth;
      const h = canvasEl.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();

      // Isometric orthographic camera
      const aspect = (canvasEl.clientWidth || window.innerWidth) / (canvasEl.clientHeight || window.innerHeight);
      const fs = 22; // frustum size
      camera = new THREE.OrthographicCamera(
        -fs * aspect / 2,  fs * aspect / 2,
         fs / 2,           -fs / 2,
         0.1, 300
      );
      // Classic isometric angle: 45° horizontal, ~35.26° vertical
      camera.position.set(18, 14, 18);
      camera.lookAt(0, 0, 0);

      buildScene();
      animate();
      return true;
    } catch (err) {
      console.warn('[IsoScene] init failed:', err.message);
      return false;
    }
  }

  // ---- Build scene -------------------------------------------------
  function buildScene() {
    // --- Floor grid ---
    const gridHalf = 14;
    const step = 2;
    const gridMat = new THREE.LineBasicMaterial({
      color: C.indigo,
      transparent: true,
      opacity: 0.12,
    });

    for (let i = -gridHalf; i <= gridHalf; i += step) {
      // lines along X
      addLine([-gridHalf, 0, i], [gridHalf, 0, i], gridMat);
      // lines along Z
      addLine([i, 0, -gridHalf], [i, 0, gridHalf], gridMat);
    }

    // --- Wireframe cubes ---
    const positions = [
      [-8, -8], [-8, -4], [-8,  0], [-8,  4], [-8,  8],
      [-4, -8], [-4,  4], [-4,  8],
      [ 0, -8], [ 0, -4], [ 0,  4], [ 0,  8],
      [ 4, -8], [ 4, -4], [ 4,  8],
      [ 8, -8], [ 8,  0], [ 8,  4], [ 8,  8],
      [-6,  2], [ 6, -2], [-2,  6], [ 2, -6],
      [-10, 2], [10, -2], [-2, 10], [ 2,-10],
    ];

    positions.forEach(([x, z], i) => {
      const h    = 0.4 + Math.random() * 2.2;
      const size = 0.3 + Math.random() * 0.6;
      const color = palette[i % palette.length];
      const opacity = 0.12 + Math.random() * 0.22;

      const geo   = new THREE.BoxGeometry(size, h, size);
      const edges = new THREE.EdgesGeometry(geo);
      const mat   = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const cube  = new THREE.LineSegments(edges, mat);

      cube.position.set(x, h / 2, z);
      cube.userData = {
        baseY:    h / 2,
        speed:    0.18 + Math.random() * 0.22,   // very slow
        phase:    Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003, // barely perceptible
        floatAmp: 0.05 + Math.random() * 0.08,   // tiny float range
      };

      scene.add(cube);
      cubes.push(cube);
    });

    // --- Vertical accent lines ---
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() - 0.5) * 26;
      const z = (Math.random() - 0.5) * 26;
      const h = 0.4 + Math.random() * 2.8;
      const color = palette[i % palette.length];
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06 + Math.random() * 0.1,
      });
      addLine([x, 0, z], [x, h, z], mat);
    }

    // --- Far-depth secondary grid (lower opacity) ---
    const farMat = new THREE.LineBasicMaterial({
      color: C.violet,
      transparent: true,
      opacity: 0.04,
    });
    for (let i = -gridHalf; i <= gridHalf; i += step * 2) {
      addLine([-gridHalf, 3, i], [gridHalf, 3, i], farMat);
      addLine([i, 3, -gridHalf], [i, 3,  gridHalf], farMat);
    }
  }

  function addLine([x1, y1, z1], [x2, y2, z2], mat) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ]);
    scene.add(new THREE.Line(geo, mat));
  }

  // ---- Animate -----------------------------------------------------
  function animate() {
    animId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;

    // Smooth tilt — lerp factor 0.02 = very lazy response
    tiltX += (mouseY * 0.04 - tiltX) * 0.02;
    tiltY += (mouseX * 0.04 - tiltY) * 0.02;

    // Slight parallax on scroll (camera drifts down a tiny bit)
    const scrollShift = scrollY * 0.0015;

    // Apply to scene root (cheaper than moving camera)
    scene.rotation.x = tiltX;
    scene.rotation.y = tiltY;
    scene.position.y = -scrollShift;

    // Float each cube
    cubes.forEach(cube => {
      const { baseY, speed, phase, rotSpeed, floatAmp } = cube.userData;
      cube.position.y = baseY + Math.sin(t * speed + phase) * floatAmp;
      cube.rotation.y += rotSpeed;
    });

    renderer.render(scene, camera);
  }

  // ---- Events ------------------------------------------------------
  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll(y) {
    scrollY = y;
  }

  function onResize() {
    const canvas = renderer?.domElement;
    if (!canvas || !renderer || !camera) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const fs = 22;
    camera.left   = -fs * aspect / 2;
    camera.right  =  fs * aspect / 2;
    camera.top    =  fs / 2;
    camera.bottom = -fs / 2;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    renderer?.dispose();
    cubes = [];
  }

  return { init, onMouseMove, onScroll, onResize, destroy };
})();

window.IsoScene = IsoScene;
