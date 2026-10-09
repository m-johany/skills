---
name: alignui
description: Build, compose, style, or scaffold React UI components using the AlignUI design system, Tailwind CSS, and Radix UI primitives. Use when implementing AlignUI components, applying AlignUI color and typography tokens, writing compound component variants with tailwind-variants, or setting up AlignUI in React, Next.js, or Remix projects.
---

# AlignUI Design System

Build and compose production-grade React components using AlignUI's design system tokens, Tailwind CSS utility classes, and compound component architecture.

AlignUI components follow four core conventions:
1. **Semantic Design Tokens**: Never use raw Tailwind palette colors (e.g., `bg-gray-100`). Always use AlignUI semantic tokens (`bg-bg-weak-50`, `text-text-sub-600`, `stroke-soft-200`).
2. **Tailwind Variants (`tv`)**: Component styles and slot structures are declared via `tv({ slots, variants, compoundVariants, defaultVariants })`.
3. **Compound Architecture with Recursive Cloning**: Multi-part components export a `Root` and child slots (e.g., `Icon`, `Item`). Children receive shared parent props (like `size` and `variant`) via `recursiveCloneChildren`.
4. **Polymorphic Elements**: Subcomponents like icons or triggers accept an `as` prop (typed via `PolymorphicComponentProps`) rather than hardcoding wrappers.

---

## 1. Quick Setup & Required Utilities

Every AlignUI project requires four foundational utilities in `@/utils/` and icons from `@remixicon/react`.

### Dependencies
```bash
npm install clsx tailwind-merge tailwind-variants @radix-ui/react-slot @remixicon/react
```

### Setup the Four Utilities

#### A. `@/utils/cn.ts`
Combines `clsx` and `tailwind-merge` configured with AlignUI typography class patterns:
```typescript
import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

export { type ClassValue } from 'clsx';

const typographyConfig = {
  title: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  label: ['xl', 'lg', 'md', 'sm', 'xs', '2xs'],
  paragraph: ['xl', 'lg', 'md', 'sm', 'xs'],
  subheading: ['md', 'sm', 'xs', '2xs'],
  doc: ['label', 'paragraph'],
};

const typographyPatterns = Object.entries(typographyConfig).flatMap(
  ([category, sizes]) => sizes.map((size) => `${category}-${size}`),
);

export const twMergeConfig = {
  extend: {
    classGroups: {
      'font-size': [{ text: typographyPatterns }],
    },
  },
};

const customTwMerge = extendTailwindMerge(twMergeConfig);

export function cn(...classes: ClassValue[]) {
  return customTwMerge(clsx(...classes));
}
```

#### B. `@/utils/tv.ts`
Pre-configures `tailwind-variants` with AlignUI's class merging:
```typescript
import { createTV } from 'tailwind-variants';
import { twMergeConfig } from '@/utils/cn';

export type { VariantProps, ClassValue } from 'tailwind-variants';

export const tv = createTV({
  twMergeConfig,
});
```

#### C. `@/utils/polymorphic.ts`
Enables the `as` prop for icons and custom elements:
```typescript
import * as React from 'react';

type AsProp<T extends React.ElementType> = {
  as?: T;
};

type PropsToOmit<T extends React.ElementType, P> = keyof (AsProp<T> & P);

type PolymorphicComponentProp<
  T extends React.ElementType,
  Props = {},
> = React.PropsWithChildren<Props & AsProp<T>> &
  Omit<React.ComponentPropsWithoutRef<T>, PropsToOmit<T, Props>>;

export type PolymorphicRef<T extends React.ElementType> =
  React.ComponentPropsWithRef<T>['ref'];

export type PolymorphicComponentProps<
  T extends React.ElementType,
  P = {},
> = PolymorphicComponentProp<T, P>;
```

#### D. `@/utils/recursive-clone-children.tsx`
Propagates variant states (`size`, `variant`, `mode`) from `Root` to declared child display names:
```typescript
import * as React from 'react';

export function recursiveCloneChildren(
  children: React.ReactNode,
  additionalProps: any,
  displayNames: string[],
  uniqueId: string,
  asChild?: boolean,
): React.ReactNode | React.ReactNode[] {
  return React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const displayName = (child.type as React.ComponentType)?.displayName || '';
    const newProps = displayNames.includes(displayName) ? additionalProps : {};
    const childProps = (child as React.ReactElement<any>).props;

    return React.cloneElement(
      child,
      { ...newProps, key: `${uniqueId}-${index}` },
      recursiveCloneChildren(childProps?.children, additionalProps, displayNames, uniqueId, asChild),
    );
  });
}
```

