const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * Marks a plain-text paragraph that precedes the first heading as the eyebrow ("Why WKND").
 */
function markEyebrow(el) {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  const first = el.firstElementChild;
  if (heading && first && first !== heading && first.tagName === 'P'
    && !first.querySelector('a, picture, img')) {
    first.classList.add('columns-highlights-eyebrow');
  }
}

/**
 * Marks the leading short title of a highlight ("Expert Guides"): a heading,
 * or a bold-only paragraph when authors format the title as strong text.
 */
function markTitle(cell) {
  const first = cell.firstElementChild;
  if (!first || cell.children.length < 2) return;
  const isHeading = /^H[1-6]$/.test(first.tagName);
  const isBoldPara = first.tagName === 'P' && first.querySelector('strong')
    && first.querySelector('strong').textContent.trim() === first.textContent.trim();
  if (isHeading || isBoldPara) first.classList.add('columns-highlights-title');
}

/**
 * Rows with a single cell are the section intro (eyebrow + heading);
 * rows with several cells are the highlights, one per cell.
 */
export default function decorate(block) {
  const items = document.createElement('ul');
  items.className = 'columns-highlights-items';
  const header = document.createElement('div');
  header.className = 'columns-highlights-header';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter(hasContent);
    if (cells.length === 1 && !items.children.length) {
      header.append(...cells[0].childNodes);
    } else {
      cells.forEach((cell) => {
        const li = document.createElement('li');
        li.className = 'columns-highlights-item';
        li.append(...cell.childNodes);
        markTitle(li);
        items.append(li);
      });
    }
  });

  markEyebrow(header);
  const children = [];
  if (header.children.length) children.push(header);
  if (items.children.length) {
    items.classList.add(`columns-highlights-${items.children.length}-items`);
    children.push(items);
  }
  block.replaceChildren(...children);
}
