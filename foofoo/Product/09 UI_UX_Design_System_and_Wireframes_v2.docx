*Design System **&** Wireframes  |  Confidential*

DOCUMENT #9

**UI/UX Design System**

&

**Wireframe Specifications**

AI-Powered Meal Decision Assistant

Fresh & Vibrant  |  Rounded & Soft  |  Real Photography

*Version 1.0  |  April 2026  |  Confidential*

# 1. Design Philosophy

The app's visual identity is rooted in three principles: **Fresh ****&**** Vibrant** (food-inspired colors that make you hungry), **Rounded ****&**** Soft** (friendly, approachable, never intimidating), and **Real Photography** (authentic dish photos that build trust and cravings). The design should feel like a warm, knowledgeable friend helping you with meals — not a clinical health app or a chaotic food delivery platform.

## 1.1 Design Pillars

| **Pillar** | **What It Means in Practice** |
| --- | --- |
| **Warmth Over Precision** | Rounded corners everywhere. Soft shadows. Warm color temperature. No sharp angles or cold grays. The app should feel like your kitchen, not a spreadsheet. |
| **Food Is the Hero** | Real photography takes center stage. Every meal card is dominated by the dish image. UI elements support the food, never compete with it. White space lets photos breathe. |
| **Effortless Interaction** | Gestures feel natural and forgiving. Long-press has generous activation time (300ms). Swipe snaps smoothly. Animations are fluid, never abrupt. Everything responds to touch with subtle feedback. |
| **Progressive Complexity** | First screen is dead simple: 3 cards, your meals. Complexity reveals itself as users explore. Filters, Week View, and settings are always available but never forced. |
| **Delight in Details** | Micro-animations on lock (satisfying click), on 'Never' (dish slides away with a poof), on acceptance (gentle checkmark). Sound effects optional but designed for (toggle in settings). |

# 2. Color System

A food-inspired palette built around fresh greens (health, nature), warm oranges (appetite, energy), and clean neutrals (readability). The palette is designed to make food photography pop while maintaining accessibility standards.

## 2.1 Primary Palette

| ██████ **Forest Green (Primary)** #2B5C3F | ██████ **Fresh Green (Primary Light)** #4CAF50 | ██████ **Mint (Primary Surface)** #E8F5E9 | ██████ **Mango Orange (Accent)** #FF6F00 | ██████ **Peach (Accent Surface)** #FFF3E0 |
| --- | --- | --- | --- | --- |

## 2.2 Secondary Palette

| ██████ **Turmeric (Warm Accent)** #FF8F00 | ██████ **Chili Red (Warning/Never)** #D84315 | ██████ **Saffron Gold (Premium)** #F9A825 | ██████ **Teal (Info/Links)** #00897B | ██████ **Indigo (Selected States)** #5C6BC0 |
| --- | --- | --- | --- | --- |

## 2.3 Neutral Palette

| ██████ **Ink (Text Primary)** #1A1A2E | ██████ **Charcoal (Text Secondary)** #424242 | ██████ **Slate (Text Tertiary)** #757575 | ██████ **Silver (Borders)** #E0E0E0 | ██████ **Cloud (Background)** #F5F5F5 | ██████ **White (Cards)** #FFFFFF |
| --- | --- | --- | --- | --- | --- |

## 2.4 Semantic Colors

| **Usage** | **Color** | **Application** |
| --- | --- | --- |
| **Success / Accept** | **#4CAF50** | Checkmarks, confirmation states, locked meal indicator, 'Frequently' bucket tag |
| **Warning / Caution** | **#FF8F00** | 'Occasionally' bucket tag, approaching notification cap, 'Not Today' action feedback |
| **Error / Never** | **#D84315** | 'Never' action, allergy warnings, form validation errors, 'Never' bucket tag |
| **Info / Neutral** | **#00897B** | Links, informational badges, cooking time display, calorie count |
| **Premium / Gold** | **#F9A825** | Premium tier badge, upgrade CTAs, premium feature lock icons |
| **Locked State** | **#5C6BC0** | Locked meal card border/indicator, active filter state |
| **Disabled / Inactive** | **#BDBDBD** | Grayed-out tabs (Pantry, Diary in MVP), disabled buttons, past dates in Week View |

## 2.5 Accessibility

