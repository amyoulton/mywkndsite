/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroTeaserParser from './parsers/hero-teaser.js';
import cardsListingParser from './parsers/cards-listing.js';

// TRANSFORMER IMPORTS
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';
import wkndLinksTransformer from './transformers/wknd-links.js';

// PARSER REGISTRY
const parsers = {
  'hero-teaser': heroTeaserParser,
  'cards-listing': cardsListingParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'adventures-2',
  description: 'Adventures listing: H1 title, hero teaser banner, Current Adventures filterable card grid (cards-listing filter)',
  urls: [
    'https://wknd.site/us/en/adventures.html',
  ],
  blocks: [
    { name: 'hero-teaser', instances: ['.aem-Grid > .teaser.cmp-teaser--hero'] },
    { name: 'cards-listing', instances: ['main.cmp-layout-container--fixed .tabs.panelcontainer'] },
  ],
  sections: [
    {
      id: '1',
      name: 'Page title',
      selector: ['main.cmp-layout-container--fixed .title:not(.cmp-title--underline)'],
      style: null,
      blocks: [],
      defaultContent: ['main.cmp-layout-container--fixed h1.cmp-title__text'],
    },
    {
      id: '2',
      name: 'Hero teaser',
      selector: ['.aem-Grid > .teaser.cmp-teaser--hero'],
      style: null,
      blocks: ['hero-teaser'],
      defaultContent: [],
    },
    {
      id: '3',
      name: 'Current Adventures',
      selector: ['main.cmp-layout-container--fixed .title.cmp-title--underline'],
      style: 'divider-after',
      blocks: ['cards-listing'],
      defaultContent: ['main.cmp-layout-container--fixed .title.cmp-title--underline h2'],
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
 * Build the page Metadata block: title, description, keywords, and the hero
 * teaser image as the page image (source has no og:image).
 * @param {Element} main - The element to append the block to
 * @param {Document} document - The DOM document
 * @param {string|null} heroImageSrc - Hero teaser image src, captured before parsing
 */
function createMetadataBlock(main, document, heroImageSrc) {
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

    // Capture the page image before the hero teaser is replaced by its parser
    const heroImg = document.querySelector('.aem-Grid > .teaser.cmp-teaser--hero img');
    const heroImageSrc = heroImg ? heroImg.getAttribute('src') : null;

    // 1. beforeTransform (cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
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

    // 4. afterTransform (final cleanup + internal links)
    executeTransformers('afterTransform', main, payload);

    // 5. Metadata + built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    createMetadataBlock(main, document, heroImageSrc);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: /us/en/adventures.html -> /us/en/adventures
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
