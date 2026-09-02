export function initScrollToTop({ button }) {
  const updateVisibility = () => {
    button.style.display = window.scrollY > 20 ? 'block' : 'none';
  };

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
}
