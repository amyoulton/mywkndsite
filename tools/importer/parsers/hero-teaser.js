/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-teaser. Base: hero.
 * Source: https://wknd.site/us/en.html (Next Adventures banner)
 * Selector: .aem-Grid > .teaser.cmp-teaser--hero.cmp-teaser--imagebottom
 *
 * Output: 1 column.
 *   row 1 = image (.cmp-teaser__image img) — only if present
 *   row 2 = heading (level kept), description paragraph(s), CTA link ("See Trip")
 * blocks/hero-teaser/hero-teaser.js collects the picture and all text from any rows/cells.
 *
 * Validated against source.html:
 *   .cmp-teaser > .cmp-teaser__content > h2.cmp-teaser__title, div.cmp-teaser__description,
 *                 .cmp-teaser__action-container > a.cmp-teaser__action-link
 *   .cmp-teaser > .cmp-teaser__image img.cmp-image__image
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
  const img = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');
  const pretitle = element.querySelector('.cmp-teaser__pretitle');
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3, h4, h5, h6');
  const desc = element.querySelector('.cmp-teaser__description');
  let ctas = Array.from(element.querySelectorAll('.cmp-teaser__action-link'));
  if (!ctas.length) ctas = Array.from(element.querySelectorAll('.cmp-teaser__content a[href]'));

  const content = [];
  if (pretitle && pretitle.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = pretitle.textContent.trim();
    content.push(p);
  }
  if (heading && heading.textContent.trim()) {
    const level = /^H[1-6]$/.test(heading.tagName) ? heading.tagName.toLowerCase() : 'h2';
    const h = document.createElement(level);
    h.textContent = heading.textContent.trim();
    content.push(h);
  }
  content.push(...descriptionParagraphs(desc, document));
  ctas.forEach((a) => {
    const p = document.createElement('p');
    a.removeAttribute('id');
    a.removeAttribute('class');
    p.append(a);
    content.push(p);
  });

  // Empty-block guard.
  if (!img && !content.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (img) cells.push([img]);
  if (content.length) cells.push([content]);

  // Variant: AEM teaser style "imagebottom" -> EDS variant "image-bottom".
  const variants = [];
  if (element.classList.contains('cmp-teaser--imagebottom')
    || element.querySelector(':scope .cmp-teaser--imagebottom')) {
    variants.push('image-bottom');
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-teaser', variants, cells });
  element.replaceWith(block);
}
