/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import tableTripFactsParser from './parsers/table-trip-facts.js';
import tabsAdventureParser from './parsers/tabs-adventure.js';

// TRANSFORMER IMPORTS
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';
import wkndLinksTransformer from './transformers/wknd-links.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'table-trip-facts': tableTripFactsParser,
  'tabs-adventure': tabsAdventureParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'adventures',
  description: 'Adventure detail page: hero image carousel, title, trip facts sidebar and Overview/Itinerary/What to Bring tabs',
  urls: [
    'https://wknd.site/us/en/adventures/bali-surf-camp.html',
    'https://wknd.site/us/en/adventures/beervana-portland.html',
    'https://wknd.site/us/en/adventures/climbing-new-zealand.html',
    'https://wknd.site/us/en/adventures/colorado-rock-climbing.html',
    'https://wknd.site/us/en/adventures/cycling-southern-utah.html',
    'https://wknd.site/us/en/adventures/cycling-tuscany.html',
    'https://wknd.site/us/en/adventures/downhill-skiing-wyoming.html',
    'https://wknd.site/us/en/adventures/gastronomic-marais-tour.html',
    'https://wknd.site/us/en/adventures/napa-wine-tasting.html',
    'https://wknd.site/us/en/adventures/riverside-camping-australia.html',
    'https://wknd.site/us/en/adventures/ski-touring-mont-blanc.html',
    'https://wknd.site/us/en/adventures/surf-camp-costa-rica.html',
    'https://wknd.site/us/en/adventures/tahoe-skiing.html',
    'https://wknd.site/us/en/adventures/west-coast-cycling.html',
    'https://wknd.site/us/en/adventures/whistler-mountain-biking.html',
    'https://wknd.site/us/en/adventures/yosemite-backpacking.html',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['.carousel.panelcontainer.cmp-carousel--mini'] },
    { name: 'table-trip-facts', instances: ['main.cmp-layout-container--fixed .contentfragment.cmp-contentfragment--elements'] },
    { name: 'tabs-adventure', instances: ['main.cmp-layout-container--fixed .tabs.panelcontainer'] },
  ],
  sections: [
    {
      id: '1',
      name: 'Breadcrumb',
      selector: ['.breadcrumb.cmp-breadcrumb--fixed'],
      style: null,
      blocks: [],
      defaultContent: [],
    },
    {
      id: '2',
      name: 'Hero image slider',
      selector: ['.carousel.panelcontainer.cmp-carousel--mini'],
      style: null,
      blocks: ['carousel-hero'],
      defaultContent: [],
    },
    {
      id: '3',
      name: 'Adventure details',
      selector: ['main.cmp-layout-container--fixed'],
      style: 'adventure-details',
      blocks: ['table-trip-facts', 'tabs-adventure'],
      defaultContent: ['.title.cmp-title--underline h1'],
    },
  ],
};

// TRANSFORMER REGISTRY - cleanup must run before sections
// (sections drops the leading break left by the removed breadcrumb); links run last
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
 * Build the page Metadata block: title, description, keywords, and the
 * first hero carousel image as the page image (source has no og:image).
 * @param {Element} main - The element to append the block to
 * @param {Document} document - The DOM document
 * @param {string|null} heroImageSrc - First carousel image src, captured before parsing
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

    // Capture the page image before the carousel is replaced by its parser
    const heroImg = document.querySelector('.carousel.panelcontainer.cmp-carousel--mini .cmp-carousel__item img');
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

    // 4. afterTransform (final cleanup + Section Metadata + internal links)
    executeTransformers('afterTransform', main, payload);

    // 5. Metadata + built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    createMetadataBlock(main, document, heroImageSrc);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: /us/en/adventures/<slug>.html -> /us/en/adventures/<slug>
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
