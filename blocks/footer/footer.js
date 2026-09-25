/**
 * Fetches the footer fragment and returns its sections with image paths
 * resolved against the fragment URL.
 * @returns {Promise<Element[]|null>} top-level section elements
 */
async function fetchFooterSections() {
  // metadata-independent: /content first (local preview), then root (DA/EDS)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const base = new URL(resp.url, window.location.origin);
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  container.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  container.querySelectorAll('source[srcset]').forEach((source) => {
    source.srcset = new URL(source.getAttribute('srcset'), base).href;
  });
  return [...container.children];
}

/**
 * Normalized same-origin path of a URL (no /content prefix, .html or trailing slash).
 * @param {string} href
 * @returns {string|null}
 */
function normalizedPath(href) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return url.pathname.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '');
}

function section(className, ...children) {
  const div = document.createElement('div');
  div.className = className;
  div.append(...children);
  return div;
}

/**
 * Builds the footer nav and marks the link for the current page section.
 * @param {Element} fragmentSection
 * @returns {Element}
 */
function buildNav(fragmentSection) {
  const nav = document.createElement('nav');
  nav.className = 'footer-nav';
  nav.setAttribute('aria-label', 'Footer');
  const list = fragmentSection.querySelector('ul');
  if (list) {
    const here = normalizedPath(window.location.href);
    list.querySelectorAll('a').forEach((a) => {
      const path = normalizedPath(a.href);
      if (path && (here === path || here.startsWith(`${path}/`))) a.setAttribute('aria-current', 'page');
    });
    nav.append(list);
  }
  return nav;
}

/**
 * Builds the social area: label paragraph + list of icon links.
 * @param {Element} fragmentSection
 * @returns {Element}
 */
function buildSocial(fragmentSection) {
  const label = fragmentSection.querySelector(':scope > p');
  if (label) label.className = 'footer-social-label';
  const list = fragmentSection.querySelector('ul');
  if (list) {
    list.className = 'footer-social-links';
    list.querySelectorAll('a').forEach((a) => {
      const img = a.querySelector('img');
      if (img && !a.getAttribute('aria-label')) a.setAttribute('aria-label', img.alt);
      if (img) img.alt = '';
    });
  }
  return section('footer-social', ...[label, list].filter(Boolean));
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragmentSections = await fetchFooterSections();
  block.textContent = '';
  if (!fragmentSections) return;

  const [brandSection, navSection, socialSection, legalSection] = fragmentSections;
  const inner = document.createElement('div');
  inner.className = 'footer-inner';
  if (brandSection) inner.append(section('footer-brand', ...brandSection.childNodes));
  if (navSection) inner.append(buildNav(navSection));
  if (socialSection) inner.append(buildSocial(socialSection));
  if (legalSection) inner.append(section('footer-legal', ...legalSection.childNodes));
  block.append(inner);
}
