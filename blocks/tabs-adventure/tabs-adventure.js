import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

let instance = 0;

function hasContent(el) {
  return !!el && (el.textContent.trim() !== '' || !!el.querySelector('picture, img'));
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PICTURE', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR']);

// Some authored panels are a bare text node with no <p> (e.g. an Itinerary that is one
// paragraph). Wrap runs of loose inline content in <p> so every panel has the same flow.
function wrapLooseContent(panel) {
  let para = null;
  [...panel.childNodes].forEach((node) => {
    const isInline = node.nodeType === Node.TEXT_NODE
      || (node.nodeType === Node.ELEMENT_NODE && !BLOCK_TAGS.has(node.tagName));
    if (!isInline) {
      para = null;
      return;
    }
    if (!para && !node.textContent.trim() && !(node.querySelector && node.querySelector('img'))) {
      node.remove(); // drop whitespace between block elements
      return;
    }
    if (!para) {
      para = document.createElement('p');
      node.before(para);
    }
    para.append(node);
  });
}

// Authors mark sub-headings two ways: <h2> (optionally wrapping <strong>) or a paragraph whose
// only content is bold text (<p><strong>Day 1</strong></p>). Tag both, plus image-only
// paragraphs, so layout/design can treat them consistently without rewriting the markup.
function classifyPanelContent(panel) {
  panel.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')
    .forEach((heading) => heading.classList.add('tabs-adventure-subheading'));
  panel.querySelectorAll(':scope > p').forEach((p) => {
    const elements = [...p.children];
    const text = p.textContent.trim();
    if (elements.length && elements.every((el) => el.tagName === 'PICTURE' || el.tagName === 'IMG') && !text) {
      p.classList.add('tabs-adventure-image');
    } else if (elements.length === 1 && ['STRONG', 'B'].includes(elements[0].tagName)
      && text && text === elements[0].textContent.trim()) {
      p.classList.add('tabs-adventure-subheading');
    }
  });
}

function selectTab(block, button, focus = false) {
  block.querySelectorAll('.tabs-adventure-tab').forEach((btn) => {
    const selected = btn === button;
    btn.setAttribute('aria-selected', selected);
    btn.setAttribute('tabindex', selected ? '0' : '-1');
  });
  block.querySelectorAll('.tabs-adventure-panel').forEach((panel) => {
    panel.setAttribute('aria-hidden', panel.id !== button.getAttribute('aria-controls'));
  });
  if (focus) button.focus();
}

export default function decorate(block) {
  instance += 1;

  const tablist = document.createElement('div');
  tablist.className = 'tabs-adventure-list';
  tablist.setAttribute('role', 'tablist');

  const panels = [];
  const usedIds = new Set();

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.some(hasContent)) return; // skip empty rows

    // Cell 1 = label, remaining cells = panel content. If only one cell exists,
    // treat it as content and synthesize a label.
    let labelCell = cells.length > 1 ? cells[0] : null;
    const contentCells = cells.length > 1 ? cells.slice(1) : cells;
    if (labelCell && !labelCell.textContent.trim()) labelCell = null;
    if (!contentCells.some(hasContent)) return; // a label with no panel content is not a tab

    const index = panels.length;
    const labelText = labelCell ? labelCell.textContent.trim() : `Tab ${index + 1}`;
    let slug = toClassName(labelText) || `tab-${index + 1}`;
    while (usedIds.has(slug)) slug = `${slug}-${index + 1}`;
    usedIds.add(slug);
    const tabId = `tabs-adventure-${instance}-tab-${slug}`;
    const panelId = `tabs-adventure-${instance}-panel-${slug}`;

    const panel = document.createElement('div');
    panel.className = 'tabs-adventure-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.setAttribute('tabindex', '0');
    contentCells.forEach((cell) => {
      while (cell.firstChild) panel.append(cell.firstChild);
    });
    wrapLooseContent(panel);

    panel.querySelectorAll('picture > img').forEach((img) => {
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 900px)', width: '1200' },
        { width: '750' },
      ]));
    });
    classifyPanelContent(panel);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-adventure-tab';
    button.id = tabId;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    if (labelCell) {
      // Keep inline formatting but drop wrapping paragraphs.
      const para = labelCell.querySelector(':scope > p');
      const single = labelCell.children.length === 1 && para;
      button.innerHTML = single ? para.innerHTML : labelCell.innerHTML;
    } else {
      button.textContent = labelText;
    }
    button.addEventListener('click', () => selectTab(block, button));

    tablist.append(button);
    panels.push(panel);
  });

  if (!panels.length) {
    block.replaceChildren();
    return;
  }

  // Arrow/Home/End keyboard navigation between tabs.
  tablist.addEventListener('keydown', (e) => {
    const tabs = [...tablist.querySelectorAll('.tabs-adventure-tab')];
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let target = null;
    if (e.key === 'ArrowRight') target = tabs[(current + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') target = tabs[(current - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') [target] = tabs;
    else if (e.key === 'End') target = tabs[tabs.length - 1];
    if (target) {
      e.preventDefault();
      selectTab(block, target, true);
    }
  });

  block.replaceChildren(tablist, ...panels);
  selectTab(block, tablist.firstElementChild);
}
