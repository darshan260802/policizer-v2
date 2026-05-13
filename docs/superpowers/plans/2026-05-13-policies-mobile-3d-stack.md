# Policies Mobile 3D Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/policies` mobile carousel with a custom swipeable 3D stacked-card interaction that loops infinitely while keeping desktop behavior unchanged.

**Architecture:** Keep all policy business/data logic unchanged in `app/policies/page.tsx`. Replace only the `md:hidden` rendering block with a custom stacked-card presenter driven by `activeIndex` and pointer/touch swipe detection. Use modulo index math for looped navigation and preserve existing action handlers for each card.

**Tech Stack:** Next.js (App Router), React 19 hooks/state, TypeScript, Tailwind CSS, existing shadcn/ui card/button components.

---

## File Structure and Responsibilities

- **Modify:** `app/policies/page.tsx`
  - Remove mobile carousel imports/usage.
  - Add mobile stack state + gesture handlers.
  - Add helper functions for wrapped index math and card layering.
  - Keep desktop table (`md:block`) and policy action handlers untouched.

- **Create:** none

- **Validation commands:**
  - `npm run lint -- app/policies/page.tsx`
  - `npm run typecheck`
  - `npm run build`

### Task 1: Replace mobile carousel dependencies and add stack state

**Files:**
- Modify: `app/policies/page.tsx` (imports + state section)

- [ ] **Step 1: Remove carousel import and prepare stack constants**

```tsx
// remove:
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"

// add near other constants/types in page.tsx:
const MOBILE_STACK_VISIBLE_COUNT = 3
const MOBILE_SWIPE_THRESHOLD_PX = 45
const MOBILE_ANIMATION_LOCK_MS = 220
```

- [ ] **Step 2: Add mobile stack state and refs**

```tsx
const [mobileActiveIndex, setMobileActiveIndex] = useState(0)
const [mobileDragDeltaX, setMobileDragDeltaX] = useState(0)
const [mobileIsDragging, setMobileIsDragging] = useState(false)
const [mobileIsAnimating, setMobileIsAnimating] = useState(false)
const mobileDragStartXRef = useRef<number | null>(null)
const mobileAnimationLockRef = useRef<number | null>(null)
```

- [ ] **Step 3: Add lifecycle cleanup for animation lock timer**

```tsx
useEffect(() => {
  return () => {
    if (mobileAnimationLockRef.current !== null) {
      window.clearTimeout(mobileAnimationLockRef.current)
    }
  }
}, [])
```

- [ ] **Step 4: Commit**

```bash
git add app/policies/page.tsx
git commit -m "feat: add mobile policy stack interaction state"
```

### Task 2: Implement wrapped index math and swipe handlers

**Files:**
- Modify: `app/policies/page.tsx` (helper functions inside `PoliciesPage`)

- [ ] **Step 1: Add wrapped index helper**

```tsx
const getWrappedIndex = useCallback((index: number, length: number) => {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}, [])
```

- [ ] **Step 2: Add helper to move active card with animation lock**

```tsx
const advanceMobileStack = useCallback(
  (direction: "next" | "prev") => {
    if (policyList.length < 2 || mobileIsAnimating) return

    setMobileIsAnimating(true)
    setMobileActiveIndex((prev) =>
      direction === "next"
        ? getWrappedIndex(prev + 1, policyList.length)
        : getWrappedIndex(prev - 1, policyList.length)
    )

    mobileAnimationLockRef.current = window.setTimeout(() => {
      setMobileIsAnimating(false)
      mobileAnimationLockRef.current = null
    }, MOBILE_ANIMATION_LOCK_MS)
  },
  [getWrappedIndex, mobileIsAnimating, policyList.length]
)
```

- [ ] **Step 3: Add pointer/touch drag handlers**

```tsx
const handleMobilePointerDown = useCallback((clientX: number) => {
  if (policyList.length < 2 || mobileIsAnimating) return
  mobileDragStartXRef.current = clientX
  setMobileDragDeltaX(0)
  setMobileIsDragging(true)
}, [mobileIsAnimating, policyList.length])

const handleMobilePointerMove = useCallback((clientX: number) => {
  const start = mobileDragStartXRef.current
  if (!mobileIsDragging || start === null) return
  setMobileDragDeltaX(clientX - start)
}, [mobileIsDragging])

const handleMobilePointerEnd = useCallback(() => {
  if (!mobileIsDragging) return
  const delta = mobileDragDeltaX
  mobileDragStartXRef.current = null
  setMobileIsDragging(false)
  setMobileDragDeltaX(0)

  if (Math.abs(delta) < MOBILE_SWIPE_THRESHOLD_PX) return
  if (delta < 0) {
    advanceMobileStack("next")
  } else {
    advanceMobileStack("prev")
  }
}, [advanceMobileStack, mobileDragDeltaX, mobileIsDragging])
```

