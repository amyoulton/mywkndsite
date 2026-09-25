/*
 * Accordion FAQ block
 * One row per question: cell 1 = question, cell 2 = rich answer.
 * Built on native <details>/<summary>, so keyboard and screen-reader support
 * come from the browser. Items open independently (no `name` attribute),
 * so several answers can be open at once.
 */

const MEDIA = 'picture, img, video, iframe, svg';

/** Text with non-breaking spaces collapsed, trimmed. */
const textOf = (el) => (el?.textContent || '').replace(/\u00a0/g, ' ').trim();

const isEmpty = (el) => !el || (!textOf(el) && !el.querySelector(MEDIA));

/**
 * Removes empty headings and paragraphs anywhere in the answer (for example a
 * stray `<h3>&nbsp;</h3>`), then strips any other empty trailing elements.
 */
function cleanAnswer(body) {
  body.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    if (isEmpty(el)) el.remove();
  });
  while (body.lastElementChild && isEmpty(body.lastElementChild)
    && !body.lastElementChild.matches('hr, br')) {
    body.lastElementChild.remove();
  }
}

/**
 * Moves the question cell's content into the summary. Paragraph wrappers are
 * unwrapped, since <summary> should hold phrasing content or a heading.
 */
function buildLabel(cell) {
  const title = document.createElement('span');
  title.className = 'accordion-faq-item-title';
  const blocks = [...cell.children];
  const onlyParagraphs = blocks.length > 0 && blocks.every((c) => c.tagName === 'P');
  if (onlyParagraphs) {
    blocks.forEach((p, i) => {
      if (i > 0) title.append(' ');
      title.append(...p.childNodes);
    });
  } else {
    title.append(...cell.childNodes);
  }
  return title;
}

function buildItem(row) {
  const cells = [...row.children];
  const [questionCell, ...answerCells] = cells;

  // A row without a question has nothing to toggle.
  if (isEmpty(questionCell)) return null;

  const summary = document.createElement('summary');
  summary.className = 'accordion-faq-item-label';
  const icon = document.createElement('span');
  icon.className = 'accordion-faq-item-icon';
  icon.setAttribute('aria-hidden', 'true');
  summary.append(buildLabel(questionCell), icon);

  // The answer is cell 2. Any extra cells authors add are appended to it,
  // so no content is lost. A missing answer cell gives an empty body.
  const body = document.createElement('div');
  body.className = 'accordion-faq-item-body';
  answerCells.forEach((cell) => body.append(...cell.childNodes));
  cleanAnswer(body);

  const details = document.createElement('details');
  details.className = 'accordion-faq-item';
  if (isEmpty(body)) details.classList.add('accordion-faq-item-no-answer');
  details.append(summary, body);
  return details;
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const item = buildItem(row);
    if (item) row.replaceWith(item);
    else row.remove();
  });
}
