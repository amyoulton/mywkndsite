/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://wknd.site/us/en/faqs.html
 * Selector: main.cmp-layout-container--fixed .accordion.panelcontainer
 *
 * Output: one row per FAQ item, 2 cells: question text | rich answer.
 *
 * Validated against source.html:
 *   <div class="cmp-accordion">
 *     <div class="cmp-accordion__item">                        (x7, iterationSafe)
 *       <h3 class="cmp-accordion__header"><button class="cmp-accordion__button">
 *         <span class="cmp-accordion__title">Question?</span>
 *         <span class="cmp-accordion__icon"></span>             (excluded)
 *       </button></h3>
 *       <div class="cmp-accordion__panel">
 *         ... <div class="cmp-text"><p>..</p><h3>&nbsp;</h3></div>  (empty headings/paragraphs dropped)
 *
 * Answer elements are passed as the original block-level elements (<p>, lists, etc.),
 * so paragraph/list/bold/link markup is preserved into cell 2. Note: when a cell holds a
 * single paragraph, the markdown round-trip (html2md -> md2html) unwraps it to bare inline
 * content; multi-paragraph cells keep their <p>s. The block must tolerate both shapes.
 *
 * Iteration is keyed on the block-level .cmp-accordion__item wrappers, never on the buttons.
 * Items without question text are skipped so the question cell is never empty.
 */
const CONTENT_SELECTOR = 'p, ul, ol, table, blockquote, h1, h2, h3, h4, h5, h6, picture, img, video, iframe, hr';
const MEDIA = 'picture, img, video, iframe';

const textOf = (el) => (el?.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const isEmpty = (el) => !el || (!textOf(el) && !(el.matches(MEDIA) || el.querySelector(MEDIA)) && !el.matches('hr'));

function getQuestion(item) {
  const title = item.querySelector('.cmp-accordion__title');
  if (title && textOf(title)) return textOf(title);
  const button = item.querySelector('.cmp-accordion__button, button, .cmp-accordion__header');
  if (!button) return '';
  const clone = button.cloneNode(true);
  clone.querySelectorAll('.cmp-accordion__icon').forEach((i) => i.remove());
  return textOf(clone);
}

function getAnswer(item) {
  const panel = item.querySelector('.cmp-accordion__panel, [role="region"]');
  if (!panel) return [];
  const roots = [...panel.querySelectorAll('.cmp-text')];
  const scopes = roots.length ? roots : [panel];
  const content = [];
  scopes.forEach((scope) => {
    [...scope.querySelectorAll(CONTENT_SELECTOR)]
      // keep only outermost content elements (no <p> inside <li>, no <img> inside <picture>)
      .filter((el) => {
        const parent = el.parentElement?.closest(CONTENT_SELECTOR + ', li');
        return !parent || !scope.contains(parent) || parent === scope;
      })
      .forEach((el) => {
        if (el.matches('h1, h2, h3, h4, h5, h6, p') && isEmpty(el)) return;
        if (isEmpty(el)) return;
        content.push(el);
      });
  });
  return content;
}

export default function parse(element, { document }) {
  const items = [...element.querySelectorAll('.cmp-accordion__item')];
  const cells = [];

  items.forEach((item) => {
    const question = getQuestion(item);
    if (!question) return;
    const answer = getAnswer(item);
    const questionP = document.createElement('p');
    questionP.textContent = question;
    cells.push([questionP, answer.length ? answer : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
