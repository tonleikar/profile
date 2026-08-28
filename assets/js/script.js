const mybutton = document.getElementById("scrollBtn");
const mouseFollow = document.getElementById("mouseFollow");

let mouseX = 0, mouseY = 0;
let elementX = 0, elementY = 0;
const speed = 0.1;

window.onscroll = function() {scrollFunction()};

document.addEventListener("mousemove", (e) => {
  mouseY = e.clientY - mouseFollow.offsetWidth / 2
  mouseX = e.clientX - mouseFollow.offsetWidth / 2
});

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

function animate() {
  elementX += (mouseX - elementX) * speed;
  elementY += (mouseY - elementY) * speed;

  mouseFollow.style.left = elementX + "px";
  mouseFollow.style.top = elementY + "px";

  requestAnimationFrame(animate);
}

animate();
