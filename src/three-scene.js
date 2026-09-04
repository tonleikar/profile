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

const FOV = 30;   // fairly long lens — keeps the wide word from fanning open into its side walls
const FILL_FRACTION = 0.72;   // fraction of the binding viewport axis the word spans at rest
const EDGE_MARGIN = 0.14;     // world units always kept between the letters and the screen edge

const IDLE = {
  posAmp: 0.03,               // drift, world units
  rotAmp: 0.07,               // tilt, radians
  speed: 1.0
};

const SCROLL = {
  input: 0.0016,             // energy added per pixel scrolled
  max: 1.6,                  // energy ceiling
  decay: 0.92,               // per-frame energy falloff
  gain: 1.8,                 // idle-amplitude multiplier at full energy
  pitchGain: 6.0,            // whole-word pitch response to scroll
  pitchMax: 0.10,            // hard cap on that pitch, radians
  pitchDecay: 0.9
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

  // Centre each letter's geometry on its own origin so it can rotate about itself,
  // then move the mesh back to where the letter belongs.
  letters.forEach((mesh) => {
    mesh.geometry.computeBoundingBox();
    const c = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    mesh.geometry.translate(-c.x, -c.y, -c.z);
    mesh.position.copy(c);
  });

  // Centre the whole word on the origin.
  const wordBox = new THREE.Box3().setFromObject(word);
  const wordCentre = wordBox.getCenter(new THREE.Vector3());
  const wordSize = wordBox.getSize(new THREE.Vector3());
  const wordHalf = wordSize.clone().multiplyScalar(0.5);
  letters.forEach((mesh) => mesh.position.sub(wordCentre));

  // Per-letter home state + reach (for the containment maths).
  const homes = letters.map((mesh) => {
    mesh.geometry.computeBoundingSphere();
    return {
      position: mesh.position.clone(),
      radius: mesh.geometry.boundingSphere.radius
    };
  });

  // ── Camera fit + containment box ────────────────────────────────────────────
  // ampCap = how far a letter may travel from home on each axis before it would
  // cross the screen edge. Recomputed on resize.
  const ampCap = new THREE.Vector2();

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

    // reserve room for the whole-word pitch swing on the Y axis
    const pitchReserveY = Math.sin(SCROLL.pitchMax) * (wordHalf.y + wordHalf.z);

    ampCap.set(
      Math.max(0, visHalfX - wordHalf.x - EDGE_MARGIN),
      Math.max(0, visHalfY - wordHalf.y - EDGE_MARGIN - pitchReserveY)
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

  // ── Scroll energy ──────────────────────────────────────────────────────────
  let scrollEnergy = 0;
  let pitch = 0;
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;
    scrollEnergy = Math.min(scrollEnergy + Math.abs(delta) * SCROLL.input, SCROLL.max);
    pitch = THREE.MathUtils.clamp(
      pitch + delta * SCROLL.input * SCROLL.pitchGain,
      -SCROLL.pitchMax,
      SCROLL.pitchMax
    );
  }, { passive: true });

  // ── Animation ──────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frame = 0;

  function update(dt) {
    elapsed += Math.min(dt, 0.1); // clamp so a resumed background tab can't jump the phase
    const t = elapsed * IDLE.speed;
    const boost = 1 + scrollEnergy * SCROLL.gain;

    letters.forEach((mesh, i) => {
      const home = homes[i];

      const rx = Math.sin(t * 0.60 + i * 1.3) * IDLE.rotAmp * boost;
      const ry = Math.sin(t * 0.40 + i * 2.1) * IDLE.rotAmp * boost;
      const rz = Math.sin(t * 0.50 + i * 3.0) * IDLE.rotAmp * 0.5 * boost;

      // rotation swings a letter's far corner too — spend it from the same budget
      const rotReach = home.radius * Math.max(Math.abs(rx), Math.abs(ry), Math.abs(rz));
      const capX = Math.max(0, ampCap.x - rotReach);
      const capY = Math.max(0, ampCap.y - rotReach);

      const ox = THREE.MathUtils.clamp(
        Math.sin(t * 0.35 + i * 1.9) * IDLE.posAmp * 0.7 * boost, -capX, capX
      );
      const oy = THREE.MathUtils.clamp(
        Math.sin(t * 0.50 + i * 0.7) * IDLE.posAmp * boost, -capY, capY
      );

      mesh.position.set(home.position.x + ox, home.position.y + oy, home.position.z);
      mesh.rotation.set(rx, ry, rz);
    });

    word.rotation.x = pitch;

    scrollEnergy *= SCROLL.decay;
    if (scrollEnergy < 5e-4) scrollEnergy = 0;
    pitch *= SCROLL.pitchDecay;
    if (Math.abs(pitch) < 2e-4) pitch = 0;
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
