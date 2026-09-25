/* eslint-disable */
/* global WebImporter */

/**
 * Import script: WKND footer -> /footer fragment (content/footer.plain.html).
 * Source: https://wknd.site/us/en.html (footer.experiencefragment).
 *
 * Output: four flat sections, read by blocks/footer/footer.js
 *   1. brand  - linked WKND logo (light)
 *   2. nav    - footer nav links
 *   3. social - "Follow Us" heading + icon links
 *   4. legal  - copyright + credits paragraphs
 * Links to migrated US English pages become /us/en/... paths; other wknd.site
 * pages stay absolute (not migrated). Images are downloaded to content/images/.
 */
const SOURCE_ORIGIN = 'https://wknd.site';
const LOGO_SRC = 'images/wknd-logo-light.svg';
const socialSrc = (name) => `images/social-${name}.svg`;

function mapHref(href) {
  if (!href || href.startsWith('#')) return href || '';
  let url;
  try {
    url = new URL(href, SOURCE_ORIGIN);
  } catch (e) {
    return href;
  }
  if (!/(^|\.)wknd\.site$/.test(url.hostname)) return url.href;
  const path = url.pathname.replace(/^\/content\/wknd/, '');
  if (path === '/us/en.html' || path.startsWith('/us/en/')) {
    return path.replace(/\.html?$/, '');
  }
  return `${SOURCE_ORIGIN}${path}`;
}

function link(document, text, href) {
  const a = document.createElement('a');
  a.setAttribute('href', mapHref(href));
  if (text) a.textContent = text;
  return a;
}

function img(document, src, alt) {
  const i = document.createElement('img');
  i.setAttribute('src', src);
  i.setAttribute('alt', alt || '');
  return i;
}

function buildBrand(document, footer) {
  const section = document.createElement('div');
  const logo = footer.querySelector('.cmp-image__image');
  if (logo) {
    const p = document.createElement('p');
    const anchor = logo.closest('a') || footer.querySelector('.cmp-image__link');
    const image = img(document, LOGO_SRC, logo.getAttribute('alt') || 'WKND Logo');
    if (anchor) {
      const a = link(document, '', anchor.getAttribute('href'));
      a.append(image);
      p.append(a);
    } else {
      p.append(image);
    }
    section.append(p);
  }
  return section;
}

function buildNav(document, footer) {
  const section = document.createElement('div');
  // level-1 items only: the level-0 "Home" entry is display:none at every width on the source
  const items = [...footer.querySelectorAll('.cmp-navigation--footer .cmp-navigation__item--level-1 > .cmp-navigation__item-link')];
  if (items.length) {
    const ul = document.createElement('ul');
    items.forEach((a) => {
      const li = document.createElement('li');
      li.append(link(document, a.textContent.trim(), a.getAttribute('href')));
      ul.append(li);
    });
    section.append(ul);
  }
  return section;
}

function buildSocial(document, footer) {
  const section = document.createElement('div');
  const title = footer.querySelector('.title .cmp-title__text');
  if (title) {
    // label paragraph: headings get auto ids on import, which fragments must not carry
    const label = document.createElement('p');
    label.textContent = title.textContent.trim();
    section.append(label);
  }
  const buttons = [...footer.querySelectorAll('.cmp-buildingblock--btn-list a.cmp-button')];
  if (buttons.length) {
    const ul = document.createElement('ul');
    buttons.forEach((btn) => {
      const label = (btn.querySelector('.cmp-button__text')?.textContent || btn.getAttribute('aria-label') || '').trim();
      const icon = btn.querySelector('.cmp-button__icon');
      const name = ((icon && icon.className.match(/cmp-button__icon--([a-z]+)/)) || [])[1] || label.toLowerCase();
      const li = document.createElement('li');
      const a = link(document, '', btn.getAttribute('href'));
      a.append(img(document, socialSrc(name), label));
      li.append(a);
      ul.append(li);
    });
    section.append(ul);
  }
  return section;
}

function buildLegal(document, footer) {
  const section = document.createElement('div');
  footer.querySelectorAll('.cmp-text--font-xsmall .cmp-text p').forEach((sp) => {
    const p = document.createElement('p');
    sp.childNodes.forEach((node) => {
      if (node.nodeType === 1 && node.tagName === 'A') {
        p.append(link(document, node.textContent.trim(), node.getAttribute('href')));
      } else {
        p.append(document.createTextNode(node.textContent));
      }
    });
    if (p.textContent.trim()) section.append(p);
  });
  return section;
}

export default {
  transform: ({ document, params }) => {
    const footer = document.querySelector('footer.experiencefragment') || document.querySelector('footer');
    const main = document.createElement('div');
    if (!footer) {
      console.warn('No footer found on source page');
      return [{ element: main, path: '/footer' }];
    }
    // <hr> between sections becomes a section break in the fragment
    const sections = [
      buildBrand(document, footer),
      buildNav(document, footer),
      buildSocial(document, footer),
      buildLegal(document, footer),
    ];
    sections.forEach((section, i) => {
      if (i > 0) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });
    return [{
      element: main,
      path: '/footer',
      report: { title: 'footer', source: params.originalURL },
    }];
  },
};
