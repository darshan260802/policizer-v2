# Policies Mobile 3D Stack Design

## Problem
On the `/policies` route, the mobile view currently renders policy cards in a standard carousel. The desired interaction is a stacked 3D card experience where cards are layered on top of each other, and horizontal swipes bring the next/previous card to the top in an infinite loop.

## Scope
- In scope: mobile-only (`md:hidden`) policy card presentation in `app/policies/page.tsx`.
- Out of scope: desktop/tablet table layout, policy data model, action handlers (View/Edit/Delete/Mark paid), backend behavior.

## Chosen Approach
Use a custom gesture-driven stack implementation (selected by user) rather than Embla carousel behavior.

Why:
- Gives direct control over stack depth, transforms, and interaction feel.
- Supports exact “top 3 cards with visible depth” requirement.

Trade-off:
- More custom interaction logic and edge-case handling than using existing carousel infrastructure.

## UX and Interaction Design
1. Render all policies in a mobile-only stack container.
2. Track `activeIndex` in local state.
3. Compute each card’s relative position from `activeIndex`:
   - Relative 0: active/top card.
   - Relative 1 and 2: visible background cards with reduced scale/opacity and Y offset.
   - Others: hidden/non-interactive.
4. Swipe behavior on the top card:
   - Swipe left: move to next policy.
   - Swipe right: move to previous policy.
5. Loop behavior:
   - `activeIndex` updates with modulo arithmetic to wrap seamlessly.
6. For `policyList.length < 2`, disable swipe transitions and keep static card rendering.

## Visual Design
- Active card: full scale, full opacity, highest z-index.
- 2nd card: slightly smaller, slightly lower opacity, shifted down a little.
- 3rd card: smaller than 2nd, lower opacity, shifted further down.
- Transition: smooth transform/opacity animation for perceived depth motion.

## Technical Design
- Keep existing `policyList.map` card content and buttons.
- Replace current mobile `<Carousel>` block with stack container markup.
- Add gesture state:
  - `dragStartX`, `dragCurrentX`, `isDragging` (or equivalent minimal state).
  - Swipe threshold in pixels to distinguish deliberate horizontal swipes from tap/scroll.
- Add transition guard:
  - Short lock (`isAnimating`) to avoid rapid multiple index updates during animation.
- Preserve existing action handlers and disabled/loading states.

## Accessibility and Usability
- Keep card actions as regular buttons.
- Preserve keyboard/click behavior for top card controls.
- Ensure hidden/background cards are non-focusable or pointer-disabled where needed.

## Error Handling and Edge Cases
- Empty list and loading states remain as currently implemented.
- One-item list renders without swipe index changes.
- If swipe distance is below threshold, snap back to current top card.

## Validation Criteria
- Mobile renders as 3D stacked cards (top 3 visible).
- Swiping left/right updates top card correctly.
- Card order loops infinitely in both directions.
- Existing card action buttons continue to work.
- Desktop table view remains unchanged.

