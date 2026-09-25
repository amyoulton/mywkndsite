/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-contributor. Base: cards.
 * Source: https://wknd.site/us/en/about-us.html (Our Contributors: 4 people, WKND Guides: 3 people)
 * Selector: ... > :not(section.cmp-experience-fragment--contributor) + section.cmp-experience-fragment--contributor
 *
 * The source has no wrapper around a run of profiles: each person is a loose sibling
 * <section class="experiencefragment cmp-experience-fragment--contributor">. The selector matches
 * only the FIRST section of each consecutive run; this parser collects it plus every immediately
 * following contributor section, builds ONE block (one row per person), replaces the first section
 * with the block and removes the consumed siblings.
 *
 * Output: one row per person, 2 columns.
 *   cell 1 = photo (.cmp-image img)
 *   cell 2 = <h3>name</h3>, <p>roles</p>, <p><a href>Facebook</a></p>, <p><a href>Twitter</a></p>, <p><a href>Instagram</a></p>
 * blocks/cards-contributor/cards-contributor.js turns links whose text is a network name into icon buttons.
 *
 * Validated against source.html / source-2.html:
 *   section > .cmp-experiencefragment > ... > .cmp-container
 *     > .image .cmp-image img.cmp-image__image
 *     > .title h3.cmp-title__text            (name)
 *     > .title h5.cmp-title__text            (roles)
 *     > .cmp-buildingblock--btn-list .button a.cmp-button[href] > span.cmp-button__text (network)
 * Iteration is keyed on the block-level <section> siblings (never on anchors).
 */

const PERSON_SELECTOR = 'section.cmp-experience-fragment--contributor';

function textOf(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function buildRow(person, document) {
  const img = person.querySelector('.cmp-image img, .image img, img');

  // Headings inside the fragment: first = name, second = roles.
  const titles = Array.from(person.querySelectorAll('.title .cmp-title__text'));
  const headings = titles.length
    ? titles
    : Array.from(person.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const nameEl = headings[0];
  const rolesEl = headings[1];

  const text = [];
  const name = textOf(nameEl);
  if (name) {
    const h = document.createElement('h3');
    h.textContent = name;
    text.push(h);
  }
  const roles = textOf(rolesEl);
  if (roles) {
    const p = document.createElement('p');
    p.textContent = roles;
    text.push(p);
  }

  // Social links: plain text links named after the network, keeping their hrefs.
  let links = Array.from(person.querySelectorAll('.cmp-buildingblock--btn-list a[href]'));
  if (!links.length) links = Array.from(person.querySelectorAll('.button a[href], a.cmp-button[href]'));
  // Each link gets its own paragraph: several people share one href for all three networks
  // (e.g. "#jacob-wester", "#"), and html2md merges adjacent same-href sibling anchors.
  links.forEach((a) => {
    const label = textOf(a.querySelector('.cmp-button__text'))
      || textOf(a)
      || (a.getAttribute('aria-label') || '').replace(/\s*social media\s*$/i, '').trim();
    if (!label) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', a.getAttribute('href'));
    link.textContent = label;
    p.append(link);
    text.push(p);
  });

  if (!img && !text.length) return null;
  return [img || '', text.length ? text : ''];
}

export default function parse(element, { document }) {
  // Collect the run: the matched section plus all immediately-following contributor sections.
  const run = [element];
  let next = element.nextElementSibling;
  while (next && next.matches(PERSON_SELECTOR)) {
    run.push(next);
    next = next.nextElementSibling;
  }

  const cells = [];
  run.forEach((person) => {
    const row = buildRow(person, document);
    if (row) cells.push(row);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Remove the consumed siblings, then swap the first section for the block.
  run.slice(1).forEach((sibling) => sibling.remove());
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-contributor', cells });
  element.replaceWith(block);
}
