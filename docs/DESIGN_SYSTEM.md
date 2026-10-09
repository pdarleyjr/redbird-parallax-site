# Red Bird design system

| Variable | Value | Role |
|---|---|---|
| --rb-bg | #0b0e1d | Midnight navy background |
| --rb-surface | #141828 | Cards, map section, footer |
| --rb-elevated | #1a1f3a | Elevated/empty surfaces |
| --rb-accent | #ff7a1a | Primary actions and stop numbers |
| --rb-accent-hover | #ff5a00 | Action hover |
| --rb-highlight | #ffb54d | Labels, links and focus |
| --rb-text | #ffffff | Primary text |
| --rb-muted | #a8b0c0 | Secondary text |
| --rb-button-text | #0b0e1d | Dark text on orange |

assets/css/styles.css is the only active stylesheet. --first-color, --body-color and --container-color point to Red Bird variables. Original illustration colors remain intact.

Headings: self-hosted Poppins Bold with fluid sizing. Body: system UI, 1.65 line height. Main width: 1200 px maximum with fluid gutters. Component radii: 1–1.25 rem; illustration corners: 2 rem desktop/1.25 rem phones. Primary controls: at least 44 px; hero/map/search controls: 48 px. Focus: 3 px amber outline, 5 px offset.

Layouts adapt at 359, 699, 959, 1100 and 1600 px. Hero/map stack on phones; directory uses 1/2/3 columns. Image ratios are preserved; icons use object-fit: contain. Motion is limited to native transitions and smooth anchor scrolling, disabled under reduced motion. Vital content is always visible.

Automated contrast/accessibility results and manual limits are in QA-REPORT-2026.md.