---

## 2. Design Tokens Reference

Always apply tokens through semantic utility classes. Do not hardcode arbitrary hex values or Tailwind default color scales.

### Background Tokens (`bg-*`)
- `bg-bg-white-0`: Pure light background / card surfaces.
- `bg-bg-weak-25`: Subtle tinted surface.
- `bg-bg-weak-50`: Default muted background, input fills, disabled containers.
- `bg-bg-soft-200`: Hover states for muted elements, badge fills.
- `bg-bg-sub-300`: Darker secondary background.
- `bg-bg-surface-800`: Dark surface container.
- `bg-bg-strong-950`: High-contrast dark backgrounds, solid neutral buttons.

### Text Tokens (`text-*`)
- `text-text-strong-950`: Primary headings, main copy, high-contrast labels.
- `text-text-sub-600`: Secondary descriptions, subheadings, helper text.
- `text-text-soft-400`: Placeholder text, inactive icons, subtle hints.
- `text-text-disabled-300`: Disabled text and icons.
- `text-text-white-0`: Inverted light text on dark backgrounds.

### Border & Stroke Tokens (`stroke-*`, `ring-*`, `border-*`)
- `stroke-white-0` / `ring-stroke-white-0`: Inverted border.
- `stroke-soft-200` / `ring-stroke-soft-200`: Standard card borders, dividers, subtle inputs.
- `stroke-sub-300` / `ring-stroke-sub-300`: Active border, focus borders.
- `stroke-strong-950` / `ring-stroke-strong-950`: High-contrast borders.

### Brand & Feedback Tokens
- Primary: `bg-primary-base`, `hover:bg-primary-darker`, `bg-primary-alpha-10`, `text-primary-base`
- Error: `bg-error-base`, `hover:bg-red-700`, `bg-red-alpha-10`, `text-error-base`
- Focus Rings: `focus-visible:shadow-button-primary-focus`, `focus-visible:shadow-button-important-focus`, `focus-visible:shadow-button-error-focus`

### Typography Hierarchy (`text-*`)
AlignUI preconfigures exact line heights and letter-spacing per text class:
- **Titles**: `text-title-h1` (56px) down to `text-title-h6` (20px).
- **Subheadings**: `text-subheading-md` (16px) down to `text-subheading-2xs` (11px).
- **Labels (UI Controls)**: `text-label-xl` (18px), `text-label-lg` (16px), `text-label-md` (14px), `text-label-sm` (13px), `text-label-xs` (12px), `text-label-2xs` (11px).
- **Paragraphs (Body Copy)**: `text-paragraph-xl` (18px), `text-paragraph-lg` (16px), `text-paragraph-md` (14px), `text-paragraph-sm` (13px), `text-paragraph-xs` (12px).

---

## 3. Standard Component Authoring Recipe

When building or updating an AlignUI component, follow these 5 steps in order:

### Step 1: Define Variants using `tv`
Create slot definitions for `root`, `icon`, and optional sub-elements. Group sizes and visual modes cleanly:

```typescript
import { tv, type VariantProps } from '@/utils/tv';

export const buttonVariants = tv({
  slots: {
    root: 'group relative inline-flex items-center justify-center whitespace-nowrap outline-none transition duration-200 ease-out focus:outline-none disabled:pointer-events-none disabled:bg-bg-weak-50 disabled:text-text-disabled-300',
    icon: 'flex size-5 shrink-0 items-center justify-center',
  },
  variants: {
    variant: {
      primary: {},
      neutral: {},
      error: {},
    },
    mode: {
      filled: {},
      stroke: { root: 'ring-1 ring-inset' },
      lighter: { root: 'ring-1 ring-inset' },
      ghost: { root: 'ring-1 ring-inset' },
    },
    size: {
      medium: { root: 'h-10 gap-3 rounded-10 px-3.5 text-label-sm', icon: '-mx-1' },
      small: { root: 'h-9 gap-3 rounded-lg px-3 text-label-sm', icon: '-mx-1' },
      xsmall: { root: 'h-8 gap-2.5 rounded-lg px-2.5 text-label-sm', icon: '-mx-1' },
    },
  },
  compoundVariants: [
    {
      variant: 'primary',
      mode: 'filled',
      class: { root: 'bg-primary-base text-static-white hover:bg-primary-darker focus-visible:shadow-button-primary-focus' },
    },
    {
      variant: 'neutral',
      mode: 'stroke',
      class: { root: 'bg-bg-white-0 text-text-sub-600 shadow-regular-xs ring-stroke-soft-200 hover:bg-bg-weak-50 hover:text-text-strong-950' },
    },
  ],
  defaultVariants: {
    variant: 'primary',
    mode: 'filled',
    size: 'medium',
  },
});
```

