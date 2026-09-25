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

  block.querySelectorAll('.carousel-teaser-slide').forEach((slide, idx) => {
    const isActive = idx === slideIndex;
    slide.setAttribute('aria-hidden', !isActive);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (isActive) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });

  block.querySelectorAll('.carousel-teaser-indicator button').forEach((button, idx) => {
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
  const slides = block.querySelectorAll('.carousel-teaser-slide');
  if (!slides.length) return;
  let index = slideIndex;
  if (index < 0) index = slides.length - 1;
  if (index >= slides.length) index = 0;
  const track = block.querySelector('.carousel-teaser-slides');
  track.scrollTo({ top: 0, left: slides[index].offsetLeft, behavior: 'smooth' });
  updateActiveSlide(block, index);
}

function bindEvents(block) {
  block.querySelectorAll('.carousel-teaser-indicator').forEach((indicator) => {
    indicator.querySelector('button').addEventListener('click', () => {
      showSlide(block, parseInt(indicator.dataset.targetSlide, 10));
    });
  });

  const current = () => parseInt(block.dataset.activeSlide || '0', 10);
  block.querySelector('.carousel-teaser-prev').addEventListener('click', () => showSlide(block, current() - 1));
  block.querySelector('.carousel-teaser-next').addEventListener('click', () => showSlide(block, current() + 1));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-teaser-slide').forEach((slide) => observer.observe(slide));
}

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

function createSlide(row, slideIndex, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-teaser-slide';
  slide.dataset.slideIndex = slideIndex;
  slide.id = `carousel-teaser-${id}-slide-${slideIndex}`;

  const cells = [...row.children].filter(hasContent);

  // Image: the first picture found anywhere in the row, wherever the author put it.
  const imageWrap = document.createElement('div');
  imageWrap.className = 'carousel-teaser-slide-image';
  const picture = row.querySelector('picture') || row.querySelector('img');
  if (picture) imageWrap.append(picture);

  // Text: everything else, merged from all cells into one panel (the picture is already
  // moved out, so this also covers authors who put image and text in a single cell).
  const content = document.createElement('div');
  content.className = 'carousel-teaser-slide-content';
  cells.forEach((cell) => {
    // Drop the paragraph left empty after moving the picture out.
    cell.querySelectorAll('p').forEach((p) => { if (!hasContent(p)) p.remove(); });
    content.append(...cell.childNodes);
  });

  // A paragraph holding nothing but one link is the slide CTA (plain or already buttonized).
  content.querySelectorAll(':scope > p').forEach((p) => {
    const links = p.querySelectorAll('a');
    if (links.length === 1 && p.textContent.trim() === links[0].textContent.trim()) {
      p.classList.add('carousel-teaser-slide-cta');
    }
  });

  if (imageWrap.children.length) slide.append(imageWrap);
  if (content.textContent.trim()) slide.append(content);
  else slide.classList.add('carousel-teaser-slide-no-content');

  imageWrap.querySelectorAll('img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, slideIndex === 0, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);

  return slide;
}

export default function decorate(block) {
  carouselId += 1;
  const id = carouselId;

  // Ignore fully empty rows authors may leave behind.
  const rows = [...block.children].filter(hasContent);
  if (!rows.length) {
    block.replaceChildren();
    return;
  }

  block.id = `carousel-teaser-${id}`;

  const viewport = document.createElement('div');
  viewport.className = 'carousel-teaser-slides-container';
  const track = document.createElement('ul');
  track.className = 'carousel-teaser-slides';
  viewport.append(track);

  const slides = rows.map((row, idx) => createSlide(row, idx, id));
  track.append(...slides);
  block.replaceChildren(viewport);

  // A single slide renders as a static teaser: no controls, no carousel semantics.
  if (slides.length < 2) {
    block.classList.add('carousel-teaser-single');
    return;
  }

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', LABELS.region);

  const controls = document.createElement('div');
  controls.className = 'carousel-teaser-controls';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', LABELS.controls);
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-teaser-indicators';
  slides.forEach((slide, idx) => {
    const li = document.createElement('li');
    li.className = 'carousel-teaser-indicator';
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
  arrows.className = 'carousel-teaser-arrows';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-teaser-prev';
  prev.setAttribute('aria-label', LABELS.previous);
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-teaser-next';
  next.setAttribute('aria-label', LABELS.next);
  arrows.append(prev, next);

  controls.append(nav, arrows);
  block.append(controls);

  updateActiveSlide(block, 0);
  bindEvents(block);
}
