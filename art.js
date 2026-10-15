const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const hero = document.querySelector('.hero');
const gallery = document.querySelector('.work-section');
const galleryStage = document.querySelector('.work-stage');
const track = document.querySelector('#work-track');
const studio = document.querySelector('.studio-section');
const contact = document.querySelector('.contact-section');
const clamp = value => Math.min(1, Math.max(0, value));
let frame = 0, travel = 0, galleryProgress = 0, targetProgress = 0;
const prints = [...document.querySelectorAll('.work-print')];
const observed = new Set();
const printObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('print-shown');
    printObserver.unobserve(entry.target);
  }
}, {threshold:.12}) : null;
function measure() {
  if (track && galleryStage) travel = Math.max(0, track.scrollWidth + innerWidth * .14 - innerWidth + 80);
  const animatePrints = innerWidth <= 640 && !reduced.matches && printObserver;
  for (const print of prints) {
    if (animatePrints && !observed.has(print)) {
      print.classList.add('reveal-print'); observed.add(print); printObserver.observe(print);
    } else if (!animatePrints) {
      print.classList.remove('reveal-print'); printObserver?.unobserve(print); observed.delete(print);
    }
  }
  schedule();
}
function schedule() { if (!frame) frame = requestAnimationFrame(render); }
function render() {
  frame = 0;
  const height = innerHeight;
  if (hero) {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0) hero.style.setProperty('--hero', (reduced.matches ? 0 : clamp(-rect.top / Math.max(1, hero.offsetHeight - height))).toFixed(4));
  }
  if (gallery && track && galleryStage) {
    const rect = gallery.getBoundingClientRect();
    if (innerWidth > 640 && !reduced.matches) {
      targetProgress = clamp(-rect.top / Math.max(1, gallery.offsetHeight - galleryStage.offsetHeight));
      const delta = targetProgress - galleryProgress;
      galleryProgress = Math.abs(delta) < .0002 ? targetProgress : galleryProgress + delta * .18;
      gallery.style.setProperty('--work', galleryProgress.toFixed(5));
      gallery.style.setProperty('--track-x', (-galleryProgress * travel).toFixed(2) + 'px');
      if (Math.abs(targetProgress - galleryProgress) > .0002) schedule();
    } else {
      galleryProgress = targetProgress = 0;
      gallery.style.setProperty('--track-x', '0px');
    }
  }
  if (studio) {
    const rect = studio.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < height) studio.style.setProperty('--studio', reduced.matches ? '1' : clamp((height - rect.top) / (height + rect.height)).toFixed(4));
  }
  if (contact) {
    const rect = contact.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < height) contact.style.setProperty('--contact', reduced.matches ? '1' : clamp((height - rect.top) / height).toFixed(4));
  }
}
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', measure);
addEventListener('load', measure, {once:true});
reduced.addEventListener('change', measure);
document.fonts.ready.then(measure);
hero?.addEventListener('pointermove', event => {
  if (reduced.matches || !fine.matches) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--px', ((event.clientX - rect.left) / rect.width - .5).toFixed(3));
  hero.style.setProperty('--py', (event.clientY / innerHeight - .5).toFixed(3));
});
hero?.addEventListener('pointerleave', () => {hero.style.setProperty('--px', '0'); hero.style.setProperty('--py', '0');});
// Keyboard focus also reveals prints that are outside the current film interval.
track?.addEventListener('focusin', event => {
  if (innerWidth <= 640 || reduced.matches) return;
  const print = event.target.closest('.work-print');
  if (!print || event.target !== print || !print.matches(':focus-visible')) return;
  const progress = clamp((print.offsetLeft - 40) / Math.max(1, travel));
  galleryProgress = targetProgress = progress;
  gallery.style.setProperty('--track-x', (-progress * travel).toFixed(2) + 'px');
  const y = gallery.getBoundingClientRect().top + scrollY + progress * (gallery.offsetHeight - galleryStage.offsetHeight);
  scrollTo({top:y, behavior:'instant'});
  schedule();
});
measure();
