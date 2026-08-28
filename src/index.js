import { initThreeScene } from './three-scene.js';

const mybutton = document.getElementById("scrollBtn");
const mouseFollow = document.getElementById("mouseFollow");
const numCircles = 100;
const circles = [];
const speed = 0.7;
const circleSize = 60;
let mouseX = 0, mouseY = 0;
let elementX = 0, elementY = 0;

// scroll up to top button
window.onscroll = function() {scrollFunction()};
function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
};

function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
};

// mouse tail effect
window.addEventListener("mousemove", (e) => {
  mouseY = e.clientY
  mouseX = e.clientX
});

//create circles

for (let i = 0; i < numCircles; i++) {
  const el = document.createElement("div");
  el.classList.add("circle-tail");

  // Calculate decreasing size and opacity for each trailing circle
  const scale = 1 - (i / numCircles) * 0.7;
  const opacity = 1 - (i / numCircles) * 0.6;

  // Basic styling for individual sizes
  el.style.width = `${circleSize * scale}px`;
  el.style.height = `${circleSize * scale}px`;
  el.style.opacity = opacity;

  mouseFollow.appendChild(el);

  // Store circle reference alongside its current coordinates and individual speed lag
  circles.push({
    element: el,
    x: mouseX,
    y: mouseY,
    // Each subsequent circle gets progressively lower speed multiplier to increase lag
    speed: speed * Math.pow(0.99, i)
  });
}

// animate circles
function animate() {
  circles.forEach((circle, index) => {
    // Lead target: Mouse position for circle #0, previous circle for all others
    const targetX = index === 0 ? mouseX : circles[index - 1].x;
    const targetY = index === 0 ? mouseY : circles[index - 1].y;

    // Linear interpolation (lerp) toward target
    circle.x += (targetX - circle.x) * circle.speed;
    circle.y += (targetY - circle.y) * circle.speed;

    // Apply translation with hardware acceleration
    circle.element.style.transform = `translate3d(${circle.x}px, ${circle.y}px, 0)`;
  });

  requestAnimationFrame(animate);
}

animate();
initThreeScene();
