import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


export function initScene() {

  //create scene
  const loader = new GLTFLoader();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("bg")
  });


  // load in gltf mesh
  loader.load( 'assets/sfgh-mesh.glb', function ( gltf ){
    scene.add(gltf.scene);
  }, undefined, function (error){
    console.log('loader error: ' + error)
  });


  // set renderer properties
  renderer.setPixelRatio( window.devicePixelRatio);
  renderer.setSize (window.innerWidth, window.innerHeight);

  camera.position.setZ(30);

  renderer.render( scene, camera );
}
