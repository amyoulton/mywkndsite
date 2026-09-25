// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 1200px)');

const SEARCH_INDEX = '/query-index.json';
const SEARCH_MIN_CHARS = 3;
const SEARCH_MAX_RESULTS = 10;

/**
 * Fetches the nav fragment and returns its sections with image paths
 * resolved against the fragment URL.
 * @returns {Promise<Element[]|null>} top-level section elements
 */
async function fetchNavSections() {
  // metadata-independent: /content first (local preview), then root (DA/EDS)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
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
 * Path of the current page without the local /content prefix.
 * @returns {string}
 */
function currentPath() {
  return window.location.pathname.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '');
}

/**
 * Same-origin path of a link, or null for external links.
 * @param {HTMLAnchorElement} a
 * @returns {string|null}
 */
function linkPath(a) {
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return url.pathname.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '');
}

/**
 * Direct text of an element (ignoring nested lists), trimmed.
 * @param {Element} el
 * @returns {string}
 */
function ownText(el) {
  return [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !['UL', 'OL'].includes(n.tagName)))
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function closeLocale(nav) {
  const toggle = nav.querySelector('.nav-locale-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', 'false');
}

function closeSearchResults(nav) {
  const results = nav.querySelector('.nav-search-results');
  if (results) results.hidden = true;
}

function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // the open drawer pushes the page right (see styles.css body.nav-open)
  document.body.classList.toggle('nav-open', !expanded && !isDesktop.matches);
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
}

/**
 * Builds the utility bar: plain links plus a locale dropdown from a list
 * item whose own text is the trigger label and whose nested list holds
 * groups (image + name + language links).
 * @param {Element} section utility section from the fragment
 * @param {Element} nav nav element (for close handlers)
 * @returns {Element}
 */
