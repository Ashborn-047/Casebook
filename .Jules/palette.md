## 2025-05-14 - Focus States and Component Consistency
**Learning:** Neo-brutalist designs often prioritize high-contrast borders and shadows but can easily overlook keyboard focus indicators. Standard browser outlines clash with the aesthetic, so custom focus styles (like dashed borders or color shifts) are necessary to maintain accessibility without breaking the design language.
**Action:** Always include a custom `:focus-visible` state for `.brutal-btn` and form elements that matches the "thick border" theme.
