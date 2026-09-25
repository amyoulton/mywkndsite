/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-members. Base: cards.
 * Source: https://wknd.site/us/en/magazine.html (Members Only: 2 gated teasers)
 * Selector: ... > :not(.cmp-teaser--secure) + .teaser.cmp-teaser--secure
 *
 * The source has no wrapper around the teasers: each is a loose sibling
 * <div class="teaser cmp-teaser--list cmp-teaser--secure">. The selector matches only the FIRST
 * teaser of each consecutive run; this parser collects it plus every immediately following
 * secure teaser, builds ONE block (one row per teaser), replaces the first teaser with the block
 * and removes the consumed siblings.
 *
 * Output: one row per teaser, 2 columns.
 *   cell 1 = image (.cmp-teaser__image img)
 *   cell 2 = <h2>title</h2>, description paragraph(s), <p>Read More</p> (plain text, no link)
 * blocks/cards-members/cards-members.js adds the lock icon and renders "Read More" as a disabled CTA.
 *
 * Validated against source.html:
 *   .cmp-teaser > .cmp-teaser__content > h2.cmp-teaser__title, div.cmp-teaser__description > p,
 *                 .cmp-teaser__action-container (plain text "Read More")
 *   .cmp-teaser > .cmp-teaser__image .cmp-image img.cmp-image__image
 */

const TEASER_SELECTOR = '.teaser.cmp-teaser--secure';

function textOf(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function buildRow(teaser, document) {
  const img = teaser.querySelector('.cmp-teaser__image img, .cmp-image img, img');
  const titleEl = teaser.querySelector('.cmp-teaser__title')
    || teaser.querySelector('.cmp-teaser__content h1, .cmp-teaser__content h2, .cmp-teaser__content h3, .cmp-teaser__content h4');
  const desc = teaser.querySelector('.cmp-teaser__description');
  const action = teaser.querySelector('.cmp-teaser__action-container');

  const text = [];
  const title = textOf(titleEl);
  if (title) {
    const level = titleEl && /^H[1-6]$/.test(titleEl.tagName) ? titleEl.tagName.toLowerCase() : 'h2';
    const h = document.createElement(level);
    h.textContent = title;
    text.push(h);
  }

  if (desc && textOf(desc)) {
    const paras = Array.from(desc.querySelectorAll('p')).filter((p) => textOf(p));
    if (paras.length) {
      paras.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = textOf(para);
        text.push(p);
      });
    } else {
      const p = document.createElement('p');
      p.textContent = textOf(desc);
      text.push(p);
    }
  }

  // Gated CTA: plain text only (the source renders it without a link for anonymous visitors).
  const ctaText = textOf(action) || 'Read More';
  const cta = document.createElement('p');
  cta.textContent = ctaText;
  if (title || text.length) text.push(cta);

  if (!img && !text.length) return null;
  return [img || '', text.length ? text : ''];
}

export default function parse(element, { document }) {
  // Collect the run: the matched teaser plus all immediately-following secure teasers.
  const run = [element];
  let next = element.nextElementSibling;
  while (next && next.matches(TEASER_SELECTOR)) {
    run.push(next);
    next = next.nextElementSibling;
  }

  const cells = [];
  run.forEach((teaser) => {
    const row = buildRow(teaser, document);
    if (row) cells.push(row);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Remove the consumed siblings, then swap the first teaser for the block.
  run.slice(1).forEach((sibling) => sibling.remove());
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-members', cells });
  element.replaceWith(block);
}