### Step 2: Establish Component Display Names
Names must match the string passed to `recursiveCloneChildren`:
```typescript
const BUTTON_ROOT_NAME = 'ButtonRoot';
const BUTTON_ICON_NAME = 'ButtonIcon';
```

### Step 3: Implement `Root` with `asChild` and Child Cloning
```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';

type ButtonSharedProps = VariantProps<typeof buttonVariants>;

export type ButtonRootProps = VariantProps<typeof buttonVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

export const ButtonRoot = React.forwardRef<HTMLButtonElement, ButtonRootProps>(
  ({ children, variant, mode, size, asChild, className, ...rest }, ref) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'button';
    const { root } = buttonVariants({ variant, mode, size });

    const sharedProps: ButtonSharedProps = { variant, mode, size };
    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [BUTTON_ICON_NAME],
      uniqueId,
      asChild,
    );

    return (
      <Component ref={ref} className={root({ class: className })} {...rest}>
        {extendedChildren}
      </Component>
    );
  },
);
ButtonRoot.displayName = BUTTON_ROOT_NAME;
```

### Step 4: Implement Polymorphic Subcomponents (`Icon`, etc.)
```typescript
import type { PolymorphicComponentProps } from '@/utils/polymorphic';

export function ButtonIcon<T extends React.ElementType>({
  variant,
  mode,
  size,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, ButtonSharedProps>) {
  const Component = as || 'div';
  const { icon } = buttonVariants({ mode, variant, size });
  return <Component className={icon({ class: className })} {...rest} />;
}
ButtonIcon.displayName = BUTTON_ICON_NAME;
```

### Step 5: Export Named Primitives
Export as namespaces for ergonomic compound usage:
```typescript
export { ButtonRoot as Root, ButtonIcon as Icon };
```

---

## 4. Component Usage Pattern

Users consume components by importing the module namespace and composing elements:

```tsx
import * as Button from '@/components/ui/button';
import { RiArrowRightLine, RiMailLine } from '@remixicon/react';

export function ActionExample() {
  return (
    <div className="flex items-center gap-3">
      {/* Primary filled button with polymorphic Remix icon */}
      <Button.Root variant="primary" mode="filled" size="medium">
        <Button.Icon as={RiMailLine} />
        Send Message
        <Button.Icon as={RiArrowRightLine} />
      </Button.Root>

      {/* Neutral stroked button rendered as Next.js Link via asChild */}
      <Button.Root variant="neutral" mode="stroke" size="medium" asChild>
        <a href="/login">Sign In</a>
      </Button.Root>
    </div>
  );
}
```

---

## 5. Component Catalog & Primitives

AlignUI components follow the same architecture defined in the Recipe above. When constructing any component, refer to its standard structure and the official documentation (or local cache if present):

- **Actions**:
  - `Button` (`https://alignui.com/docs/v1.2/ui/button`) — Base button with modes (`filled`, `stroke`, `lighter`, `ghost`) and sizes (`medium`, `small`, `xsmall`, `xxsmall`).
  - `Button Group` (`https://alignui.com/docs/v1.2/ui/button-group`) — Connected button groups sharing focus rings.
  - `Compact Button` (`https://alignui.com/docs/v1.2/ui/compact-button`) — Icon-only and micro button controls.
  - `Fancy Button` (`https://alignui.com/docs/v1.2/ui/fancy-button`) — High-emphasis CTA with gradients, borders, and glow effects.
  - `Link Button` (`https://alignui.com/docs/v1.2/ui/link-button`) — Text and inline link button styles.
