/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-featured. Base: columns.
 * Source: https://wknd.site/us/en.html
 * Selector: .teaser.cmp-teaser--featured
 *
 * Output: one row, 2 columns.
 *   cell 1 = image (.cmp-teaser__image img)
 *   cell 2 = pretitle paragraph ("Featured Article"), heading (level kept),
 *            description paragraph(s), CTA link ("Full Article")
 *
 * Validated against source.html:
 *   .cmp-teaser > .cmp-teaser__content > p.cmp-teaser__pretitle, h2.cmp-teaser__title,
 *                 div.cmp-teaser__description, .cmp-teaser__action-container > a.cmp-teaser__action-link
 *   .cmp-teaser > .cmp-teaser__image img.cmp-image__image
 * blocks/columns-featured/columns-featured.js marks a leading plain <p> before the heading as pretitle.
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

  const text = [];
  if (pretitle && pretitle.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = pretitle.textContent.trim();
    text.push(p);
  }
  if (heading && heading.textContent.trim()) {
    const level = /^H[1-6]$/.test(heading.tagName) ? heading.tagName.toLowerCase() : 'h2';
    const h = document.createElement(level);
    h.textContent = heading.textContent.trim();
    text.push(h);
  }
  text.push(...descriptionParagraphs(desc, document));
  ctas.forEach((a) => {
    const p = document.createElement('p');
    a.removeAttribute('id');
    a.removeAttribute('class');
    p.append(a);
    text.push(p);
  });

  // Empty-block guard.
  if (!img && !text.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[img || '', text.length ? text : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-featured', cells });
  element.replaceWith(block);
}
