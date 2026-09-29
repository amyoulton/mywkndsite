# Plan: New Page from a Figma Design

## Overview
You want a new page built from a Figma design. You've approved turning on the Figma integration. I'm in planning mode, so I can't change any project files yet. Enabling the integration is the first step once you switch to Execute mode.

## Current State
- **Figma integration:** approved by you, not yet enabled
- **Figma design link:** not provided yet (needed after the integration is on)
- **Target page path/name:** not decided yet
- **Existing site:** the WKND US English site has already been migrated. The new page will reuse its existing blocks and styling where they fit.

## Approach
1. **Enable the Figma integration.** Add the Figma plugin to the project's agent settings. It becomes available on your next message.
2. **Collect the design details.** Ask for the Figma file or frame link, the page path it should go to, and whether it should match the existing WKND look or bring in new styling from Figma.
3. **Extract design and content.** Pull the page layout, text, images and design tokens from the Figma frame.
4. **Map to blocks.** Match each Figma section to an existing block (hero, cards, columns, etc.) or mark it as needing a new block or variant.
5. **Build blocks and styling.** Create or adjust blocks and CSS to match the design, keeping styles limited to each block.
6. **Generate the page content.** Produce the page through the project's import process rather than hand-writing HTML.
7. **Preview and compare.** Check the rendered page in the preview on desktop and mobile against the Figma design, then fix any differences.
8. **Wrap up.** Summarize what was built and, if you want, prepare a branch and PR with the required preview link.

## Checklist
- [ ] Switch to Execute mode (required before any changes)
- [ ] Enable the Figma integration in the project's agent settings
- [ ] Send one more message so the integration loads
- [ ] Provide the Figma file/frame link
- [ ] Confirm the target page path and the styling approach (existing WKND vs. Figma-driven)
- [ ] Extract layout, content, images and design tokens from Figma
- [ ] Map Figma sections to existing blocks and list any new blocks or variants needed
- [ ] Build or update blocks and CSS
- [ ] Generate the page content through the import process
- [ ] Check the preview on desktop and mobile against the Figma design
- [ ] Fix any visual or structural differences
- [ ] (Optional) Create a branch and PR with the `{branch}--mywkndsite--amyoulton.aem.page/{path}` preview link

## Notes
- Execution requires Execute mode. Once you switch, I'll enable the Figma integration and stop there. On your next message the Figma tools will be ready and I'll continue from step 2.
