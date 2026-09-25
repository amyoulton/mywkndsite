import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

// No option classes yet; any extra classes authors add are left untouched.

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

// Plain "Read More" text marks the gated call-to-action (it is not a link for anonymous visitors).
const CTA_TEXT = /^read\s+more\b/i;

/**
 * decorateButtons() runs before blocks and turns a bold/italic link alone in a paragraph
 * into a button. Keep the teaser's markup predictable by undoing that inside the card.
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
  li.className = 'cards-members-card';

  const cells = [...row.children].filter(hasContent);
  const picture = row.querySelector('picture') || row.querySelector('img');

  const image = document.createElement('div');
  image.className = 'cards-members-card-image';

  const body = document.createElement('div');
  body.className = 'cards-members-card-body';

  // The picture may sit in its own cell or share a cell with the text; either way,
  // move it out and merge all remaining content into one body.
  if (picture) image.append(picture.closest('a') || picture);
  cells.forEach((cell) => {
    cell.querySelectorAll('p').forEach((p) => { if (!hasContent(p)) p.remove(); });
    body.append(...cell.childNodes);
  });
  unbuttonize(body);

  // Lock icon marks the teaser as members-only; authors do not need to add it.
  // An authored :lock: icon is reused instead of adding a second one.
  let lock = body.querySelector('span.icon-lock');
  if (lock) {
    const wrapper = lock.closest('p');
    if (wrapper && wrapper.textContent.trim() === '') wrapper.replaceWith(lock);
  } else {
    lock = document.createElement('span');
    lock.className = 'icon icon-lock';
  }
  const lockWrapper = document.createElement('div');
  lockWrapper.className = 'cards-members-card-lock';
  lockWrapper.append(lock);

  // Title: an authored heading, else the first paragraph.
  const title = body.querySelector('h1, h2, h3, h4, h5, h6') || body.querySelector('p');
  if (title) title.classList.add('cards-members-card-title');

  // CTA: the last element reading "Read More". Plain text is rendered as an inactive,
  // non-focusable label; if an author links it, the link is kept.
  const cta = [...body.children].reverse()
    .find((el) => el !== title && CTA_TEXT.test(el.textContent.trim()));
  if (cta) {
    cta.classList.add('cards-members-card-cta');
    if (!cta.querySelector('a[href]')) {
      cta.classList.add('cards-members-card-cta-disabled');
      cta.setAttribute('aria-disabled', 'true');
    }
  }

  [...body.children].forEach((el) => {
    if (el !== title && el !== cta && hasContent(el)) el.classList.add('cards-members-card-description');
  });

  // The lock sits outside the faded body/image so it keeps full opacity.
  li.append(lockWrapper, body);
  // Image sits below the text on the source.
  if (image.children.length) li.append(image);
  else li.classList.add('cards-members-card-no-image');

  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (hasContent(row)) ul.append(buildCard(row));
  });

  ul.querySelectorAll('.cards-members-card-image img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  block.replaceChildren(ul);
  // The lock icon is created here, after decorateMain() already ran decorateIcons().
  decorateIcons(block);
}
