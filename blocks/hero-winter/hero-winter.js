/**
 * hero-winter: full-bleed photo with an uppercase headline and CTA pinned bottom-left.
 * Authors may put the image and text in one cell or separate rows, in any order.
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const content = document.createElement('div');
  content.className = 'hero-winter-content';

  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    [...cell.children].forEach((el) => {
      if (picture && (el === picture || el.contains(picture))) return;
      if (el.textContent.trim()) content.append(el);
    });
  });

  const children = [];
  if (picture) {
    picture.classList.add('hero-winter-image');
    children.push(picture);
  }
  if (content.children.length) children.push(content);
  block.replaceChildren(...children);
}
