import { createOptimizedPicture } from '../../scripts/aem.js';

const LABELS = {
  region: 'Carousel',
  controls: 'Carousel Slide Controls',
  showSlide: 'Show Slide',
  of: 'of',
  previous: 'Previous Slide',
  next: 'Next Slide',
};

// No option classes yet; any extra classes authors add are left untouched.
let carouselId = 0;

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;

  block.querySelectorAll('.carousel-hero-slide').forEach((slide, idx) => {
    const isActive = idx === slideIndex;
    slide.setAttribute('aria-hidden', !isActive);
    slide.querySelectorAll('a').forEach((link) => {
      if (isActive) link.removeAttribute('tabindex');
      else link.setAttribute('tabindex', '-1');
    });
  });

  block.querySelectorAll('.carousel-hero-indicator button').forEach((button, idx) => {
    if (idx === slideIndex) {
      button.setAttribute('disabled', '');
      button.setAttribute('aria-current', 'true');
    } else {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    }
  });
}

function showSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-hero-slide');
  if (!slides.length) return;
  let index = slideIndex;
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;
  const track = block.querySelector('.carousel-hero-slides');
  track.scrollTo({ top: 0, left: slides[index].offsetLeft, behavior: 'smooth' });
  updateActiveSlide(block, index);
}

function bindEvents(block) {
  block.querySelectorAll('.carousel-hero-indicator').forEach((indicator) => {
    indicator.querySelector('button').addEventListener('click', () => {
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });

  const current = () => parseInt(block.dataset.activeSlide || '0', 10);
  block.querySelector('.carousel-hero-prev').addEventListener('click', () => showSlide(block, current() - 1));
  block.querySelector('.carousel-hero-next').addEventListener('click', () => showSlide(block, current() + 1));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-hero-slide').forEach((slide) => observer.observe(slide));
}

function createSlide(row, slideIndex, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-hero-slide';
  slide.dataset.slideIndex = slideIndex;
  slide.id = `carousel-hero-${id}-slide-${slideIndex}`;

  const cells = [...row.children];
  // Find the image cell wherever the author put it; fall back to the first cell.
  const imageCell = cells.find((cell) => cell.querySelector('picture, img')) || cells[0];
  if (imageCell) {
    imageCell.className = 'carousel-hero-slide-image';
    slide.append(imageCell);
  }

  // Any remaining cell with real content becomes an optional caption; empty cells are dropped.
  cells.filter((cell) => cell !== imageCell).forEach((cell) => {
    if (cell.textContent.trim() || cell.querySelector('picture, img')) {
      cell.className = 'carousel-hero-slide-content';
      slide.append(cell);
    }
  });

  slide.querySelectorAll('picture > img').forEach((img) => {
    const eager = slideIndex === 0;
    const picture = createOptimizedPicture(img.src, img.alt, eager, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    img.closest('picture').replaceWith(picture);
  });

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);

  return slide;
}

export default function decorate(block) {
  carouselId += 1;
  const id = carouselId;

  // Ignore fully empty rows authors may leave behind.
  const rows = [...block.children].filter((row) => row.textContent.trim() || row.querySelector('picture, img'));
  if (!rows.length) {
    block.replaceChildren();
    return;
  }

  const isSingleSlide = rows.length < 2;

  block.id = `carousel-hero-${id}`;

  const viewport = document.createElement('div');
  viewport.className = 'carousel-hero-slides-container';
  const track = document.createElement('ul');
  track.className = 'carousel-hero-slides';
  viewport.append(track);

  const slides = rows.map((row, idx) => createSlide(row, idx, id));
  track.append(...slides);

  block.replaceChildren(viewport);

  // 7 of 16 adventure pages author a single slide: render a static hero image, without
  // controls or carousel semantics (a "carousel" region with nothing to rotate misleads AT).
  if (isSingleSlide) {
    block.classList.add('carousel-hero-single');
    return;
  }

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', LABELS.region);

  const controls = document.createElement('div');
  controls.className = 'carousel-hero-controls';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', LABELS.controls);
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-hero-indicators';
  slides.forEach((slide, idx) => {
    const li = document.createElement('li');
    li.className = 'carousel-hero-indicator';
    li.dataset.targetSlide = idx;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-controls', slide.id);
    button.setAttribute('aria-label', `${LABELS.showSlide} ${idx + 1} ${LABELS.of} ${slides.length}`);
    li.append(button);
    indicators.append(li);
  });
  nav.append(indicators);

  const arrows = document.createElement('div');
  arrows.className = 'carousel-hero-arrows';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-hero-prev';
  prev.setAttribute('aria-label', LABELS.previous);
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-hero-next';
  next.setAttribute('aria-label', LABELS.next);
  arrows.append(prev, next);

  controls.append(nav, arrows);
  block.append(controls);

  updateActiveSlide(block, 0);
  bindEvents(block);
}
