import { createOptimizedPicture } from '../../scripts/aem.js';

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * Marks a plain-text paragraph that precedes the first heading as the eyebrow
 * ("Winter Adventures").
 */
function markEyebrow(el) {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  const first = el.firstElementChild;
  if (heading && first && first !== heading && first.tagName === 'P'
    && !first.querySelector('a, picture, img')) {
    first.classList.add('cards-adventure-eyebrow');
  }
}

/**
 * Rows without an image that come before the first card are the section intro
 * (eyebrow + heading); every other row is a card: image cell + body cell.
 */
export default function decorate(block) {
  const header = document.createElement('div');
  header.className = 'cards-adventure-header';
  const ul = document.createElement('ul');
  ul.className = 'cards-adventure-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter(hasContent);
    if (!cells.length) return;
    const hasImage = cells.some((cell) => cell.querySelector('picture, img'));

    if (!hasImage && !ul.children.length) {
      cells.forEach((cell) => header.append(...cell.childNodes));
      return;
    }

    const li = document.createElement('li');
    li.className = 'cards-adventure-card';
    const body = document.createElement('div');
    body.className = 'cards-adventure-card-body';

    cells.forEach((cell) => {
      const picture = cell.querySelector('picture') || cell.querySelector('img');
      if (picture && !li.querySelector('.cards-adventure-card-image')) {
        const image = document.createElement('div');
        image.className = 'cards-adventure-card-image';
        image.append(picture);
        li.prepend(image);
      }
      [...cell.children].forEach((el) => {
        if (el.textContent.trim()) body.append(el);
      });
    });

    if (body.children.length) li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  markEyebrow(header);
  const children = [];
  if (header.children.length) children.push(header);
  if (ul.children.length) children.push(ul);
  block.replaceChildren(...children);
}
