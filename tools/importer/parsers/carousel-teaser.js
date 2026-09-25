/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-teaser. Base: carousel.
 * Source: https://wknd.site/us/en.html
 * Selector: .carousel.panelcontainer.cmp-carousel--hero
 *
 * Output: one row per slide (2 columns).
 *   cell 1 = image (.cmp-teaser__image img)
 *   cell 2 = heading (level kept), description paragraph(s), CTA link
 *
 * Validated against source.html:
 *   .cmp-carousel__content > .cmp-carousel__item (3 slides; the first also has --active)
 *     > .teaser > .cmp-teaser
 *       > .cmp-teaser__content > h2.cmp-teaser__title, .cmp-teaser__description (text or <p>),
 *                                .cmp-teaser__action-container > a.cmp-teaser__action-link
 *       > .cmp-teaser__image img.cmp-image__image
 *   .cmp-carousel__actions / .cmp-carousel__indicators are UI chrome and ignored.
 */

function descriptionParagraphs(desc, document) {
  if (!desc || !desc.textContent.trim()) return [];
  const paras = Array.from(desc.querySelectorAll('p')).filter((p) => p.textContent.trim());
  if (paras.length) return paras;
  const p = document.createElement('p');
  p.append(...desc.childNodes);
  return [p];
}

export default function parse(element, { document }) {
  // Iterate block-level slide wrappers (never the interactive elements).
  let items = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  if (!items.length) items = Array.from(element.querySelectorAll('.cmp-teaser'));

  const cells = [];
  items.forEach((item) => {
    const img = item.querySelector('.cmp-teaser__image img, .cmp-image img, img');
    const heading = item.querySelector('.cmp-teaser__title, h1, h2, h3, h4, h5, h6');
    const pretitle = item.querySelector('.cmp-teaser__pretitle');
    const desc = item.querySelector('.cmp-teaser__description');
    const ctas = Array.from(item.querySelectorAll('.cmp-teaser__action-link'));
    const fallbackCtas = ctas.length ? ctas : Array.from(item.querySelectorAll('.cmp-teaser__content a[href]'));

    const text = [];
    if (pretitle && pretitle.textContent.trim()) text.push(pretitle);
    if (heading && heading.textContent.trim()) {
      const level = /^H[1-6]$/.test(heading.tagName) ? heading.tagName.toLowerCase() : 'h2';
      const h = document.createElement(level);
      h.textContent = heading.textContent.trim();
      text.push(h);
    }
    text.push(...descriptionParagraphs(desc, document));
    fallbackCtas.forEach((a) => {
      const p = document.createElement('p');
      a.removeAttribute('id');
      a.removeAttribute('class');
      p.append(a);
      text.push(p);
    });

    if (!img && !text.length) return;
    cells.push([img || '', text.length ? text : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-teaser', cells });
  element.replaceWith(block);
}
