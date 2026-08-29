import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


export async function initScene() {

  const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 20 );
  camera.position.z = 2.5;

  const scene = new THREE.Scene();

  const light = new THREE.AmbientLight(0xFFFFFF);
  scene.add(light);

  const loader = new OBJLoader();
  const defaultMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#bg")
  });
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(3, 6, 2),
    defaultMaterial
  );

  // load object and add material
  const sfgh = await loader.loadAsync( 'assets/sfgh.obj' );
  sfgh.traverse((child) => {
    if (child.isMesh) {
      child.material = defaultMaterial;
    }
  });

  // add objects to scene
  scene.add(sfgh);

  // add light

  //set render properties
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Render continuously every frame
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}
