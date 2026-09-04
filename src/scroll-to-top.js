export function initScrollToTop({ button }) {
  const updateVisibility = () => {
    button.style.display = window.scrollY > 20 ? 'block' : 'none';
  };

  button.addEventListener('click', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
}
