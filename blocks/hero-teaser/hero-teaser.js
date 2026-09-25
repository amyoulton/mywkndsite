import { createOptimizedPicture } from '../../scripts/aem.js';

// No option classes yet; any extra classes authors add are left untouched.

const hasContent = (el) => el.textContent.trim() || el.querySelector('picture, img');

export default function decorate(block) {
  // Authors may split image and text into separate cells or rows; collect everything.
  const cells = [...block.children].flatMap((row) => [...row.children]).filter(hasContent);
  const picture = block.querySelector('picture') || block.querySelector('img');

  const image = document.createElement('div');
  image.className = 'hero-teaser-image';
  if (picture) image.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-teaser-content';
  cells.forEach((cell) => {
    // Drop the paragraph left empty after moving the picture out.
    cell.querySelectorAll('p').forEach((p) => { if (!hasContent(p)) p.remove(); });
    content.append(...cell.childNodes);
  });

  // A paragraph holding only a link is the CTA (styled as the yellow button).
  content.querySelectorAll(':scope > p').forEach((p) => {
    const links = p.querySelectorAll('a[href]');
    if (links.length === 1 && p.textContent.trim() === links[0].textContent.trim()) {
      p.classList.add('hero-teaser-action');
    }
  });

  image.querySelectorAll('img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    (img.closest('picture') || img).replaceWith(optimized);
  });

  const children = [];
  if (image.children.length) children.push(image);
  else block.classList.add('hero-teaser-no-image');
  if (content.textContent.trim()) children.push(content);
  block.replaceChildren(...children);
}
