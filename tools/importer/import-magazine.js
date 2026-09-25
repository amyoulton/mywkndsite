/* eslint-disable */
/* global WebImporter */

// TRANSFORMER IMPORTS (template has no blocks - default content only)
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';
import wkndLinksTransformer from './transformers/wknd-links.js';

// PARSER REGISTRY
const parsers = {};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'magazine',
  description: 'Magazine article: hero image, H1 + byline and long-form body, author bio, sidebar with optional PDF download and up-next article list (default content only)',
  urls: [
    'https://wknd.site/us/en/magazine/arctic-surfing.html',
    'https://wknd.site/us/en/magazine/guide-la-skateparks.html',
    'https://wknd.site/us/en/magazine/san-diego-surf.html',
    'https://wknd.site/us/en/magazine/ski-touring.html',
    'https://wknd.site/us/en/magazine/western-australia.html',
  ],
  blocks: [],
  sections: [
    {
      id: '1',
      name: 'Article hero image',
      selector: ['main.cmp-layout-container--fixed > .cmp-container > .aem-Grid > .image'],
      style: null,
      blocks: [],
      defaultContent: ['main.cmp-layout-container--fixed > .cmp-container > .aem-Grid > .image img'],
    },
    {
      id: '2',
      name: 'Breadcrumb',
      selector: ['main.cmp-layout-container--fixed > .cmp-container > .aem-Grid > .breadcrumb'],
      style: null,
      blocks: [],
      defaultContent: [],
    },
    {
      id: '3',
      name: 'Article body',
      selector: ['main.cmp-layout-container--fixed main.container > .cmp-container > .title'],
      style: 'article',
      blocks: [],
      defaultContent: [
        'main.cmp-layout-container--fixed main.container .title h1',
        'main.cmp-layout-container--fixed main.container .title h4',
        'main.cmp-layout-container--fixed main.container .cmp-contentfragment__elements',
      ],
    },
    {
      id: '4',
      name: 'Author bio',
      selector: ['main.cmp-layout-container--fixed main.container .experiencefragment'],
      style: 'author-bio',
      blocks: [],
      defaultContent: ['.cmp-byline', '.cmp-byline ~ div a.cmp-button'],
    },
    {
      id: '5',
      name: 'Article sidebar',
      selector: ['aside.cmp-layoutcontainer--sidebar'],
      style: 'article-sidebar',
      blocks: [],
      defaultContent: [
        'aside.cmp-layoutcontainer--sidebar .download .cmp-download',
        'aside.cmp-layoutcontainer--sidebar .list.cmp-list--upnext ul',
      ],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup must run before sections; links run last
const transformers = [
  wkndCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [wkndSectionsTransformer] : []),
  wkndLinksTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Build the page Metadata block: title, description, keywords, author (from
 * the "By <name>" byline) and the hero image as the page image.
 * @param {Element} main - The element to append the block to
 * @param {Document} document - The DOM document
 * @param {Object} captured - Values captured before transformers ran
 */
function createMetadataBlock(main, document, { heroImageSrc, author }) {
  const meta = {};

  const title = document.querySelector('title');
  if (title && title.textContent.trim()) {
    meta.Title = title.textContent.replace(/[\n\t]/gm, '').trim();
  }

  const desc = document.querySelector('meta[name="description"]')
    || document.querySelector('meta[property="og:description"]');
  if (desc && desc.content) {
    meta.Description = desc.content;
  }

  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords && keywords.content) {
    meta.Keywords = keywords.content;
  }

  if (author) {
    meta.Author = author;
  }

  const ogImage = document.querySelector('meta[property="og:image"]');
  const imageSrc = (ogImage && ogImage.content) || heroImageSrc;
  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    meta.Image = img;
  }

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);
  return meta;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // Capture metadata sources before transformers normalize the DOM
    const heroImg = document.querySelector('main.cmp-layout-container--fixed > .cmp-container > .aem-Grid > .image img');
    const byline = document.querySelector('main.cmp-layout-container--fixed main.container .title h4');
    const captured = {
      heroImageSrc: heroImg ? heroImg.getAttribute('src') : null,
      author: byline ? byline.textContent.trim().replace(/^by\s+/i, '') : null,
    };

    // 1. beforeTransform (cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page (none for this template)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by an earlier parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (article normalization + Section Metadata + internal links)
    executeTransformers('afterTransform', main, payload);

    // 5. Metadata + built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    createMetadataBlock(main, document, captured);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: /us/en/magazine/<slug>.html -> /us/en/magazine/<slug>
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
