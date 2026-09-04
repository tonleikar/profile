import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Tunables ──────────────────────────────────────────────────────────────────
// Colours mirror css/style.css :root — edit freely.
const COLOR = {
  letters: 0xb6bd67,      // greeny-yellow — the material
  key: 0xfff3e0,          // warm white key light
  fill: 0x7fa2be,         // light-blue fill light
  rim: 0x8abfb7,          // teal rim / edge light
  sky: 0x8abfb7,          // teal hemisphere sky
  ground: 0x1f1f1f        // darker-blue hemisphere ground
};

const FOV = 120;   // fairly long lens — keeps the wide word from fanning open into its side walls
const FILL_FRACTION = 0.82;   // fraction of the binding viewport axis the word spans at rest
const EDGE_MARGIN = 0.3;     // world units always kept between the letters and the screen edge

// Each letter's own gentle, always-on wiggle. Not affected by scrolling.
const IDLE = {
  posAmp: 0.12,     // drift, world units
  rotAmp: 0.45,     // tilt, radians
  speed: 0.55       // tempo — lower is slower
};

// Scrolling leans the whole word: each scroll adds to its tilt, and the tilt
// eases back to level whenever you stop — the decay is what gives it its "weight".
const SCROLL = {
  gain: 0.0006,     // radians of tilt added per pixel scrolled
  decay: 2.0,       // how fast the tilt returns to level (per second) — lower = more lag / inertia
  maxAngle: 5.0     // requested tilt limit, radians (also clamped to whatever keeps the word on screen)
};

