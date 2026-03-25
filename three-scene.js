/* =========================================
   Three.js — Magic Cube Hero Scene
   125 sub-cubes (5×5×5) que se desmontam
   progressivamente conforme o scroll avança.
   Externo → Interno: camadas de fora para dentro.
   ========================================= */

const ThreeScene = (() => {
  let renderer, scene, camera, animId;
  let cubeGroup;
  let isReady = false;
  let mouseX = 0, mouseY = 0;
  let tiltX = 0, tiltY = 0;
  let scrollProgress = 0;

  const subcubes = []; // { mesh, mat, edgeMat, initPos, escapeDir, escapeDistance, threshold, spinX, spinY, spinZ }

  // Cubo 5×5×5 = 125 peças
  const N    = 5;
  const STEP = 0.50;  // distância entre centros dos sub-cubos
  const CUBE = 0.408; // aresta renderizada (STEP * 0.816)

  const isMobile  = () => window.innerWidth < 768;
  const lerp      = (a, b, t) => a + (b - a) * t;
  const clamp01   = v => Math.max(0, Math.min(1, v));
  const easeOut3  = t => 1 - Math.pow(1 - t, 3);

  // ---- Init ----
  function init(canvasEl) {
    if (isMobile()) { showFallback(); return false; }

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const w = canvasEl.clientWidth  || window.innerWidth;
      const h = canvasEl.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      scene = new THREE.Scene();

      const aspect = w / h;
      // Desktop: cube sits on the right half — camera offset left so cube
      // appears roughly centred in the right 50 % of the viewport.
      const camX = aspect > 1.2 ? -1.8 : 0;
      camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 80);
      camera.position.set(camX, 1.0, 7.8);
      camera.lookAt(camX * 0.3, 0, 0);

      buildScene();
      isReady = true;
      animate();
      return true;
    } catch (err) {
      console.warn('[ThreeScene] init failed:', err.message);
      showFallback();
      return false;
    }
  }

  // ---- Build scene ----
  function buildScene() {
    // Iluminação
    scene.add(new THREE.AmbientLight(0x08091a, 2.8));

    const key = new THREE.DirectionalLight(0x4f46e5, 5.0);
    key.position.set(-4, 6, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x00c8ff, 3.0);
    rim.position.set(6, 1, -3);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xa855f7, 2.0);
    fill.position.set(0, -5, 5);
    scene.add(fill);

    const glow = new THREE.PointLight(0x4f46e5, 1.5, 18);
    glow.position.set(0, 0, 5);
    scene.add(glow);

    // Grupo pai — todas as peças são filhas deste grupo
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const offset  = (N - 1) / 2 * STEP;         // 1.0
    const maxDist = Math.sqrt(3) * offset;        // ≈ 1.732 (canto diagonal)

    // Paleta de accent por posição (chequerboard 3D)
    const PALETTE = [0x00c8ff, 0x4f46e5, 0xa855f7, 0x7c3aed, 0x00f5ff];

    for (let ix = 0; ix < N; ix++) {
      for (let iy = 0; iy < N; iy++) {
        for (let iz = 0; iz < N; iz++) {
          const x = ix * STEP - offset;
          const y = iy * STEP - offset;
          const z = iz * STEP - offset;

          const dist     = Math.sqrt(x * x + y * y + z * z);
          const normDist = Math.min(dist / maxDist, 1); // 0=centro, 1=canto

          // Cor base: centro mais escuro, bordas com leve tint azul
          const baseColor = new THREE.Color(0x050a18).lerp(
            new THREE.Color(0x0c1035), normDist
          );

          const accentHex = PALETTE[(ix + iy * 2 + iz * 3) % PALETTE.length];

          const geo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
          const mat = new THREE.MeshStandardMaterial({
            color: baseColor,
            emissive: new THREE.Color(accentHex),
            emissiveIntensity: 0.07 + normDist * 0.20,
            roughness: 0.22,
            metalness: 0.80,
            transparent: true,
            opacity: 1,
          });

          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x, y, z);

          // Wireframe luminoso nas arestas
          const edges = new THREE.EdgesGeometry(geo);
          const edgeMat = new THREE.LineBasicMaterial({
            color: accentHex,
            transparent: true,
            opacity: 0.28 + normDist * 0.30,
          });
          mesh.add(new THREE.LineSegments(edges, edgeMat));

          cubeGroup.add(mesh);

          // Direção de escape: para fora do centro com leve aleatoriedade
          const dir = new THREE.Vector3(x, y, z);
          if (dir.length() < 0.001) {
            // Peça do centro exato: direção aleatória
            dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          }
          dir.normalize();
          dir.x += (Math.random() - 0.5) * 0.25;
          dir.y += (Math.random() - 0.5) * 0.25;
          dir.z += (Math.random() - 0.5) * 0.25;
          dir.normalize();

          // Threshold: 0–50 % scroll = cubo intacto.
          // A 50 % os cubos externos começam a separar;
          // a 100 % tudo está completamente desmontado.
          //   normDist = 1 (canto) → threshold = 0.50
          //   normDist = 0 (centro) → threshold = 0.75
          const baseThreshold = 0.50 + (1 - normDist) * 0.25;
          const jitter        = (Math.random() - 0.5) * 0.06;

          subcubes.push({
            mesh,
            mat,
            edgeMat,
            initPos:        new THREE.Vector3(x, y, z),
            escapeDir:      dir,
            escapeDistance: 5.5 + normDist * 3.5 + Math.random() * 2.5,
            threshold:      clamp01(baseThreshold + jitter),
            spinX: (Math.random() - 0.5) * Math.PI * 2.5,
            spinY: (Math.random() - 0.5) * Math.PI * 2.5,
            spinZ: (Math.random() - 0.5) * Math.PI * 1.8,
          });
        }
      }
    }
  }

  // ---- Loop de animação ----
  function animate() {
    animId = requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    // Mouse tilt suave (lazy)
    tiltX += (mouseY * 0.05 - tiltX) * 0.035;
    tiltY += (mouseX * 0.06 - tiltY) * 0.035;

    // Rotação base do grupo completo (repouso)
    cubeGroup.rotation.y = time * 0.13 + tiltY * 0.55;
    cubeGroup.rotation.x = Math.sin(time * 0.08) * 0.09 + tiltX * 0.42;

    // Atualiza cada sub-cubo conforme scrollProgress
    subcubes.forEach(sub => {
      const { mesh, mat, edgeMat, initPos, escapeDir, escapeDistance, threshold, spinX, spinY, spinZ } = sub;

      // Progresso local deste cubo (0 = intacto, 1 = completamente escapado)
      const rawP = clamp01((scrollProgress - threshold) / Math.max(0.001, 1 - threshold));
      const p    = easeOut3(rawP);

      // Posição: voa para fora a partir da posição inicial
      mesh.position.set(
        initPos.x + escapeDir.x * escapeDistance * p,
        initPos.y + escapeDir.y * escapeDistance * p,
        initPos.z + escapeDir.z * escapeDistance * p,
      );

      // Rotação individual enquanto escapa
      mesh.rotation.x = spinX * p;
      mesh.rotation.y = spinY * p;
      mesh.rotation.z = spinZ * p;

      // Fade out progressivo
      mat.opacity     = 1 - p * 0.88;
      edgeMat.opacity = (0.28 + (1 - p) * 0.30) * (1 - p * 0.72);
    });

    // Câmera: recua levemente enquanto o cubo se desmonta
    // Mantém o offset X (cubo na direita) enquanto recua em Z/Y
    const baseX   = camera.aspect > 1.2 ? -1.8 : 0;
    const targetZ = 7.8 + scrollProgress * 3.2;
    const targetY = 1.0 - scrollProgress * 0.7;
    camera.position.x = lerp(camera.position.x, baseX, 0.055);
    camera.position.z = lerp(camera.position.z, targetZ, 0.055);
    camera.position.y = lerp(camera.position.y, targetY, 0.055);
    camera.lookAt(baseX * 0.3, 0, 0);

    // Fade do canvas no final do scroll (88–100%)
    const fadeP = clamp01((scrollProgress - 0.88) / 0.12);
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.style.opacity = 1 - fadeP;
    }

    renderer.render(scene, camera);
  }

  // ---- Eventos ----
  function onMouseMove(e) {
    if (!isReady) return;
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll(progress) {
    scrollProgress = clamp01(progress);
  }

  function onResize() {
    const c = renderer?.domElement;
    if (!c || !renderer || !camera) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Recalculate horizontal offset so cube stays on the right half
    const camX = camera.aspect > 1.2 ? -1.8 : 0;
    camera.position.x = camX;
    camera.lookAt(camX * 0.3, 0, 0);
  }

  function showFallback() {
    document.querySelector('.hero__blob-fallback')?.classList.add('visible');
    const wrap = document.querySelector('.hero__canvas-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    renderer?.dispose();
    subcubes.length = 0;
  }

  return { init, onMouseMove, onScroll, onResize, destroy, get isReady() { return isReady; } };
})();

window.ThreeScene = ThreeScene;