function buildUtility(section, nav) {
  const utility = document.createElement('div');
  utility.className = 'nav-utility';

  section.querySelectorAll(':scope > p').forEach((p) => {
    const a = p.querySelector('a');
    if (!a) return;
    a.className = 'nav-utility-link';
    utility.append(a);
  });

  const localeRoot = section.querySelector(':scope > ul > li');
  if (localeRoot && localeRoot.querySelector('ul')) {
    const here = currentPath();
    const locale = document.createElement('div');
    locale.className = 'nav-locale';

    const panel = document.createElement('ul');
    panel.className = 'nav-locale-panel';
    panel.id = 'nav-locale-panel';

    let activeFlag = null;
    let activeLabel = ownText(localeRoot);
    localeRoot.querySelectorAll(':scope > ul > li').forEach((group) => {
      const li = document.createElement('li');
      li.className = 'nav-locale-group';
      const img = group.querySelector('img');
      if (img) li.append(img);
      const name = document.createElement('span');
      name.className = 'nav-locale-name';
      name.textContent = ownText(group);
      li.append(name);
      const languages = document.createElement('ul');
      languages.className = 'nav-locale-languages';
      group.querySelectorAll(':scope > ul > li > a').forEach((a) => {
        const item = document.createElement('li');
        const path = linkPath(a);
        const active = (path && here.startsWith(path))
          || a.textContent.trim().toLowerCase() === activeLabel.toLowerCase();
        if (active) {
          a.setAttribute('aria-current', 'true');
          activeLabel = a.textContent.trim();
          activeFlag = img;
        }
        item.append(a);
        languages.append(item);
      });
      li.append(languages);
      panel.append(li);
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-locale-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', panel.id);
    if (activeFlag) {
      const flag = activeFlag.cloneNode();
      flag.alt = '';
      toggle.append(flag);
    }
    const label = document.createElement('span');
    label.textContent = activeLabel;
    toggle.append(label);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      // aria-expanded is the single open state; CSS shows the panel from it
      const open = toggle.getAttribute('aria-expanded') === 'true';
      closeSearchResults(nav);
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    locale.append(toggle, panel);
    utility.append(locale);
  }
  return utility;
}

/**
 * Builds the brand area from the linked logo.
 * @param {Element} section
 * @returns {Element}
 */
function buildBrand(section) {
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const link = section.querySelector('a');
  if (link) {
    link.setAttribute('aria-label', link.querySelector('img')?.alt || 'Home');
    brand.append(link);
  } else {
    brand.append(...section.childNodes);
  }
  return brand;
}

/**
 * Builds the primary nav list and marks the current section.
 * @param {Element} section
 * @returns {Element}
 */
function buildSections(section, homePath) {
  const sections = document.createElement('div');
  sections.className = 'nav-sections';
  const list = section.querySelector('ul');
  if (list) {
    const here = currentPath();
    list.className = 'nav-list';
    list.querySelectorAll(':scope > li > a').forEach((a) => {
      a.classList.add('nav-trigger');
      const path = linkPath(a);
      // the home entry (same target as the logo) is shown in the mobile menu only
      if (path !== null && path === homePath) {
        a.parentElement.classList.add('nav-home');
        if (here === path) a.setAttribute('aria-current', 'page');
        return;
      }
      if (path && (here === path || here.startsWith(`${path}/`))) a.setAttribute('aria-current', 'page');
    });
    sections.append(list);
  }
  return sections;
}

let searchIndex;
async function loadSearchIndex() {
  if (!searchIndex) {
    searchIndex = fetch(SEARCH_INDEX)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (json.data || []).filter((row) => row.title && row.path))
      .catch(() => []);
  }
  return searchIndex;
}

/**
 * Renders a title with every occurrence of the term wrapped in <mark>.
 * @param {string} title
 * @param {string} term
 * @returns {DocumentFragment}
 */
function highlight(title, term) {
  const frag = document.createDocumentFragment();
  const lower = title.toLowerCase();
  let pos = 0;
  let idx = lower.indexOf(term);
  while (idx !== -1) {
    frag.append(title.slice(pos, idx));
    const mark = document.createElement('mark');
    mark.textContent = title.slice(idx, idx + term.length);
    frag.append(mark);
    pos = idx + term.length;
    idx = lower.indexOf(term, pos);
  }
  frag.append(title.slice(pos));
  return frag;
}

/**
 * Builds the search control from the tools section (icon + placeholder,
 * clear icon) with type-ahead results from the site query index.
 * @param {Element} section
 * @param {Element} nav
 * @returns {Element}
 */
function buildTools(section, nav) {
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  const paragraphs = [...section.querySelectorAll(':scope > p')];
  if (!paragraphs.length) return tools;

  const [labelP, clearP] = paragraphs;
  const placeholder = labelP.textContent.trim() || 'Search';
  const search = document.createElement('div');
  search.className = 'nav-search';

  const form = document.createElement('form');
  form.setAttribute('role', 'search');
  const icon = labelP.querySelector('img');
  if (icon) {
    icon.className = 'nav-search-icon';
    icon.alt = '';
    form.append(icon);
  }
  const label = document.createElement('label');
  label.className = 'nav-search-label';
  label.htmlFor = 'nav-search-input';
  label.textContent = placeholder;
  const input = document.createElement('input');
  input.type = 'search';
  input.id = 'nav-search-input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'nav-search-clear';
  clear.hidden = true;
  const clearImg = clearP?.querySelector('img');
  clear.setAttribute('aria-label', clearImg?.alt || 'Clear search');
  if (clearImg) {
    clearImg.alt = '';
    clear.append(clearImg);
  }
  form.append(label, input, clear);

  const results = document.createElement('ul');
  results.className = 'nav-search-results';
  results.hidden = true;

  const render = async () => {
    const term = input.value.trim().toLowerCase();
    clear.hidden = !input.value;
    search.classList.toggle('has-value', !!input.value);
    if (term.length < SEARCH_MIN_CHARS) {
      results.hidden = true;
      return;
    }
    const index = await loadSearchIndex();
    const matches = index.filter((row) => row.title.toLowerCase().includes(term))
      .slice(0, SEARCH_MAX_RESULTS);
    results.replaceChildren(...matches.map((row) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = row.path;
      a.append(highlight(row.title, term));
      li.append(a);
      return li;
    }));
    results.hidden = !matches.length;
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });
  input.addEventListener('focus', () => closeLocale(nav));
  clear.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = results.querySelector('a');
    if (first) window.location.href = first.href;
  });

  search.append(form, results);
  tools.append(search);
  return tools;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragmentSections = await fetchNavSections();
  block.textContent = '';
  if (!fragmentSections) return;

  const [utilitySection, brandSection, navSection, toolsSection] = fragmentSections;
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  const inner = document.createElement('div');
  inner.className = 'nav-bar-inner';

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));

  const brand = brandSection ? buildBrand(brandSection) : document.createElement('div');
  const homeLink = brand.querySelector('a');
  const homePath = homeLink ? linkPath(homeLink) : null;
  const sections = navSection ? buildSections(navSection, homePath) : document.createElement('div');
  const tools = toolsSection ? buildTools(toolsSection, nav) : document.createElement('div');
  const utility = utilitySection ? buildUtility(utilitySection, nav) : null;

  inner.append(brand, sections, tools, hamburger);
  bar.append(inner);
  if (utility) {
    const utilityBar = document.createElement('div');
    utilityBar.className = 'nav-utility-bar';
    utilityBar.append(utility);
    nav.append(utilityBar);
  }
  nav.append(bar);

  // close popups on outside click and Escape
  document.addEventListener('click', (e) => {
    if (!nav.querySelector('.nav-locale')?.contains(e.target)) closeLocale(nav);
    if (!nav.querySelector('.nav-search')?.contains(e.target)) closeSearchResults(nav);
    // tapping the pushed page closes the mobile drawer
    if (nav.getAttribute('aria-expanded') === 'true' && !isDesktop.matches
      && !sections.contains(e.target) && !hamburger.contains(e.target)) {
      toggleMenu(nav, false);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    closeLocale(nav);
    closeSearchResults(nav);
    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      hamburger.querySelector('button').focus();
    }
  });

  // reset open states when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    toggleMenu(nav, false);
    closeLocale(nav);
    closeSearchResults(nav);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // compact header with shadow once the page scrolls
  const onScroll = () => navWrapper.classList.toggle('is-scrolled', window.scrollY > 0);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