export async function initScene({ canvas }) {
  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // ── Lights ──────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(COLOR.sky, COLOR.ground, 1.15));

  const key = new THREE.DirectionalLight(COLOR.key, 1.9);
  key.position.set(-0.6, 0.9, 1.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(COLOR.fill, 0.5);
  fill.position.set(1.0, 0.2, 0.8);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(COLOR.rim, 0.55);
  rim.position.set(0.0, 0.5, -1.2);
  scene.add(rim);

  // ── Model ───────────────────────────────────────────────────────────────────
  // flatShading: the .glb ships with no materials and unreliable normals — deriving
  // per-face normals in the shader gives clean, even facets that suit the low-poly text.
  // (Re-export from Blender with recalculated normals + smoothing to turn this off.)
  const material = new THREE.MeshStandardMaterial({
    color: COLOR.letters,
    roughness: 0.6,
    metalness: 0.0,
    flatShading: true
  });

  const word = new THREE.Group();
  scene.add(word);

  const gltf = await new GLTFLoader().loadAsync('assets/sfgh-mesh.glb');
  word.add(gltf.scene);
  word.updateMatrixWorld(true);

  // Bake every node transform into the geometry, then re-parent each letter straight
  // onto `word` — makes the rest of the maths independent of how the .glb is nested.
  const letters = [];
  gltf.scene.traverse((child) => {
    if (child.isMesh) letters.push(child);
  });

  letters.forEach((mesh) => {
    mesh.geometry.applyMatrix4(mesh.matrixWorld);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.material = material;
    word.add(mesh);
  });
  word.remove(gltf.scene);

  // Centre each letter's geometry on its own origin so it can wiggle about itself,
  // then move the mesh back to where the letter belongs.
  letters.forEach((mesh) => {
    mesh.geometry.computeBoundingBox();
    const c = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    mesh.geometry.translate(-c.x, -c.y, -c.z);
    mesh.position.copy(c);
  });

  // Centre the whole word on the origin so it spins about its own middle.
  const wordBox = new THREE.Box3().setFromObject(word);
  const wordCentre = wordBox.getCenter(new THREE.Vector3());
  const wordSize = wordBox.getSize(new THREE.Vector3());
  const wordHalf = wordSize.clone().multiplyScalar(0.5);
  letters.forEach((mesh) => mesh.position.sub(wordCentre));

  // Per-letter home state + how far its own wiggle-tilt can throw its far corner.
  const homes = letters.map((mesh) => {
    mesh.geometry.computeBoundingSphere();
    return {
      position: mesh.position.clone(),
      reach: mesh.geometry.boundingSphere.radius * IDLE.rotAmp
    };
  });

  // ── Camera fit + containment ───────────────────────────────────────────────
  // ampCap  = how far a letter may wiggle from home before it would cross the edge.
  // maxSpin = largest whole-word rotation that still keeps every letter on screen.
  const ampCap = new THREE.Vector2();
  let maxSpin = SCROLL.maxAngle;

  function layout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const vHalf = Math.tan((FOV * Math.PI) / 180 / 2);

    // distance so the word spans FILL_FRACTION of whichever axis is binding
    const needForHeight = wordHalf.y / FILL_FRACTION / vHalf;
    const needForWidth = wordHalf.x / FILL_FRACTION / (vHalf * aspect);
    const distance = Math.max(needForHeight, needForWidth);

    camera.aspect = aspect;
    camera.position.set(0, 0, distance + wordHalf.z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // visible half-extents on the plane through the front of the word
    const visHalfY = distance * vHalf;
    const visHalfX = visHalfY * aspect;

    // largest spin whose swung word still clears the top/bottom edge
    const roomY = visHalfY - EDGE_MARGIN;
    let safe = SCROLL.maxAngle;
    while (safe > 0.02 &&
           wordHalf.y * Math.cos(safe) + wordHalf.z * Math.sin(safe) > roomY) {
      safe -= 0.02;
    }
    maxSpin = safe;

    // room the spin already claims, so the per-letter wiggle stays inside what's left
    const reserveY = Math.sin(maxSpin) * (wordHalf.y + wordHalf.z)
                   + (1 - Math.cos(maxSpin)) * wordHalf.y;
    const growth = distance / Math.max(0.001, distance - Math.sin(maxSpin) * wordHalf.z);
    const reserveX = wordHalf.x * (growth - 1);

    ampCap.set(
      Math.max(0, visHalfX - wordHalf.x - EDGE_MARGIN - reserveX),
      Math.max(0, visHalfY - wordHalf.y - EDGE_MARGIN - reserveY)
    );

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', () => {
    layout();
    if (prefersReducedMotion) renderer.render(scene, camera);
  });
  layout();

  // ── Reduced motion: one static frame, no loop ───────────────────────────────
  if (prefersReducedMotion) {
    renderer.render(scene, camera);
    return;
  }

  // ── Scroll → whole-word tilt ───────────────────────────────────────────────
  let spin = 0;        // current whole-word rotation, radians
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    spin = THREE.MathUtils.clamp(spin + (y - lastScrollY) * SCROLL.gain, -maxSpin, maxSpin);
    lastScrollY = y;
  }, { passive: true });

  // ── Animation ──────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frame = 0;

  function update(dt) {
    elapsed += Math.min(dt, 0.1); // clamp so a resumed background tab can't jump the phase
    const t = elapsed * IDLE.speed;

    // per-letter wiggle — constant, gentle, each letter slightly out of phase
    letters.forEach((mesh, i) => {
      const home = homes[i];
      const capX = Math.max(0, ampCap.x - home.reach);
      const capY = Math.max(0, ampCap.y - home.reach);

      const ox = THREE.MathUtils.clamp(Math.sin(t * 0.35 + i * 1.9) * IDLE.posAmp * 0.7, -capX, capX);
      const oy = THREE.MathUtils.clamp(Math.sin(t * 0.50 + i * 0.7) * IDLE.posAmp, -capY, capY);

      mesh.position.set(home.position.x + ox, home.position.y + oy, home.position.z);
      mesh.rotation.set(
        Math.sin(t * 0.60 + i * 1.3) * IDLE.rotAmp,
        Math.sin(t * 0.40 + i * 2.1) * IDLE.rotAmp,
        Math.sin(t * 0.50 + i * 3.0) * IDLE.rotAmp * 0.5
      );
    });

    // whole-word tilt — eases back to level whenever scrolling stops
    spin *= Math.exp(-SCROLL.decay * dt);
    if (Math.abs(spin) < 1e-4) spin = 0;
    word.rotation.x = spin;
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    update(clock.getDelta());
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
    } else {
      clock.getDelta(); // discard the paused gap
      tick();
    }
  });

  tick();
}
