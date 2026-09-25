/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND internal link rewriting.
 * Internal links to migrated pages drop the host and the .html extension so
 * they match the EDS document paths produced by the import scripts:
 *   https://wknd.site/us/en/adventures.html -> /us/en/adventures
 *   /us/en/magazine/ski-touring.html#top    -> /us/en/magazine/ski-touring#top
 * AEM assets (/content/...) stay on the source host as absolute URLs, with the
 * AEM download selector dropped:
 *   /content/dam/.../guide.pdf.coredownload.pdf -> https://wknd.site/content/dam/.../guide.pdf
 * External links are left as-is.
 * Runs in afterTransform, once parsers have built the block tables.
 */
const SOURCE_HOSTS = ['wknd.site', 'www.wknd.site'];

function rewriteHref(href, baseUrl) {
  if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, baseUrl);
  } catch (e) {
    return null;
  }
  if (!SOURCE_HOSTS.includes(url.hostname)) return null;
  if (url.pathname.startsWith('/content/')) {
    url.pathname = url.pathname.replace(/\.coredownload(\.[a-z0-9]+)?$/i, '');
    return url.href;
  }
  if (!/\.html?$/.test(url.pathname)) return null;
  const path = url.pathname.replace(/\.html?$/, '');
  return `${path}${url.search}${url.hash}`;
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const baseUrl = (payload && payload.params && payload.params.originalURL) || 'https://wknd.site/';
  element.querySelectorAll('a[href]').forEach((a) => {
    const rewritten = rewriteHref(a.getAttribute('href'), baseUrl);
    if (rewritten) a.setAttribute('href', rewritten);
  });
}
