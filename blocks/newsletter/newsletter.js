let formCount = 0;

/**
 * Marks a plain-text paragraph that precedes the first heading as the eyebrow ("Stay in the loop").
 */
function markEyebrow(el) {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  const first = el.firstElementChild;
  if (heading && first && first !== heading && first.tagName === 'P'
    && !first.querySelector('a, picture, img')) {
    first.classList.add('newsletter-eyebrow');
  }
}

/**
 * Builds the sign-up form from the authored form row: the plain text is the
 * field placeholder, the link text is the button label and its href the form action.
 */
function buildForm(cells) {
  const link = cells.map((cell) => cell.querySelector('a[href]')).find(Boolean);
  const placeholder = cells.map((cell) => cell.textContent.trim())
    .find((text) => text && (!link || text !== link.textContent.trim()))
    || 'Your email address';

  formCount += 1;
  const id = `newsletter-email-${formCount}`;
  const form = document.createElement('form');
  form.className = 'newsletter-form';
  const href = link && link.getAttribute('href');
  if (href && href !== '#') {
    form.action = link.href;
    form.method = 'get';
  } else {
    form.addEventListener('submit', (e) => e.preventDefault());
  }

  const label = document.createElement('label');
  label.htmlFor = id;
  label.className = 'newsletter-label';
  label.textContent = placeholder;

  const input = document.createElement('input');
  input.type = 'email';
  input.name = 'email';
  input.id = id;
  input.required = true;
  input.autocomplete = 'email';
  input.placeholder = placeholder;

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'newsletter-submit';
  button.textContent = (link && link.textContent.trim()) || 'Sign up';

  form.append(label, input, button);
  return form;
}

/**
 * Rows: intro copy (eyebrow, heading, text) and one form row
 * (placeholder text + a link whose text is the button label).
 */
export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'newsletter-content';
  let form;

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((cell) => cell.textContent.trim());
    if (!cells.length) return;
    const isFormRow = !form && cells.some((cell) => cell.querySelector('a[href]'))
      && !cells.some((cell) => cell.querySelector('h1, h2, h3, h4, h5, h6'));
    if (isFormRow) {
      form = buildForm(cells);
    } else {
      cells.forEach((cell) => content.append(...cell.childNodes));
    }
  });

  markEyebrow(content);
  const children = [];
  if (content.children.length) children.push(content);
  if (form) children.push(form);
  block.replaceChildren(...children);
}
