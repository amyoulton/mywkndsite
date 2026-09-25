/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html
 * Selector: .carousel.panelcontainer.cmp-carousel--mini
 *
 * Output: one row per slide.
 *   cell 1 = image (img from .cmp-carousel__item)
 *   cell 2 = optional text content (headings/paragraphs/links in the slide; empty on source)
 *
 * Validated against source.html:
 *   <div class="cmp-carousel__content">
 *     <div class="cmp-carousel__item ..."><div class="image"><div class="cmp-image"><img class="cmp-image__image"></div></div></div>
 *     <div class="cmp-carousel__actions">...Previous/Next buttons (UI chrome, ignored)</div>
 *     <ol class="cmp-carousel__indicators">...(UI chrome, ignored)</ol>
 *   </div>
 * Pages have 1-3 slides.
 */
export default function parse(element, { document }) {
  // Slides: iterate the block-level item wrappers (not interactive elements).
  let items = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  if (!items.length) {
    // Fallback: each .image component inside the carousel content is a slide.
    items = Array.from(element.querySelectorAll('.cmp-carousel__content .image, .cmp-image'))
      .filter((el, idx, arr) => !arr.some((other) => other !== el && other.contains(el)));
  }

  const cells = [];
  items.forEach((item) => {
    const img = item.querySelector('picture, img.cmp-image__image, img');
    if (!img) return;

    // Optional text: any headings, paragraphs or links authored in the slide.
    const textCell = Array.from(item.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a'))
      .filter((el) => el.textContent.trim())
      .filter((el, idx, arr) => !arr.some((other) => other !== el && other.contains(el)));

    cells.push([img, textCell.length ? textCell : '']);
  });

  // Empty-block guard: nothing authorable found.
  if (!cells.length) {
    element.remove();
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
