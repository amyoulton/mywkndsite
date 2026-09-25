/* eslint-disable */
/* global WebImporter */

/**
 * Import script: WKND header -> /nav fragment (content/nav.plain.html).
 * Source: https://wknd.site/us/en.html (header.experiencefragment).
 *
 * Output: four flat sections, read by blocks/header/header.js
 *   1. utility  - Sign In link + language list (flag, country, language links)
 *   2. brand    - linked WKND logo
 *   3. sections - main nav links
 *   4. tools    - "Search" label (the search control is built in header.js)
 * Links to migrated US English pages become /us/en/... paths; other locales
 * stay absolute on wknd.site (not migrated).
 */
const SOURCE_ORIGIN = 'https://wknd.site';
// header images are downloaded to content/images/ and referenced relative to the fragment
const LOGO_SRC = 'images/wknd-logo.svg';
// flags are 44x32 PNGs (the source ES flag SVG exceeds the 40KB SVG limit)
const flagSrc = (code) => `images/flag-${code.toLowerCase()}.png`;

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
  a.textContent = text;
  return a;
}

function img(document, src, alt) {
  const i = document.createElement('img');
  i.setAttribute('src', src);
  i.setAttribute('alt', alt || '');
  return i;
}

function buildUtility(document, header) {
  const section = document.createElement('div');

  const signIn = header.querySelector('.wknd-sign-in-buttons__button--sign-in');
  if (signIn) {
    const p = document.createElement('p');
    p.append(link(document, signIn.textContent.trim(), signIn.getAttribute('href')));
    section.append(p);
  }

  const countries = [...header.querySelectorAll('.cmp-languagenavigation__item--level-0')];
  if (countries.length) {
    // <li>{current language}<ul>{countries}</ul></li>: the label is the dropdown trigger
    const toggle = header.querySelector('#langNavToggleHeader');
    const outer = document.createElement('ul');
    const triggerLi = document.createElement('li');
    triggerLi.append(document.createTextNode(toggle ? toggle.textContent.trim() : 'Language'));
    const ul = document.createElement('ul');
    countries.forEach((country) => {
      const li = document.createElement('li');
      const code = (country.className.match(/countrycode-([A-Z]{2})/) || [])[1];
      const title = country.querySelector(':scope > .cmp-languagenavigation__item-title');
      const name = title ? title.textContent.trim() : '';
      if (code) li.append(img(document, flagSrc(code), name));
      li.append(document.createTextNode(name));
      const langs = [...country.querySelectorAll('.cmp-languagenavigation__item--level-1 a')];
      if (langs.length) {
        const sub = document.createElement('ul');
        langs.forEach((a) => {
          const sli = document.createElement('li');
          sli.append(link(document, a.textContent.trim(), a.getAttribute('href')));
          sub.append(sli);
        });
        li.append(sub);
      }
      ul.append(li);
    });
    triggerLi.append(ul);
    outer.append(triggerLi);
    section.append(outer);
  }
  return section;
}

function buildBrand(document, header) {
  const section = document.createElement('div');
  const logo = header.querySelector('.cmp-image__image');
  if (logo) {
    const p = document.createElement('p');
    const anchor = logo.closest('a') || header.querySelector('.cmp-image__link');
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

function buildSections(document, header) {
  const section = document.createElement('div');
  // level-0 is "Home" (shown in the source's mobile menu only), level-1 the sections
  const items = [...header.querySelectorAll('.cmp-navigation--header .cmp-navigation__item--level-0 > .cmp-navigation__item-link, .cmp-navigation--header .cmp-navigation__item--level-1 > .cmp-navigation__item-link')];
  const ul = document.createElement('ul');
  items.forEach((a) => {
    const li = document.createElement('li');
    li.append(link(document, a.textContent.trim(), a.getAttribute('href')));
    ul.append(li);
  });
  section.append(ul);
  return section;
}

function buildTools(document, header) {
  const section = document.createElement('div');
  const input = header.querySelector('.cmp-search__input');
  if (input) {
    // search icon + placeholder label, then the clear icon; header.js builds the input
    const p = document.createElement('p');
    p.append(img(document, 'images/search-icon.svg', ''));
    p.append(document.createTextNode(input.getAttribute('placeholder') || 'Search'));
    section.append(p);
    const clear = document.createElement('p');
    clear.append(img(document, 'images/search-clear.svg', 'Clear search'));
    section.append(clear);
  }
  return section;
}

export default {
  transform: ({ document, params }) => {
    const header = document.querySelector('header.experiencefragment') || document.querySelector('header');
    const main = document.createElement('div');
    if (!header) {
      console.warn('No header found on source page');
      return [{ element: main, path: '/nav' }];
    }
    // <hr> between sections becomes a section break in the fragment
    const sections = [
      buildUtility(document, header),
      buildBrand(document, header),
      buildSections(document, header),
      buildTools(document, header),
    ];
    sections.forEach((section, i) => {
      if (i > 0) main.append(document.createElement('hr'));
      main.append(...section.childNodes);
    });
    return [{
      element: main,
      path: '/nav',
      report: { title: 'nav', source: params.originalURL },
    }];
  },
};
