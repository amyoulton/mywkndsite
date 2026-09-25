# table-trip-facts

Custom **table** block. Purpose: trip-facts.

## Authoring (Document Authoring)

Model: `standalone`

One row per fact, 2 cells: label | value. No header row. Rows with a single
filled cell render as a value only; extra cells are folded into the value.

## Supported variations

- *(default)*: the facts fill the full content width on phones/tablets (wrapping
  row) and the full 3/12 sidebar on desktop, starting at the sidebar edge.
  Source: climbing-new-zealand, beervana-portland, cycling-tuscany,
  downhill-skiing-wyoming, ski-touring-mont-blanc, whistler-mountain-biking,
  riverside-camping-australia, surf-camp-costa-rica.
- `inset` (`Table Trip Facts (inset)`): the facts sit in a nested grid column:
  7/12 wide on phones, 9/12 on tablets, and inside the 14px section gutter on
  desktop. Source: bali-surf-camp, colorado-rock-climbing, yosemite-backpacking,
  cycling-southern-utah, gastronomic-marais-tour, tahoe-skiing,
  west-coast-cycling, napa-wine-tasting (on wknd.site the content fragment
  carries `aem-GridColumn--phone--7` inside a nested `.aem-Grid`).

## Universal Editor fields

N/A (Document Authoring project)
