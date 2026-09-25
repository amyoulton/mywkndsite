import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

// No option classes yet; any extra classes authors add are left untouched.

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

/**
 * Social networks rendered as icon buttons. Authors write a plain link whose text is the
 * network name ("Facebook"); the link URL's host or an authored :facebook: icon also works.
 */
const NETWORKS = [
  { name: 'facebook', label: 'Facebook', match: /facebook|fb\.com/i },
  { name: 'twitter', label: 'Twitter', match: /twitter|^x$|(^|\.)x\.com/i },
  { name: 'instagram', label: 'Instagram', match: /instagram/i },
];

function getNetwork(a) {
  const icon = a.querySelector('span.icon');
  const iconName = icon && [...icon.classList].find((c) => c.startsWith('icon-'))?.substring(5);
  let host = '';
  try {
    host = new URL(a.href, window.location).hostname;
  } catch { /* relative or invalid href */ }
  const candidates = [iconName, a.textContent.trim(), host].filter(Boolean);
  return NETWORKS.find((n) => candidates.some((c) => n.match.test(c)));
}

/**
 * decorateButtons() runs before blocks and turns a bold/italic link alone in a paragraph
 * into a button. Links inside a profile card are not CTAs, so undo that inside the card.
 */
function unbuttonize(body) {
  body.querySelectorAll('a.button').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary', 'accent');
    if (!a.classList.length) a.removeAttribute('class');
  });
  body.querySelectorAll('.button-wrapper').forEach((p) => p.classList.remove('button-wrapper'));
}

/** Pulls every social link out of the body into an icon-button list. */
function buildSocial(body) {
  const links = [...body.querySelectorAll('a[href]')]
    .map((a) => ({ a, network: getNetwork(a) }))
    .filter(({ network }) => network);
  if (!links.length) return null;

  const list = document.createElement('ul');
  list.className = 'cards-contributor-social';
  links.forEach(({ a, network }) => {
    const parent = a.parentElement;
    const label = a.textContent.trim() || network.label;

    const icon = document.createElement('span');
    icon.className = `icon icon-${network.name}`;
    const text = document.createElement('span');
    text.className = 'cards-contributor-social-label';
    text.textContent = label;

    a.removeAttribute('class');
    a.classList.add('cards-contributor-social-link', `cards-contributor-social-${network.name}`);
    a.replaceChildren(icon, text);

    const li = document.createElement('li');
    li.append(a);
    list.append(li);

    // Remove wrappers (p, strong, li, ul...) the link left empty.
    let el = parent;
    while (el && el !== body && !hasContent(el)) {
      const next = el.parentElement;
      el.remove();
      el = next;
    }
  });
  return list;
}

function buildCard(row) {
  const li = document.createElement('li');
  li.className = 'cards-contributor-card';

  const cells = [...row.children].filter(hasContent);
  const picture = row.querySelector('picture') || row.querySelector('img');

  const image = document.createElement('div');
  image.className = 'cards-contributor-card-image';

  const body = document.createElement('div');
  body.className = 'cards-contributor-card-body';

  // The picture may sit in its own cell or share a cell with the text; either way,
  // move it out and merge all remaining content into one body.
  if (picture) image.append(picture.closest('a') || picture);
  cells.forEach((cell) => {
    cell.querySelectorAll('p').forEach((p) => { if (!hasContent(p)) p.remove(); });
    body.append(...cell.childNodes);
  });
  unbuttonize(body);

  const social = buildSocial(body);

  // Name: an authored heading, else the first paragraph. Roles: the next paragraph.
  const name = body.querySelector('h1, h2, h3, h4, h5, h6') || body.querySelector('p');
  if (name) name.classList.add('cards-contributor-card-name');
  const rest = [...body.children].filter((el) => el !== name && hasContent(el));
  rest.forEach((el, i) => {
    el.classList.add(i === 0 ? 'cards-contributor-card-roles' : 'cards-contributor-card-description');
  });

  if (image.children.length) li.append(image);
  else li.classList.add('cards-contributor-card-no-image');
  if (body.textContent.trim()) li.append(body);
  if (social) li.append(social);

  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (hasContent(row)) ul.append(buildCard(row));
  });

  ul.querySelectorAll('.cards-contributor-card-image img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  block.replaceChildren(ul);
  // Icons created here were not present when decorateMain() ran decorateIcons().
  decorateIcons(block);
}