- **Form Elements**:
  - `Input` (`https://alignui.com/docs/v1.2/ui/input`) — Text input with icon slots and status states (`normal`, `error`, `success`).
  - `Label` (`https://alignui.com/docs/v1.2/ui/label`) — Accessible form label with required indicator support.
  - `Textarea` (`https://alignui.com/docs/v1.2/ui/textarea`) — Multiline text field with character counts.
  - `Checkbox` (`https://alignui.com/docs/v1.2/ui/checkbox`) — Accessible Radix checkbox with indeterminate state.
  - `Radio` (`https://alignui.com/docs/v1.2/ui/radio`) — Radio group items with custom indicators.
  - `Switch` (`https://alignui.com/docs/v1.2/ui/switch`) — Smooth animated toggle control.
  - `Select` (`https://alignui.com/docs/v1.2/ui/select`) — Radix-powered dropdown select with item icons and groups.
  - `Slider` (`https://alignui.com/docs/v1.2/ui/slider`) — Continuous and stepped range sliders.
  - `Datepicker` & `Color Picker` (`https://alignui.com/docs/v1.2/ui/datepicker`, `https://alignui.com/docs/v1.2/ui/color-picker`) — Specialized pickers.
  - `File Upload` (`https://alignui.com/docs/v1.2/ui/file-upload`) — File dropzone container with drag-and-drop states.
  - `Digit Input` (`https://alignui.com/docs/v1.2/ui/digit-input`) — Verification code / OTP input.
- **Display & Feedback**:
  - `Badge` & `Status Badge` (`https://alignui.com/docs/v1.2/ui/badge`, `https://alignui.com/docs/v1.2/ui/status-badge`) — Status and counter badges with dot indicators.
  - `Tag` (`https://alignui.com/docs/v1.2/ui/tag`) — Removable and interactive tags.
  - `Avatar` & `Avatar Group` (`https://alignui.com/docs/v1.2/ui/avatar`, `https://alignui.com/docs/v1.2/ui/avatar-group`) — User profiles, fallback initials, and overlapping stacks.
  - `Banner`, `Alert`, `Notification`, `Toast` (`https://alignui.com/docs/v1.2/ui/alert`, `https://alignui.com/docs/v1.2/ui/notification`, `https://alignui.com/docs/v1.2/ui/toast`) — Message boxes and notification stacks.
  - `Data Table` (`https://alignui.com/docs/v1.2/ui/data-table`) — Dense and responsive tabular layouts.
  - `Progress Bar` & `Progress Circle` (`https://alignui.com/docs/v1.2/ui/progress-bar`, `https://alignui.com/docs/v1.2/ui/progress-circle`) — Progress indicators.
- **Navigation & Layout**:
  - `Accordion` (`https://alignui.com/docs/v1.2/ui/accordion`) — Collapsible section containers.
  - `Breadcrumb` (`https://alignui.com/docs/v1.2/ui/breadcrumb`) — Hierarchical trail navigation.
  - `Segmented Control` (`https://alignui.com/docs/v1.2/ui/segmented-control`) — Pill-based tab switcher.
  - `Tab Menu Horizontal` & `Tab Menu Vertical` (`https://alignui.com/docs/v1.2/ui/tab-menu-horizontal`, `https://alignui.com/docs/v1.2/ui/tab-menu-vertical`) — Navigation tabs.
  - `Pagination` (`https://alignui.com/docs/v1.2/ui/pagination`) — Page buttons and jumpers.
  - `Horizontal Stepper` & `Vertical Stepper` (`https://alignui.com/docs/v1.2/ui/horizontal-stepper`, `https://alignui.com/docs/v1.2/ui/vertical-stepper`) — Multi-step wizards.
- **Overlays**:
  - `Modal` (`https://alignui.com/docs/v1.2/ui/modal`) — Centered dialog with backdrop and header/footer actions.
  - `Drawer` (`https://alignui.com/docs/v1.2/ui/drawer`) — Slide-out sheet panel.
  - `Dropdown` & `Popover` (`https://alignui.com/docs/v1.2/ui/dropdown`, `https://alignui.com/docs/v1.2/ui/popover`) — Contextual popups.
  - `Tooltip` (`https://alignui.com/docs/v1.2/ui/tooltip`) — Hover hint overlay.
  - `Command Menu` (`https://alignui.com/docs/v1.2/ui/command-menu`) — Quick action search modal (`Cmd+K`).

---

## 6. Completion Checklist

Before delivering any AlignUI component or layout:
1. [ ] **No Raw Colors**: Confirmed all classes use AlignUI semantic tokens (`bg-bg-*`, `text-text-*`, `stroke-*`, `primary-*`).
2. [ ] **Variant Typing**: Component styles use `tv` with exported `VariantProps`.
3. [ ] **Display Names**: Compound subcomponents have explicit `.displayName` matching the parent's `recursiveCloneChildren` list.
4. [ ] **Radix Composition**: Uses `asChild` / `@radix-ui/react-slot` when rendering links or wrapping external components.
5. [ ] **Icon Polymorphism**: All icon slots accept an `as` prop typed with `PolymorphicComponentProps`.