- [ ] **Step 4: Commit**

```bash
git add app/policies/page.tsx
git commit -m "feat: add custom swipe gesture logic for mobile policy stack"
```

### Task 3: Replace mobile carousel markup with layered 3D stack UI

**Files:**
- Modify: `app/policies/page.tsx` (current `md:hidden` block around existing `<Carousel>` markup)

- [ ] **Step 1: Replace mobile carousel with stack container**

```tsx
<div className="md:hidden">
  <div className="relative h-[430px] select-none">
    {policyList.map((policy, index) => {
      const length = policyList.length
      const relative = getWrappedIndex(index - mobileActiveIndex, length)
      const isVisible = relative < MOBILE_STACK_VISIBLE_COUNT
      const isTop = relative === 0

      if (!isVisible) return null

      const yOffset = relative * 14
      const scale = 1 - relative * 0.04
      const opacity = 1 - relative * 0.15
      const dragRotate = isTop && mobileIsDragging ? mobileDragDeltaX / 30 : 0
      const dragTranslate = isTop && mobileIsDragging ? mobileDragDeltaX : 0

      return (
        <div
          key={policy.id}
          className="absolute inset-x-0 top-0 transition-all duration-200 ease-out"
          style={{
            zIndex: 50 - relative,
            transform: `translateY(${yOffset}px) translateX(${dragTranslate}px) scale(${scale}) rotate(${dragRotate}deg)`,
            opacity,
            pointerEvents: isTop ? "auto" : "none",
          }}
        >
          {/* existing Card content/actions reused unchanged */}
        </div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 2: Attach swipe handlers only on top card wrapper**

```tsx
onPointerDown={(event) => handleMobilePointerDown(event.clientX)}
onPointerMove={(event) => handleMobilePointerMove(event.clientX)}
onPointerUp={handleMobilePointerEnd}
onPointerCancel={handleMobilePointerEnd}
onPointerLeave={handleMobilePointerEnd}
```

- [ ] **Step 3: Preserve existing card body/actions exactly**

```tsx
// Keep existing InfoPair grid and buttons:
// - View -> openViewDrawer(policy)
// - Edit -> openEditDrawer(policy)
// - Delete -> setPolicyToDelete(policy)
// - Mark paid -> handleMarkAsPaid(policy) with existing disabled/loading logic
```

- [ ] **Step 4: Commit**

```bash
git add app/policies/page.tsx
git commit -m "feat: replace mobile policy carousel with 3d stacked swipe cards"
```

### Task 4: Edge-case guards and regression checks

**Files:**
- Modify: `app/policies/page.tsx` (small guards around active index + data length)

- [ ] **Step 1: Keep active index valid when policy list changes**

```tsx
useEffect(() => {
  if (policyList.length === 0) {
    setMobileActiveIndex(0)
    return
  }
  setMobileActiveIndex((prev) => getWrappedIndex(prev, policyList.length))
}, [getWrappedIndex, policyList.length])
```

- [ ] **Step 2: Ensure single-item mode is static**

```tsx
const mobileSwipeEnabled = policyList.length > 1
// guard pointer handlers and advance logic with this
```

- [ ] **Step 3: Run project checks**

Run: `npm run lint -- app/policies/page.tsx`  
Expected: no lint errors in modified file

Run: `npm run typecheck`  
Expected: TypeScript completes with no new type errors

Run: `npm run build`  
Expected: successful production build

- [ ] **Step 4: Manual UX checks**

1. Open `/policies` on mobile viewport.
2. Confirm top 3 cards are visibly stacked.
3. Swipe left repeatedly and confirm loop wraps from last to first.
4. Swipe right repeatedly and confirm loop wraps from first to last.
5. Confirm View/Edit/Delete/Mark paid still work from top card.
6. Confirm desktop (`md+`) table remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/policies/page.tsx
git commit -m "fix: finalize mobile stacked policy cards loop and safeguards"
```

