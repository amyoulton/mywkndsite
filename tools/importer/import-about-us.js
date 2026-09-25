/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsFeaturedParser from './parsers/columns-featured.js';
import cardsContributorParser from './parsers/cards-contributor.js';
import cardsListingParser from './parsers/cards-listing.js';
import cardsMembersParser from './parsers/cards-members.js';

// TRANSFORMER IMPORTS
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';
import wkndLinksTransformer from './transformers/wknd-links.js';

// PARSER REGISTRY
const parsers = {
  'columns-featured': columnsFeaturedParser,
  'cards-contributor': cardsContributorParser,
  'cards-listing': cardsListingParser,
  'cards-members': cardsMembersParser,
};

// Shared selector prefix: direct children of the fixed-width content grid
const GRID = 'main.cmp-layout-container--fixed > .cmp-container > .aem-Grid > ';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
// about-us and magazine listing share this template but no blocks, so every
// block and section is optional per page.
const PAGE_TEMPLATE = {
  name: 'about-us',
  description: 'About Us and Magazine listing: H1 title with underlined H2 groups; about-us has contributor/guide profile cards, magazine has featured article, All Articles cards and members-only teasers (all blocks optional per page)',
  urls: [
    'https://wknd.site/us/en/about-us.html',
    'https://wknd.site/us/en/magazine.html',
  ],
  blocks: [
    { name: 'columns-featured', instances: [`${GRID}.teaser.cmp-teaser--featured`] },
    { name: 'cards-contributor', instances: [`${GRID}:not(section.cmp-experience-fragment--contributor) + section.cmp-experience-fragment--contributor`] },
    { name: 'cards-listing', instances: [`${GRID}.image-list.list`] },
    { name: 'cards-members', instances: [`${GRID}:not(.cmp-teaser--secure) + .teaser.cmp-teaser--secure`] },
  ],
  sections: [
    {
      id: '1',
      name: 'Page title (+ featured article on magazine)',
      selector: [`${GRID}.title:not(.cmp-title--underline)`],
      style: null,
      blocks: ['columns-featured'],
      defaultContent: [`${GRID}.title:not(.cmp-title--underline) h1`],
    },
    {
      id: '2',
      name: 'Our Contributors',
      selector: [`${GRID}.title:not(.cmp-title--underline) + .title.cmp-title--underline`],
      style: 'small-text',
      blocks: ['cards-contributor'],
      defaultContent: [
        `${GRID}.title:not(.cmp-title--underline) + .title.cmp-title--underline h2`,
        `${GRID}.title.cmp-title--underline + .text`,
      ],
    },
    {
      id: '3',
      name: 'WKND Guides',
      selector: [`${GRID}section.cmp-experience-fragment--contributor + .title.cmp-title--underline`],
      style: 'small-text',
      blocks: ['cards-contributor'],
      defaultContent: [
        `${GRID}section.cmp-experience-fragment--contributor + .title.cmp-title--underline h2`,
        `${GRID}section.cmp-experience-fragment--contributor + .title.cmp-title--underline + .text`,
      ],
    },
    {
      id: '4',
      name: 'All Articles',
      selector: [`${GRID}.teaser.cmp-teaser--featured + .title.cmp-title--underline`],
      style: null,
      blocks: ['cards-listing'],
      defaultContent: [`${GRID}.teaser.cmp-teaser--featured + .title.cmp-title--underline h2`],
    },
    {
      id: '5',
      name: 'Members Only intro',
      selector: [`${GRID}.image-list.list + .title.cmp-title--underline`],
      style: null,
      blocks: [],
      defaultContent: [
        `${GRID}.image-list.list + .title.cmp-title--underline h2`,
        `${GRID}.image-list.list + .title.cmp-title--underline + .text`,
      ],
    },
    {
      id: '6',
      name: 'Members-only teasers',
      selector: [`${GRID}.separator + .teaser.cmp-teaser--secure`],
      style: 'divider-medium',
      blocks: ['cards-members'],
      defaultContent: [],
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
 * Build the page Metadata block: title, description, keywords and og:image
 * when present.
 * @param {Element} main - The element to append the block to
 * @param {Document} document - The DOM document
 */
function createMetadataBlock(main, document) {
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
  if (ogImage && ogImage.content) {
    const img = document.createElement('img');
    img.src = ogImage.content;
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

    // 1. beforeTransform (cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page (each is optional per page)
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
    createMetadataBlock(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: /us/en/about-us.html -> /us/en/about-us, /us/en/magazine.html -> /us/en/magazine
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
