/* =========================================
   GLB Hero Scene — Three.js ES Module
   Loads hero3d.glb, plays its built-in animation,
   and adds gentle mouse-driven tilt.
   Self-initialising — no call from main.js needed.
   ========================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.min.js';
import { GLTFLoader }    from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader }   from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/DRACOLoader.js';

const GLBScene = (() => {
  let renderer, scene, camera, animId, mixer;
  let model     = null;
  let isReady   = false;
  let mouseX    = 0, mouseY = 0;
  let tiltX     = 0, tiltY  = 0;
  let lastTime  = 0;

  const lerp    = (a, b, t) => a + (b - a) * t;
  const isMobile = () => window.innerWidth < 768;

  // ---- Init ----
  function init(canvasEl) {
    if (isMobile()) { showFallback(); return false; }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      resize(canvasEl);
      renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.outputColorSpace    = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled   = false;

      scene  = new THREE.Scene();

      const w = canvasEl.clientWidth  || window.innerWidth * 0.5;
      const h = canvasEl.clientHeight || window.innerHeight;
      camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      camera.position.set(0, 0.2, 5);
      camera.lookAt(0, 0, 0);

      buildLighting();
      loadModel();

      return true;
    } catch (err) {
      console.warn('[GLBScene] init failed:', err);
      showFallback();
      return false;
    }
  }

  // ---- Lighting — deep-purple atmosphere ----
  function buildLighting() {
    // Very dim ambient so shadows stay dramatic
    scene.add(new THREE.AmbientLight(0x0d0020, 1.5));

    // Key — purple from upper-left
    const key = new THREE.DirectionalLight(0x7c3aed, 6.0);
    key.position.set(-3, 5, 3);
    scene.add(key);

    // Rim — cool indigo from the right
    const rim = new THREE.DirectionalLight(0x4f46e5, 3.5);
    rim.position.set(5, 1, -3);
    scene.add(rim);

    // Fill — soft magenta from below
    const fill = new THREE.DirectionalLight(0xa855f7, 2.0);
    fill.position.set(0, -4, 4);
    scene.add(fill);

    // Deep purple glow point near the model
    const glow = new THREE.PointLight(0x5b21b6, 5, 14);
    glow.position.set(0, 1, 3);
    scene.add(glow);

    // Subtle cyan accent from top-right
    const accent = new THREE.PointLight(0x00c8ff, 1.5, 10);
    accent.position.set(4, 4, 2);
    scene.add(accent);
  }

  // ---- Load GLB ----
  function loadModel() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/libs/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      'assets/models/hero3d.glb',
      (gltf) => {
        model = gltf.scene;

        // Centre + scale to fit
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 3.2 / maxDim;

        model.position.sub(center.multiplyScalar(scale));
        model.scale.setScalar(scale);

        // Boost metalness / reflectivity to match the purple lighting
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            mat.envMapIntensity = 0;
            if (mat.metalness !== undefined) mat.metalness = Math.max(mat.metalness, 0.6);
            if (mat.roughness !== undefined) mat.roughness = Math.min(mat.roughness, 0.35);
          }
        });

        scene.add(model);

        // Play built-in animations (if any)
        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(clip => mixer.clipAction(clip).play());
        }

        isReady = true;
        animate();
      },
      undefined,
      (err) => {
        console.warn('[GLBScene] load error:', err);
        showFallback();
      }
    );
  }

  // ---- Render loop ----
  function animate(time = 0) {
    animId = requestAnimationFrame(animate);
    const delta = Math.min((time - lastTime) * 0.001, 0.05);
    lastTime = time;

    if (mixer) mixer.update(delta);

    // Smooth mouse tilt
    tiltX += (mouseY * 0.12 - tiltX) * 0.04;
    tiltY += (mouseX * 0.18 - tiltY) * 0.04;

    if (model) {
      // Slow auto-rotate + mouse influence
      model.rotation.y  = performance.now() * 0.00025 + tiltY * 0.6;
      model.rotation.x  = tiltX * 0.25;
    }

    renderer.render(scene, camera);
  }

  // ---- Events ----
  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function resize(canvasEl) {
    const c = canvasEl || renderer?.domElement;
    if (!c || !renderer) return;
    const w = c.clientWidth  || 1;
    const h = c.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function onResize() { resize(); }

  function showFallback() {
    document.querySelector('.hero__blob-fallback')?.classList.add('visible');
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    renderer?.dispose();
  }

  return { init, onMouseMove, onResize, destroy, get isReady() { return isReady; } };
})();

window.GLBScene = GLBScene;

// ---- Self-initialise after DOM is ready ----
function boot() {
  requestAnimationFrame(() => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    GLBScene.init(canvas);
  });

  document.addEventListener('mousemove', (e) => {
    if (window.innerWidth >= 768) GLBScene.onMouseMove(e);
  });

  window.addEventListener('resize', () => GLBScene.onResize(), { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
