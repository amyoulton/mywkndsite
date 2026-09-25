/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 * All selectors verified in migration-work/cleaned.html (bali-surf-camp adventure page).
 *
 * Preserved (authorable, handled by parsers):
 *  - .carousel.panelcontainer.cmp-carousel--mini (carousel-hero)
 *  - .contentfragment.cmp-contentfragment--elements (table-trip-facts)
 *  - .tabs.panelcontainer (tabs-adventure)
 *  - .title.cmp-title--underline h1 (default content)
 *
 * Note: no cookie/consent banner markup exists in the captured DOM, so no
 * consent selectors are included (never guess selectors).
 * Must not remove bare <hr> (section breaks from wknd-sections.js).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

const SHARE_TITLE_RE = /^\s*share this (adventure|story)\s*$/i;

/**
 * Magazine article normalization (template "magazine"; no blocks, all default content).
 * Every selector below only exists on magazine article pages - verified in
 * migration-work/cleaned.html (arctic-surfing) and migration-work/siblings/*.html.
 * Adventures uses <div class="contentfragment ...">, not <article>, and has no
 * byline / up-next / download components, so adventures + home are unaffected.
 */
function normalizeMagazineArticle(element, document) {
  // 1. Hidden duplicate title inside the article content fragment:
  //    <article class="contentfragment"><article class="cmp-contentfragment ...">
  //      <h3 class="cmp-contentfragment__title">...</h3>
  WebImporter.DOMUtils.remove(element, ['article.contentfragment h3.cmp-contentfragment__title']);

  // 2. Byline "By <name>": <div class="title"><div class="cmp-title">
  //    <h4 class="cmp-title__text">By Jacob Wester</h4> directly before
  //    <article class="contentfragment">. Convert to <p> so headings go H1 -> H2.
  element.querySelectorAll('.title h4.cmp-title__text').forEach((h4) => {
    const wrapper = h4.closest('.title');
    const next = wrapper && wrapper.nextElementSibling;
    if (!next || !next.matches('article.contentfragment')) return;
    const p = document.createElement('p');
    p.innerHTML = h4.innerHTML;
    h4.replaceWith(p);
  });

  // 3. Up-next list: <div class="list cmp-list--upnext"><ul class="cmp-list">
  //    <li class="cmp-list__item"><a class="cmp-list__item-link" href="...">
  //      <span class="cmp-list__item-title">T</span><span class="cmp-list__item-date">D</span></a></li>
  //    -> <li><a href="...">T</a><br>D</li>
  element.querySelectorAll('.cmp-list--upnext li.cmp-list__item').forEach((li) => {
    const link = li.querySelector('a.cmp-list__item-link');
    if (!link) return;
    const title = link.querySelector('.cmp-list__item-title');
    const date = link.querySelector('.cmp-list__item-date');
    const a = document.createElement('a');
    a.setAttribute('href', link.getAttribute('href') || '');
    a.textContent = (title ? title.textContent : link.textContent).trim();
    li.textContent = '';
    li.append(a);
    const dateText = date ? date.textContent.trim() : '';
    if (dateText) {
      li.append(document.createElement('br'));
      li.append(document.createTextNode(dateText));
    }
  });

  // 4. Download box (guide-la-skateparks only): <div class="download"><div class="cmp-download">
  //    h3.cmp-download__title > a.cmp-download__title-link, .cmp-download__description > p,
  //    dl.cmp-download__properties, a.cmp-download__action > span.cmp-download__action-text.
  //    Keep title link + description; the metadata list (dd.cmp-download__property-content:
  //    filename / size / format) becomes ONE plain <p> joined with " · ", placed where the
  //    <dl> was (after the description, before the action); the action link is
  //    kept as a plain bold link (per authoring analysis 5.2).
  //    Order h3 -> description p -> details p -> button p is relied on by styles.css.
  //    Empty wrapper <div class="download"></div> (western-australia) is removed.
  element.querySelectorAll('.download').forEach((dl) => {
    if (!dl.querySelector('.cmp-download')) dl.remove();
  });
  element.querySelectorAll('.cmp-download').forEach((box) => {
    box.querySelectorAll('dl.cmp-download__properties').forEach((props) => {
      const values = [...props.querySelectorAll('.cmp-download__property-content')]
        .map((dd) => dd.textContent.trim())
        .filter(Boolean);
      if (!values.length) {
        props.remove();
        return;
      }
      const p = document.createElement('p');
      p.textContent = values.join(' · ');
      props.replaceWith(p);
    });
    box.querySelectorAll('a.cmp-download__action').forEach((action) => {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      const a = document.createElement('a');
      a.setAttribute('href', action.getAttribute('href') || '');
      a.textContent = action.textContent.trim();
      strong.append(a);
      p.append(strong);
      action.replaceWith(p);
    });
  });

  // 5. Author bio: <div class="experiencefragment"> ... <div class="cmp-byline">
  //    (avatar img, h2.cmp-byline__name, p.cmp-byline__occupations) followed by
  //    <div class="buildingblock ... cmp-buildingblock--btn-list"> with icon-only
  //    <a class="cmp-button" href="#..."><span class="cmp-button__icon ..."></span>
  //    <span class="cmp-button__text">Facebook</span></a>.
  //    -> one <p> of plain text links: <a href="#">Facebook</a> <a href="#">Twitter</a> ...
  //    Scoped to the XF that contains .cmp-byline (the footer btn-list is untouched).
  element.querySelectorAll('.experiencefragment').forEach((xf) => {
    if (!xf.querySelector('.cmp-byline')) return;
    xf.querySelectorAll('.cmp-buildingblock--btn-list').forEach((list) => {
      const buttons = [...list.querySelectorAll('a.cmp-button')];
      if (!buttons.length) return;
      const p = document.createElement('p');
      buttons.forEach((btn, idx) => {
        const textEl = btn.querySelector('.cmp-button__text');
        const text = (textEl ? textEl.textContent : btn.textContent).trim()
          || btn.getAttribute('aria-label') || '';
        if (!text) return;
        const a = document.createElement('a');
        a.setAttribute('href', btn.getAttribute('href') || '#');
        a.textContent = text;
        if (idx > 0 && p.childNodes.length) p.append(document.createTextNode(' '));
        p.append(a);
      });
      list.replaceWith(p);
    });
  });
}

