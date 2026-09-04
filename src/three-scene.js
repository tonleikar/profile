import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export async function initScene({ canvas }) {

  const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 20 );
  camera.position.z = 2.5;

  const scene = new THREE.Scene();

  const topLight = new THREE.DirectionalLight(0xffffff); // (color, intensity)
  topLight.position.set(500, 500, 500) //top-left-ish
  topLight.castShadow = true;
  scene.add(topLight);

  const loader = new OBJLoader();
  const defaultMaterial = new THREE.MeshBasicMaterial({ color: 0x009944 })
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setClearColor(0x000000, 0);

  // load object and add material
  const sfgh = await loader.loadAsync( 'assets/sfgh.obj' );
  sfgh.traverse((child) => {
    if (child.isMesh) {
      child.material = defaultMaterial;
    }
  });

  scene.add(sfgh);

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', resize);
  resize();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate() {
    renderer.render(scene, camera);
    if (!prefersReducedMotion) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}
