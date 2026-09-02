import { initMouseTail } from './mouse-tail.js';
import { initScrollToTop } from './scroll-to-top.js';
import { initScene } from './three-scene.js';

initScrollToTop({
  button: document.querySelector('#scrollBtn')
});

initMouseTail({
  container: document.querySelector('#mouseFollow')
});

try {
  await initScene({
    canvas: document.querySelector('#bg')
  });
  console.log('three.js loaded');
} catch (error) {
  console.error(error);
  console.log('three.js has not loaded correctly');
}