All text-on-background combinations must meet **WCAG AA** contrast ratio (4.5:1 for body text, 3:1 for large text). The primary green (#2B5C3F) on white passes at 7.2:1. The accent orange (#FF6F00) on white passes at 3.1:1 (use only for large text or with dark backgrounds). Never use color alone to convey meaning — always pair with icons or text labels.

# 3. Typography

Typography uses a two-font system: a display font for headers and a clean body font for everything else. Both are Google Fonts for free availability.

## 3.1 Font Selection

| **Role** | **Font** | **Rationale** |
| --- | --- | --- |
| **Display / Headers** | **Nunito (Bold / ExtraBold)** | Rounded terminals match 'soft & friendly' pillar. Excellent readability. Feels warm, not corporate. Google Font, free. |
| **Body / UI Text** | **DM Sans (Regular / Medium / Bold)** | Clean, modern sans-serif with slightly rounded feel. Highly legible at small sizes. Pairs well with Nunito. Google Font, free. |
| **Monospace (Calories, Time)** | **JetBrains Mono (Medium)** | Used only for numeric data displays (calories, cooking time). Clean, distinctive from body text. Communicates precision for data. |

## 3.2 Type Scale

| **Token Name** | **Size** | **Weight** | **Line Height** | **Usage** |
| --- | --- | --- | --- | --- |
| **display-large** | 28sp | *Nunito ExtraBold* | 36sp | Intro screen headlines |
| **display-medium** | 24sp | *Nunito Bold* | 32sp | Section headers, meal slot labels |
| **title-large** | 20sp | *Nunito Bold* | 28sp | Screen titles, dish names on cards |
| **title-medium** | 18sp | *DM Sans Bold* | 24sp | Subheaders, filter group titles |
| **body-large** | 16sp | *DM Sans Regular* | 24sp | Primary body text, descriptions |
| **body-medium** | 14sp | *DM Sans Regular* | 20sp | Secondary text, recipe steps |
| **body-small** | 12sp | *DM Sans Medium* | 16sp | Captions, tags, metadata |
| **label-large** | 14sp | *DM Sans Bold* | 20sp | Button labels, tab labels |
| **label-small** | 11sp | *DM Sans Medium* | 16sp | Badges, chip text, timestamps |
| **data-display** | 16sp | *JetBrains Mono Medium* | 20sp | Calorie counts, cooking time |

# 4. Spacing & Layout Grid

## 4.1 Spacing Scale (4px Base)

| **Token** | **Value** | **Usage** |
| --- | --- | --- |
| **space-xs** | **4px** | Inline icon spacing, tight chip padding |
| **space-sm** | **8px** | Inter-element spacing within components, tag margins |
| **space-md** | **12px** | Card internal padding, list item gap |
| **space-lg** | **16px** | Section spacing, card-to-card gap, default padding |
| **space-xl** | **24px** | Screen edge padding (horizontal), section separation |
| **space-2xl** | **32px** | Major section breaks, modal padding |
| **space-3xl** | **48px** | Screen-level vertical padding, header clearance |

## 4.2 Layout Grid

| **Property** | **Value** |
| --- | --- |
| **Grid Type** | 4-column grid for phones (< 600dp). 8-column for tablets (>= 600dp). |
| **Margins (Screen Edge)** | 24px left and right. Consistent across all screens. |
| **Gutter (Column Gap)** | 16px between columns. |
| **Safe Area** | Respect iOS notch and Android system bars. Bottom: 34px (iPhone) or nav bar height (Android). |
| **Content Max Width** | No max on phones (edge-to-edge cards). 560px max on tablets (centered content). |
| **Card Width** | Full width minus margins (edge-to-edge with 24px padding). Week View cells: equal width per day column. |
| **Touch Target Minimum** | 48 x 48 dp for all interactive elements. 56 x 56 dp for primary action buttons. |

# 5. Component Library

Reusable components that appear across multiple screens. Each is specified with dimensions, states, and behavior.

## 5.1 Meal Card (Hero Component)

The most important component in the app. Appears on Home Day View, Week View (compact), Search results, and Meal Listing.

| **Property** | **Specification** |
| --- | --- |
| **Dimensions** | Full width (screen width - 48px margins). Height: 200px (Day View standard card). Compact: 120px (Week View cell). |
| **Corner Radius** | 20px (large rounded). Consistent with soft/friendly pillar. |
| **Image** | Full-card background image. Real food photography. Aspect ratio 16:9. Bottom gradient overlay (transparent to 80% black) for text legibility. |
| **Dish Name** | title-large (20sp Nunito Bold). White. Bottom-left, over gradient. Max 2 lines, ellipsis after. |
| **Metadata Row** | Below dish name. body-small (12sp DM Sans). White/90% opacity. Shows: Cuisine tag, Cooking time (clock icon), Calories (flame icon). |
| **Action Icons** | Bottom-right corner over gradient. 3 icons in row: Recipe (book icon), Ingredients (list icon), Lock (lock icon). Each 32x32dp, white, tap target 48x48dp. |
| **Lock State** | When locked: Purple (#5C6BC0) border (3px). Lock icon filled. Swipe disabled. Subtle lock badge top-right corner. |
| **Swipe Behavior** | Horizontal card stack. Next card peeks 20px from right edge. Swipe threshold: 40% of card width. Snap animation: 250ms ease-out. |
| **Long Press Feedback** | 300ms activation. Card lifts slightly (4dp elevation increase). Subtle haptic feedback. Drag zones: top 40% = 'Not Today', bottom 40% = 'Never'. Visual cue: colored overlay appears during drag (orange top, red bottom). |
| **Shadow** | Default: 0 4px 12px rgba(0,0,0,0.08). Lifted (long-press): 0 8px 24px rgba(0,0,0,0.15). |
| **Skeleton State** | While loading: card shape with shimmer animation. Gray gradient pulses left-to-right. 1.5s cycle. |

## 5.2 Bucket Selector (Onboarding)

| **Property** | **Specification** |
| --- | --- |
| **Layout** | 3 horizontal drop zones at top of screen: Frequently (green), Occasionally (orange), Never (red). Unsorted items in scrollable area below. |
| **Item Chips** | Rounded pill shape. 40px height. body-medium text. Light gray background (#F5F5F5). Food icon on left. Drag handle dots on right. |
| **Drop Zone** | Rounded rectangle. 80px min height, expands with content. Color-coded border (2px dashed when empty, solid when has items). Label at top. |
| **Drag Interaction** | On drag start: chip lifts with shadow. Active drop zone highlights with fill color at 10% opacity. On drop: chip color changes to match zone. Smooth 200ms transition. |
| **Tap Shortcut** | Single tap cycles: Unsorted → Frequently → Occasionally → Never → Unsorted. Chip color updates with each tap. Fast for users who don't want to drag. |
| **Constraint** | Each item belongs to exactly ONE bucket. Moving to a new bucket removes from previous. Visual: item disappears from old zone, appears in new zone with 150ms animation. |
| **Progress** | Counter at bottom: '12 of 18 sorted'. Items remaining in Unsorted shown. 'Next' button disabled until all mandatory items are sorted. |

## 5.3 Core UI Components

| **Component** | **Specification** | **States** |
| --- | --- | --- |
| **Primary Button** | Height: 52px. Corner radius: 26px (full round). Background: Primary Green (#2B5C3F). Text: white, label-large (14sp Bold). Min width: 160px. Full-width variant available. | Default, Pressed (darken 10%), Disabled (40% opacity), Loading (spinner replaces text) |
| **Secondary Button** | Height: 48px. Corner radius: 24px. Background: transparent. Border: 2px Primary Green. Text: Primary Green, label-large. | Default, Pressed (green fill 10%), Disabled (gray border/text) |
| **Icon Button** | Size: 48x48dp (touch target). Icon: 24x24dp centered. No background default. Circular highlight on press. | Default, Pressed (circular ripple), Active (filled background), Disabled (40% opacity) |
| **Text Input** | Height: 56px. Corner radius: 12px. Border: 1.5px Silver (#E0E0E0). Padding: 16px horizontal. Label above (body-small, Slate). Placeholder: Slate color. | Empty, Focused (green border, label green), Filled, Error (red border, error text below), Disabled |
| **Chip / Tag** | Height: 32px. Corner radius: 16px. Padding: 8px 16px. Text: label-small. Close icon (X) on right for removable chips. | Default (light gray), Selected (green fill, white text), Cuisine (color-coded per cuisine) |
| **Bottom Sheet** | Corner radius: 24px top-left and top-right. Background: white. Drag handle: 40x4px centered, Silver color, 8px from top. Shadow: 0 -4px 20px rgba(0,0,0,0.1). | Collapsed (peek), Expanded (full or half screen), Dismissing (swipe down) |
| **Toggle / Switch** | Track: 52x32px, corner radius 16px. Thumb: 28px circle. Off: Silver track, white thumb. On: Primary Green track, white thumb. | Off, On, Disabled (40% opacity) |
| **Progress Bar** | Height: 4px. Corner radius: 2px. Track: Silver. Fill: Primary Green. Used in onboarding. | Static, Animated (smooth fill transition on step change) |
| **Toast / Snackbar** | Bottom of screen. 16px margin. Corner radius: 12px. Background: Ink (#1A1A2E). Text: white, body-medium. Optional action button. Auto-dismiss: 3s. | Info (teal left border), Success (green), Warning (orange), Error (red) |
| **Modal Overlay** | Background: black at 50% opacity. Modal: white, corner radius: 24px. Padding: 24px. Max width: 320px. Centered vertically and horizontally. | Entering (fade in + scale from 95%), Dismissing (fade out + scale to 95%) |

# 6. Iconography

| **Property** | **Value** | **Notes** |
| --- | --- | --- |
| **Icon Library** | **Phosphor Icons (Regular weight)** | Rounded, friendly style matches design pillar. Open source. Comprehensive food and UI icon set. |
| **Default Size** | **24 x 24 dp** | Scales to 20dp for compact contexts (Week View cells, metadata) |
| **Color** | **Inherits text color by default** | Primary icons: Ink (#1A1A2E). On cards/photos: White. Accent icons: Semantic color. |
| **Touch Target** | **48 x 48 dp minimum** | Even if icon is 24dp, tap area must be 48dp. Invisible padding. |
| **Stroke Width** | **1.5px (regular weight)** | Consistent across all icons. Bold weight (2px) for active/selected states. |

## 6.1 Key Icons by Screen

| **Screen** | **Icon** | **Description** |
| --- | --- | --- |
| **Top Bar** | **MagnifyingGlass, Bell** | Search and notifications. Ink color on white bar. |
| **Meal Card** | **BookOpen, ListBullets, Lock** | Recipe, ingredients, lock. White on photo gradient. |
| **Meal Card (Locked)** | **LockSimple (filled)** | Filled variant indicates locked state. Indigo color. |
| **Footer: Planner** | **CalendarBlank** | Default tab. Active: filled variant, Primary Green. |
| **Footer: Pantry** | **Package** | Phase 1. Grayed in MVP. |
| **Footer: Diary** | **Notebook** | Phase 2. Grayed in MVP. |
| **Footer: Profile** | **UserCircle** | Active: filled variant. |
| **Filters** | **Funnel, SlidersHorizontal** | Filter icon and advanced filters. |
| **Gesture Tutorial** | **SwipeRight, ArrowDown, ArrowUp** | Custom illustration-style icons for gesture teaching. |
| **Allergy Chips** | **Warning (triangle)** | Red warning icon on allergy tags. |
| **Calories** | **Fire** | Inline with calorie count. Teal color. |
| **Cooking Time** | **Clock** | Inline with time. Teal color. |
| **Difficulty** | **ChefHat** | Inline with Easy/Medium/Hard label. |

# 7. Animation & Motion

| **Animation** | **Duration / Easing** | **Details** |
| --- | --- | --- |
| **Card Swipe** | 250ms / ease-out | Card slides out, next card slides in from right. Snap back if swipe distance < 40% of width. |
| **Long Press Lift** | 200ms / ease-out | Card elevates 4dp. Subtle scale to 1.02x. Shadow deepens. Haptic pulse. |
| **Never Dismiss** | 350ms / ease-in | Card slides down and fades. Red tint flash. 'Poof' particle effect (optional). Replacement card fades in from behind. |
| **Not Today Dismiss** | 300ms / ease-in-out | Card slides up and fades. Orange tint flash. Replacement card fades in. |
| **Lock Toggle** | 200ms / spring | Lock icon bounces into filled state. Border color transitions to Indigo. Satisfying 'click' haptic. |
| **Bucket Drop** | 200ms / ease-out | Chip morphs color to match bucket. Drop zone briefly scales to 1.02x on receive. Chip settles with slight bounce. |
| **Screen Transition** | 300ms / ease-in-out | Push navigation: new screen slides in from right. Modal: fade + scale from 95%. Bottom sheet: slides up from bottom. |
| **Skeleton Shimmer** | 1500ms / linear loop | Gradient sweep left-to-right across skeleton shapes. Subtle pulse effect. |
| **Progress Bar Fill** | 400ms / ease-out | Smooth fill on onboarding step completion. Slight overshoot (spring effect). |
| **Toast Enter/Exit** | 200ms in, 150ms out | Slide up from bottom + fade in. Slide down + fade out on dismiss. |
| **Pull to Refresh** | Custom spring | Overscroll reveals green spinner. Release triggers refresh. Spinner spins until data loads. |

**Performance Rule:** All animations must run at 60fps. Use GPU-accelerated properties only (transform, opacity). Never animate layout properties (width, height, top, left) directly.

# 8. Screen-by-Screen Wireframe Specifications

Detailed layout specifications for every MVP screen. These serve as the blueprint for wireframing tools (Figma, Sketch) and for developers building the UI. Each spec describes the exact layout structure, component placement, and interactive behavior.

## 8.1 Splash Screen

| **Background** | Solid Primary Green (#2B5C3F), full screen |
| --- | --- |
| **Logo** | App logo centered vertically and horizontally. Max width 120dp. White or light variant. |
| **Animation** | Logo fades in (300ms) with slight scale from 0.9 to 1.0. Holds for 1.5s. Fades to Intro Screen 1. |
| **Status Bar** | Light content (white icons/text) on green background. |
| **Duration** | Total 2 seconds. No skip button. No loading indicator. |

## 8.2 Intro Screens (1-3)

| **Layout** | Full-screen. Illustration occupies top 55%. Text block in bottom 45%. Page dots at bottom above CTA area. |
| --- | --- |
| **Illustration Area** | Top half. Edge-to-edge. Background color: soft tint matching theme (light green, light blue, light orange per screen). |
| **Headline** | display-large (28sp Nunito ExtraBold). Ink color. Centered. Max 2 lines. |
| **Subtext** | body-large (16sp DM Sans). Charcoal color. Centered. Max 3 lines. 8px below headline. |
| **Page Dots** | 3 dots, 8dp each, 12dp gap. Active: Primary Green filled. Inactive: Silver outlined. |
| **Navigation** | Swipe left/right between pages. On Page 3: 'Let's Go' Primary Button (full-width, 24px margins) replaces dots area. |
| **Skip** | 'Skip' text button, top-right corner. Slate color. Tap goes directly to Auth Gate. |
| **Screen 1** | Headline: 'ARE YOU TIRED'. Sub: 'of deciding what to cook or eat'. Illustration: frustrated person in kitchen. |
| **Screen 2** | Headline: 'WHAT IF'. Sub: 'You never have to worry about it ever again'. Illustration: automation/AI concept. |
| **Screen 3** | Headline: 'Find your rhythm in 2 weeks'. Illustration: success/happy cooking. CTA: 'Let's Go' button. |

## 8.3 Auth Gate (Sign In / Sign Up)

| **Layout** | Clean, centered. App logo at top (80dp, 20% from top). Welcome text below. Two buttons centered. |
| --- | --- |
| **Welcome Text** | display-medium: 'Welcome to [App Name]'. body-large: 'Your personal meal planner'. Centered. |
| **Sign Up Button** | Primary Button, full-width. Text: 'Create Account'. 24px side margins. |
| **Sign In Button** | Secondary Button, full-width. Text: 'I already have an account'. Below Sign Up, 12px gap. |
| **Footer** | Terms of Service and Privacy Policy links. body-small, Slate color, centered. 24px from bottom safe area. |

## 8.4 Sign Up Screen

| **Top Bar** | Back arrow (left). Title: 'Create Account' (title-medium). No right action. |
| --- | --- |
| **Form Fields** | Full Name (text input), Email (email input), Password (password input with show/hide toggle). 16px gap between fields. 24px side margins. |
| **Password Rules** | Below password field: body-small, Slate. 'Min 8 characters, 1 uppercase, 1 number'. Checkmarks turn green as criteria met. |
| **CTA** | Primary Button: 'Sign Up'. Full width. Below form, 24px gap. Disabled until all fields valid. |
| **Already Have Account** | body-medium centered below button: 'Already have an account? Sign In'. 'Sign In' is teal link. |
| **Keyboard Handling** | Form scrolls up when keyboard appears. CTA remains visible above keyboard. |

## 8.5 Onboarding: Bucket Sorting Screen (Steps 4, 5, 6)

This is the most unique screen in the app. Used for Cuisine Preferences, Breakfast Preferences, and Lunch/Dinner Preferences.

| **Top Area** | Progress bar (full width, 4px). Step title: display-medium ('Your Cuisine Preferences'). Subtitle: body-medium, Slate ('Drag items into buckets or tap to cycle'). |
| --- | --- |
| **Bucket Zone** | 3 columns, equal width. Each has: colored header bar (Green/Orange/Red), label (Frequently/Occasionally/Never), count badge, and droppable area. Height: flexible (min 80px, grows with content). |
| **Unsorted Area** | Below buckets. Scrollable grid of item chips. 2 columns. Each chip: 48px height, rounded pill, food icon + name + drag dots. Light gray background. |
| **Sorting Counter** | Fixed bottom bar: 'X of Y sorted' with mini progress. 'Next' button on right. Disabled until all sorted. |
| **Interaction: Drag** | Long press chip (150ms) → lifts with shadow → drag to any bucket → drop zone highlights on hover → release to place. Chip adopts bucket color. |
| **Interaction: Tap** | Single tap cycles: Unsorted → Frequently → Occasionally → Never → Unsorted. Color changes with each tap. Counter updates. |
| **Constraint** | One item = one bucket only. Moving to new bucket auto-removes from previous. Cannot place in multiple buckets. |
| **Scroll Behavior** | Buckets fixed at top. Unsorted area scrolls. If bucket overflows, it becomes scrollable within its fixed height. |

## 8.6 Home: Day View (Primary Screen)

The most important screen in the app. Users see this every day.

| **Status Bar** | Dark content on white/cloud background. |
| --- | --- |
| **Top Bar (56dp)** | Left: Search icon (MagnifyingGlass). Center: App name or logo (small). Right: Notification bell with badge count. |
| **Date Navigator** | Below top bar. 48dp height. Left arrow, centered date ('Today, April 13' or 'Tue, Apr 15'), right arrow. Tap date opens mini calendar. Today is always highlighted. |
| **Filters Row** | Horizontal scroll. Chip-style filters: Day/Week toggle (pill switch), B/L/D filter, Cuisine, Protein. Active filters: green filled chip. 48dp height. |
| **Meal Cards Area** | Scrollable vertical stack. 3 cards: Breakfast, Lunch, Dinner. Each card preceded by a meal slot label (title-medium, left-aligned, Slate color: 'Breakfast', 'Lunch', 'Dinner'). 16px gap between cards. |
| **Card Layout** | Full-width (minus 24px margins). 200px height. Background: dish photo with bottom gradient. Top-left: small cuisine tag chip. Bottom-left: dish name (title-large, white) + metadata (time, calories). Bottom-right: 3 action icons (recipe, ingredients, lock). |
| **Rubik's Cube Behavior** | Each card is independently swipeable. Swiping one card does NOT affect others. Cards are self-contained units. Horizontal card stack with peek of next option. |
| **Grocery List FAB** | Floating Action Button. Bottom-right, above footer. 56dp circle. Primary Green. White list icon. Shadow. Tap opens Grocery List. |
| **Footer (56dp)** | 4 tabs: Planner (active, green icon+label), Pantry (grayed, 'Soon' badge), Diary (grayed, 'Soon' badge), Profile. |
| **First-Time Overlay** | On first visit: semi-transparent overlay with gesture tutorial. 3 callouts: 'Swipe to browse', 'Long press down to never see again', 'Long press up for not today'. 'Got it' dismiss button. |
| **Pull to Refresh** | Pull down on card area triggers refresh. Green spinner appears. New suggestions generate for unlocked slots. |
| **Empty State** | If no plan generated (error/first load): illustration of empty plate + 'Let us cook up your plan!' + retry button. |

## 8.7 Home: Week View

| **Layout** | Same top bar and filters as Day View. Day/Week toggle now shows 'Week' active. |
| --- | --- |
| **Week Navigator** | Replaces date navigator. Left arrow, 'This Week (Apr 13 - 19)', right arrow. |
| **Grid Structure** | 3 rows (B, L, D) x 7 columns (Mon-Sun). Row labels on left (fixed, 60dp wide). Day headers on top (fixed, scrollable horizontally). |
| **Cell Size** | Each cell: ~90dp wide x 100dp tall. Contains: small dish image (60x60dp, rounded 12px), dish name (body-small, max 2 lines), calorie count (label-small). |
| **Today Highlight** | Today's column has a subtle green background tint (#E8F5E9). Header shows 'Today' badge. |
| **Past Days** | Grayed out at 50% opacity. Not interactive. Only current and future days are tappable. |
| **Tap Cell** | Opens Day View for that specific date, scrolled to the tapped meal slot. |
| **Horizontal Scroll** | If 7 columns don't fit (small phones), horizontal scroll. Row labels stay fixed. |
| **Lock Indicators** | Locked cells show small lock icon overlay in top-right corner of cell. |

## 8.8 Meal Detail Page

| **Hero Image** | Full-width, 280dp height. Real food photo. Bottom gradient (stronger than card). Parallax scroll effect (image moves slower than content). |
| --- | --- |
| **Back Button** | Top-left, 48dp circle, semi-transparent white background. Arrow icon. Over hero image. |
| **Dish Info** | Below hero: Dish name (display-medium, Ink). Cuisine tag chip + dietary tags. 12px below. |
| **Metadata Bar** | Horizontal row: Cooking Time (clock + '25 min'), Calories (fire + '320 kcal'), Difficulty (chef hat + 'Easy'). data-display font. 16px vertical margin. |
| **Action Buttons Row** | Horizontal, 56dp height. 4 buttons: Lock (icon + 'Lock'), Plus (icon + 'Add to Plan'), Check Ingredients (icon + 'Ingredients'), Share (icon). Secondary button style. |
| **Tab Bar** | Below actions. 2 tabs MVP: 'Ingredients' and 'Recipe'. Phase 1 adds 'Video'. Underline indicator, Primary Green. |
| **Ingredients Tab** | List of ingredients. Each row: ingredient name (body-large), quantity (body-medium, Slate), right-aligned. Checkbox on left (for manual tracking). Grouped by category (Spices, Vegetables, etc.). |
| **Ingredients tab** | Numbered steps. Each step: step number (circle badge, green), instruction text (body-large), estimated time for step (body-small, Slate). Generous spacing between steps. |
| **Swipe Left/Right** | Navigate to next/prev dish in same meal slot. Same carousel as Home. Page dots or dish name changes to indicate position. |
| **Long Press Gestures** | Same as Home cards: down = Never, up = Not Today. Confirmation modals appear. After action, navigates back to Home with replacement. |
| **Scroll Behavior** | Hero image scrolls with parallax. Content below scrolls normally. Tab bar sticks to top when scrolled past. |

## 8.9 Search Screen

| **Entry** | Full-screen overlay. Slides up from bottom or fades in. |
| --- | --- |
| **Search Bar** | Top of screen. Auto-focused. 56dp height. Rounded (28px radius). Gray background. Search icon left, clear button right (appears when typing). Back arrow to dismiss. |
| **Pre-Filtered** | When arriving from Carousel End (Phase 1): meal slot chip pre-applied below search bar (e.g., 'Lunch' chip, removable). |
| **Recent Searches** | Before typing: list of recent search terms. body-medium, clock icon. Tap to re-search. Clear all option. |
| **Results** | Grid of meal cards (compact variant, 2 columns). Each: image (120x80dp), dish name, calories, cuisine tag. Tap opens Meal Detail. |
| **Filters Panel** | Button below search bar: 'Filters' with Funnel icon. Opens bottom sheet with filter chips: Cuisine, Meal Type, Protein. Phase 1 adds Time, Calories, Complexity. |
| **No Results** | Empty state: illustration of magnifying glass over empty plate. 'No dishes found. Try a different search.' Suggestions below. |
| **Loading** | Skeleton cards (2-column grid) with shimmer animation while fetching results. |

## 8.10 Grocery List

| **Entry** | From Home FAB or Meal Detail ingredients button. |
| --- | --- |
| **Top Bar** | Back arrow. Title: 'Grocery List'. Right: serving size adjuster ('Serves: 2' with +/- buttons). |
| **Context Badge** | Below top bar: 'For Today' or 'For This Week' chip (depends on entry context). Switchable. |
| **Ingredient Groups** | Grouped by category: Vegetables, Spices, Grains, Dairy, Proteins, Other. Collapsible sections. Section header: title-medium + item count. |
| **Item Row** | Checkbox (left), ingredient name (body-large), quantity (body-medium, right-aligned). Checked items: strikethrough, 50% opacity, move to bottom of group. |
| **Summary Footer** | Fixed bottom: 'X of Y items checked'. Progress bar. Phase 1 adds 'Check Pantry' button. |

## 8.11 Profile Screen

| **Header** | Profile photo (80dp circle, tap to change). Name (title-large). Username (body-medium, Slate). Edit icon. |
| --- | --- |
| **Sections** | List-style menu grouped into sections. Each item: icon (left), label (body-large), chevron (right). Dividers between groups. |
| **Group 1: Personal** | Edit Profile (photo, name, gender, DOB), Email (with verify badge if unverified), Password. |
| **Group 2: Preferences** | Food Preference, Allergies, Cuisine Preferences, Breakfast, Lunch & Dinner, Role, Family Members. Each opens respective onboarding section for editing. |
| **Group 3: Settings** | Notifications, App Demo (Phase 2). |
| **Group 4: Premium** | Subscription status. If free: 'Upgrade to Premium' card with gold accent, plan comparison link. If premium: plan name + renewal date. |
| **Group 5: Account** | Link Social Accounts (Phase 1), Logout (red text), Delete Account. |
| **Scroll** | Full screen scrollable. Footer tab bar remains visible. |

## 8.12 Modal Screens

| **Lock Modal** | Title: 'Lock this meal'. 3 large buttons: Breakfast, Lunch, Dinner. Each 56dp, icon + label. Tap one to lock for that slot. 'Cancel' text button at bottom. |
| --- | --- |
| **Never Modal** | Title: 'Remove [Dish Name]?' Body: 'We won't suggest this dish again unless your preferences change significantly.' Buttons: 'Yes, Never' (red), 'Cancel' (gray). |
| **Not Today Modal** | Title: 'Not [Dish Name] today?' Body: 'We'll move it to another day and suggest something new.' Buttons: 'Move It' (orange), 'Cancel' (gray). Shows destination date. |
| **Date Picker Modal** | Title: 'Add to Plan'. Calendar view (current month). Tap a date. Then select slot: B/L/D buttons. 'Confirm' primary button. |
| **Gesture Tutorial** | Full-screen overlay, semi-transparent black (60%). 3 sequential callouts with hand gesture illustrations. Dots navigation. 'Got it' button on last step. Shown once on first Home visit. |

# 9. Responsive & Platform Rules

| **Rule** | **iOS** | **Android** |
| --- | --- | --- |
| **Status Bar** | Light/dark content adapts to screen background. Respect Dynamic Island on iPhone 14+. | Transparent status bar. Content draws behind. Material You color extraction if possible. |
| **Navigation** | No hardware back button. Back: left arrow or edge swipe. Bottom tab bar matches iOS tab bar pattern. | Hardware/gesture back button supported. Bottom nav matches Material 3 pattern. |
| **Safe Areas** | Top: notch/Dynamic Island. Bottom: 34px home indicator. Respect all safe area insets. | Top: status bar height. Bottom: navigation bar. Edge-to-edge with WindowInsets. |
| **Haptics** | UIImpactFeedbackGenerator: .light for swipe, .medium for lock, .heavy for Never. UINotificationFeedbackGenerator for confirmations. | VibrationEffect: EFFECT_CLICK for taps, EFFECT_HEAVY_CLICK for Never, EFFECT_TICK for swipe. |
| **Typography** | System Dynamic Type support. App respects user's text size preference. Test from XS to XXXL. | System font scaling (sp units). Test from 0.85x to 1.3x. |
| **Minimum Device** | iPhone SE (3rd gen): 375 x 667pt. Everything must be usable at this size. | 320dp width (very small phones). Week View may need horizontal scroll at this size. |
| **Dark Mode** | Not in MVP. Architecture supports it via semantic color tokens. Planned for Phase 1 or 2. | Same as iOS. All colors defined as tokens, not hardcoded. Dark variants defined but not activated. |

# 10. Photography & Image Guidelines

| **Guideline** | **Specification** |
| --- | --- |
| **Style** | Overhead or 45-degree angle shots. Natural lighting. Vibrant but not oversaturated. Indian dishes styled authentically (served in traditional vessels where appropriate). |
| **Resolution** | Minimum 1080 x 720px per dish photo. Optimized for mobile (WebP format, quality 80%). Lazy-loaded with blur-up placeholder. |
| **Consistency** | All photos should feel like they're from the same photographer. Consistent color temperature (warm). Similar plating style. Same lighting direction. |
| **Background** | Prefer natural surfaces: wooden tables, marble, banana leaves, steel thali plates. Avoid solid-color studio backgrounds. Contextual elements (spices, herbs) around the dish are encouraged. |
| **Fallback** | If no photo available for a recipe: attractive food-category illustration (e.g., generic 'breakfast' illustration). Never show empty/broken image states. |
| **Placeholder** | During load: blurred color swatch matching the dish's dominant color. Skeleton shimmer over the blur. Transition: blur clears when full image loads (300ms). |
| **File Naming** | recipe_[id]_[size].webp. Sizes: thumb (240px), card (720px), hero (1080px). CDN-served with appropriate caching headers. |
| **Sourcing** | Phase 1 options: licensed stock (Unsplash, Pexels food collections), commissioned photography batch (budget: Rs 5,000-8,000 for 100 dishes), AI-generated food photography (Midjourney/DALL-E for gap-filling, with quality review). |

# 11. Design Token Summary

Complete token reference for developers implementing the design system. All values should be defined as constants/variables in code, never hardcoded.

| **Token Category** | **Token Name** | **Value** |
| --- | --- | --- |
| Corner Radius | **radius-sm** | 8px (inputs, chips) |
| Corner Radius | **radius-md** | 12px (cards in lists, buttons) |
| Corner Radius | **radius-lg** | 20px (meal cards, bottom sheets) |
| Corner Radius | **radius-xl** | 24px (modals) |
| Corner Radius | **radius-full** | 50% (avatar circles, FAB) |
| Elevation | **elevation-none** | 0 (flat elements) |
| Elevation | **elevation-low** | 0 2px 8px rgba(0,0,0,0.06) (subtle cards) |
| Elevation | **elevation-medium** | 0 4px 12px rgba(0,0,0,0.08) (meal cards) |
| Elevation | **elevation-high** | 0 8px 24px rgba(0,0,0,0.15) (lifted/dragging) |
| Elevation | **elevation-modal** | 0 16px 48px rgba(0,0,0,0.2) (modals) |
| Z-Index | **z-base** | 0 (default) |
| Z-Index | **z-card** | 10 (meal cards) |
| Z-Index | **z-sticky** | 100 (sticky headers, tab bars) |
| Z-Index | **z-overlay** | 200 (gesture tutorial, modals) |
| Z-Index | **z-toast** | 300 (snackbars, toasts) |
| Opacity | **opacity-disabled** | 0.4 (disabled buttons, grayed tabs) |
| Opacity | **opacity-overlay** | 0.5 (modal backdrop) |
| Opacity | **opacity-hover** | 0.08 (icon button press state) |
| Duration | **duration-fast** | 150ms (micro-interactions) |
| Duration | **duration-normal** | 250ms (card swipes, transitions) |
| Duration | **duration-slow** | 350ms (dismiss animations, page transitions) |
| Easing | **ease-default** | cubic-bezier(0.4, 0, 0.2, 1) |
| Easing | **ease-enter** | cubic-bezier(0, 0, 0.2, 1) |
| Easing | **ease-exit** | cubic-bezier(0.4, 0, 1, 1) |
| Easing | **ease-spring** | cubic-bezier(0.175, 0.885, 0.32, 1.275) |

# 12. Design-to-Development Handoff Checklist

| **Before Handoff** | **Developer Must Verify** |
| --- | --- |
| All 30 MVP screens wireframed in Figma/Sketch | Screen inventory matches IA doc (Doc #8) exactly |
| All component states documented (default, pressed, disabled, error, loading) | All gesture interactions prototyped and tested on real device |
| Color tokens exported as JSON/code variables | WCAG AA contrast ratios verified for all text-background pairs |
| Typography scale tested at all system font sizes | Touch targets verified at 48dp minimum for all interactive elements |
| Animation specs attached to each relevant screen | 60fps animation performance verified on mid-range Android device |
| Real food photography sourced for top 50 recipes | Image loading tested on 3G: blur-up placeholders work correctly |
| Onboarding bucket system prototyped with drag-drop | Bucket system tested with 20+ items: performance and usability verified |
| Gesture tutorial overlay designed and reviewed | First-time user can understand gestures without external help |

# 13. Next Steps

- Set up Figma project with this design system as a shared library

- Create all color, typography, and spacing tokens as Figma styles

- Build the Meal Card component in Figma with all states and variants

- Build the Bucket Selector component in Figma with drag-drop prototype

- Wireframe all 30 MVP screens in priority order: Home Day View first

- Create interactive prototype linking all screens for usability testing

- Source or commission food photography for initial 50 recipes

- Test gesture interactions (swipe, long-press) on physical devices

- Begin Document #10: Recommendation Engine specification

- Begin Document #11: Technical Architecture with design token export strategy

***This design system is a living document.**** It will evolve as screens are wireframed, tested, and refined. All changes must maintain consistency with the three pillars: Fresh **&** Vibrant, Rounded **&** Soft, Real Photography.*

Page