function hasMeaningfulContent(el) {
  if (el.textContent.replace(/ /g, ' ').trim() !== '') return true;
  return !!el.querySelector('img, picture, video, table, iframe, hr');
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Non-content widgets that could confuse block matching.
    // Found: <iframe id="destination_publishing_iframe_wkndsite_0" class="aamIframeLoaded">
    // Found: <div id="toggleNav">, <div id="mobileNav" class="cmp-navigation--mobile">
    WebImporter.DOMUtils.remove(element, [
      'iframe.aamIframeLoaded',
      '#toggleNav',
      '#mobileNav',
    ]);

    // "Share this Adventure" (adventures) / "SHARE THIS STORY" (magazine sidebar) heading:
    // <div class="title ..."><div class="cmp-title"><h5 class="cmp-title__text">
    // immediately precedes <div class="sharing ...">. Remove heading + sharing widget.
    // Magazine: verified on all 5 articles (ski-touring's title wrapper has no
    // cmp-title--black class, still matched via .title).
    element.querySelectorAll('.sharing').forEach((sharing) => {
      const prev = sharing.previousElementSibling;
      if (prev && prev.classList.contains('title')
        && SHARE_TITLE_RE.test(prev.textContent)) {
        prev.remove();
      }
      sharing.remove();
    });
    element.querySelectorAll('.title .cmp-title__text').forEach((h) => {
      if (SHARE_TITLE_RE.test(h.textContent)) {
        const wrapper = h.closest('.title');
        if (wrapper) wrapper.remove();
      }
    });

    // Primary CTA buttons in default content ("All Articles", "All Trips"):
    // <div class="button cmp-button--primary"><a class="cmp-button"><span class="cmp-button__text">
    // -> <p><strong><a href>text</a></strong></p> so EDS decorates them as primary buttons.
    const doc = element.ownerDocument || document;
    element.querySelectorAll('.button.cmp-button--primary a.cmp-button').forEach((btn) => {
      const textEl = btn.querySelector('.cmp-button__text');
      const text = (textEl ? textEl.textContent : btn.textContent).trim();
      if (!text) return;
      const p = doc.createElement('p');
      const strong = doc.createElement('strong');
      const a = doc.createElement('a');
      a.setAttribute('href', btn.getAttribute('href') || '');
      a.textContent = text;
      strong.append(a);
      p.append(strong);
      btn.replaceWith(p);
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Magazine article default-content normalization (no-op on adventures/home).
    normalizeMagazineArticle(element, element.ownerDocument || document);

    // Site chrome.
    // Found: <header class="experiencefragment cmp-experiencefragment--header ...">
    // Found: <footer class="experiencefragment cmp-experiencefragment--footer ...">
    // Found: <div class="languagenavigation cmp-languagenavigation--default ...">
    // Found: <div class="breadcrumb cmp-breadcrumb--fixed ..."><nav class="cmp-breadcrumb">
    // Found: <div class="sign-in-buttons ...">, <div class="search cmp-search--header ...">
    // Found: <div class="navigation cmp-navigation--header ...">
    WebImporter.DOMUtils.remove(element, [
      'header.experiencefragment',
      '.cmp-experiencefragment--header',
      'footer.experiencefragment',
      '.cmp-experiencefragment--footer',
      '.languagenavigation',
      '.sign-in-buttons',
      '.search.cmp-search--header',
      '.navigation.cmp-navigation--header',
      '.breadcrumb',
      '.sharing',
      '#toggleNav',
      '#mobileNav',
    ]);

    // Safe, non-authorable elements.
    WebImporter.DOMUtils.remove(element, ['script', 'noscript', 'iframe', 'link', 'style']);

    // AEM separator components (home): <div class="separator ..."><div class="cmp-separator">
    // <hr class="cmp-separator__horizontal-rule"></div></div> - one before "Next Adventures",
    // one at the end of main content (plus a hidden one in the footer).
    // wknd-sections.js inserts its own bare <hr> breaks, so these would create doubled
    // breaks / empty sections. Removed in afterTransform (NOT beforeTransform) because the
    // home "Next Adventures" section selector is `.separator + .title.cmp-title--underline`
    // and must still resolve when wknd-sections.js places breaks in beforeTransform.
    // Only targets the separator wrapper / classed rule - never bare <hr> section breaks.
    // Adventures pages only contain the footer separator, already removed with the footer.
    WebImporter.DOMUtils.remove(element, ['.separator', 'hr.cmp-separator__horizontal-rule']);

    // Empty AEM grid wrappers, e.g. <div><div class="aem-Grid aem-Grid--12 ..."></div></div>
    // inside tab panel content fragments.
    element.querySelectorAll('.aem-Grid').forEach((grid) => {
      if (hasMeaningfulContent(grid)) return;
      const parent = grid.parentElement;
      grid.remove();
      if (parent && parent !== element && parent.tagName === 'DIV'
        && parent.attributes.length === 0 && !hasMeaningfulContent(parent)) {
        parent.remove();
      }
    });

    // Tracking/data-layer attributes present on the source DOM.
    element.querySelectorAll('[data-cmp-data-layer]').forEach((el) => {
      el.removeAttribute('data-cmp-data-layer');
    });
  }
}
