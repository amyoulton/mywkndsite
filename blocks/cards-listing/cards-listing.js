import { createOptimizedPicture } from '../../scripts/aem.js';

// Options (block classes):
// - filter: rows carry a 3rd "categories" cell (comma-separated text). It is moved into
//   data-categories on each card and a category filter bar is built above the grid.
// Without an option the block behaves as a plain listing; unknown classes are left untouched.

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * decorateButtons() runs before blocks and turns a bold/italic link alone in a paragraph
 * into a button. A card title is a link, not a CTA, so undo that inside the card.
 */
function unbuttonize(body) {
  body.querySelectorAll('a.button').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary', 'accent');
    if (!a.classList.length) a.removeAttribute('class');
  });
  body.querySelectorAll('.button-wrapper').forEach((p) => p.classList.remove('button-wrapper'));
}

function buildCard(row) {
  const li = document.createElement('li');
  li.className = 'cards-listing-card';

  const cells = [...row.children].filter(hasContent);
  const picture = row.querySelector('picture') || row.querySelector('img');

  const image = document.createElement('div');
  image.className = 'cards-listing-card-image';

  const body = document.createElement('div');
  body.className = 'cards-listing-card-body';

  // The picture may sit in its own cell or share a cell with the text; either way,
  // move it out and merge all remaining text into one body.
  // An author-linked image keeps its own link.
  if (picture) image.append(picture.closest('a') || picture);
  cells.forEach((cell) => {
    cell.querySelectorAll('p').forEach((p) => { if (!hasContent(p)) p.remove(); });
    body.append(...cell.childNodes);
  });
  unbuttonize(body);

  // Title: an authored heading, else the first paragraph (typically strong/linked text).
  const title = body.querySelector('h1, h2, h3, h4, h5, h6') || body.querySelector('p');
  if (title) title.classList.add('cards-listing-card-title');
  body.querySelectorAll('p').forEach((p) => {
    if (p !== title) p.classList.add('cards-listing-card-description');
  });

  // The whole card is linked on the source: reuse the first link for the image so it is
  // clickable too, without adding a second tab stop or a duplicate accessible name.
  const link = body.querySelector('a[href]');
  const pic = image.querySelector('picture, img');
  if (link && pic && !pic.closest('a')) {
    const imageLink = document.createElement('a');
    imageLink.href = link.href;
    imageLink.tabIndex = -1;
    imageLink.setAttribute('aria-hidden', 'true');
    pic.replaceWith(imageLink);
    imageLink.append(pic);
  }

  if (image.children.length) li.append(image);
  else li.classList.add('cards-listing-card-no-image');
  if (body.textContent.trim()) li.append(body);

  return li;
}

const splitCategories = (text) => text.split(',').map((c) => c.trim()).filter(Boolean);
const categoryKey = (label) => label.toLowerCase();

/**
 * With .filter the categories cell is the last cell of a row that has at least 3 cells.
 * It is detached before the card is built so it never reaches the card body.
 * Rows with fewer cells simply have no categories.
 */
function extractCategories(row) {
  const cells = [...row.children];
  if (cells.length < 3) return [];
  const cell = cells[cells.length - 1];
  if (cell.querySelector('picture, img')) return [];
  cell.remove();
  return splitCategories(cell.textContent);
}

function buildFilterBar(block, ul) {
  const cards = [...ul.children];
  const labels = new Map();
  cards.forEach((card) => {
    splitCategories(card.dataset.categories || '').forEach((label) => {
      const key = categoryKey(label);
      if (!labels.has(key)) labels.set(key, label);
    });
  });
  if (!labels.size) return;

  const sorted = [...labels.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const bar = document.createElement('div');
  bar.className = 'cards-listing-filters';
  // Toolbar: one tab stop, arrow keys move between the toggle buttons (roving tabindex).
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filter by category');

  const buttons = [];
  const apply = (key) => {
    buttons.forEach((btn) => {
      const active = btn.dataset.filter === key;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('active', active);
      btn.tabIndex = active ? 0 : -1;
    });
    cards.forEach((card) => {
      const keys = splitCategories(card.dataset.categories || '').map(categoryKey);
      card.hidden = key !== '' && !keys.includes(key);
    });
  };

  [['', 'All'], ...sorted].forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cards-listing-filter';
    btn.dataset.filter = key;
    btn.textContent = label;
    if (ul.id) btn.setAttribute('aria-controls', ul.id);
    btn.addEventListener('click', () => apply(key));
    buttons.push(btn);
    bar.append(btn);
  });

  const focusButton = (btn) => {
    buttons.forEach((b) => { b.tabIndex = b === btn ? 0 : -1; });
    btn.focus();
  };

  bar.addEventListener('keydown', (e) => {
    const index = buttons.indexOf(e.target);
    if (index < 0) return;
    const last = buttons.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    focusButton(buttons[next]);
  });

  block.prepend(bar);
  apply('');
}

let listingCount = 0;

export default function decorate(block) {
  const isFilter = block.classList.contains('filter');
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const categories = isFilter ? extractCategories(row) : null;
    if (!hasContent(row)) return;
    const card = buildCard(row);
    if (isFilter) card.dataset.categories = categories.join(', ');
    ul.append(card);
  });

  ul.querySelectorAll('img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  block.replaceChildren(ul);

  if (isFilter) {
    listingCount += 1;
    ul.id = `cards-listing-list-${listingCount}`;
    buildFilterBar(block, ul);
  }
}
