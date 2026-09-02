export function initMouseTail({
  container,
  count = 100,
  size = 60,
  speed = 0.7
}) {
  const pointer = { x: 0, y: 0 };
  const circles = [];

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  for (let index = 0; index < count; index += 1) {
    const element = document.createElement('div');
    const scale = 1 - (index / count) * 0.7;

    element.className = 'circle-tail';
    element.style.width = `${size * scale}px`;
    element.style.height = `${size * scale}px`;
    element.style.opacity = 1 - (index / count) * 0.6;
    container.append(element);

    circles.push({
      element,
      x: 0,
      y: 0,
      speed: speed * Math.pow(0.99, index)
    });
  }

  function animate() {
    circles.forEach((circle, index) => {
      const target = index === 0 ? pointer : circles[index - 1];

      circle.x += (target.x - circle.x) * circle.speed;
      circle.y += (target.y - circle.y) * circle.speed;
      circle.element.style.transform =
        `translate3d(${circle.x}px, ${circle.y}px, 0)`;
    });

    requestAnimationFrame(animate);
  }

  animate();
}
