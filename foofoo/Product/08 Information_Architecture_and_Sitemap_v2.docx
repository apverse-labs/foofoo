*Information Architecture **&** Sitemap  |  Confidential*

DOCUMENT #8

**Information Architecture**

&

**App Sitemap**

AI-Powered Meal Decision Assistant

India-First  |  Android-Only MVP (iOS Phase 0.5)  |  Based on PRD v3

*Version 1.0  |  April 2026  |  Confidential*

# 1. Document Purpose

This document defines the structural blueprint of the app — every screen, every navigation path, every state. It serves as the single reference for designers (wireframing), developers (routing and navigation implementation), and QA (test coverage mapping).

It is built directly from the PRD v3 (Document #6-7) and maps all 67 Features across 7 phases into a navigable screen hierarchy. Screens marked with phase tags indicate when they become available.

## 1.1 Reading This Document

- **Screen Hierarchy (Section 2):** The complete tree of every screen in the app, organized by depth level

- **Navigation Model (Section 3):** How users move between screens — footer tabs, gestures, buttons, notifications

- **Screen Inventory (Section 4):** Every unique screen listed with its elements, entry points, and exit points

- **User Flow Maps (Section 5):** End-to-end journeys for key tasks (onboarding, daily use, cooking, etc.)

- **State Management (Section 6):** How screens behave differently based on user state (new vs returning, locked vs unlocked, etc.)

- **Deep Link Map (Section 7):** Notification and external entry points into specific screens

# 2. Complete Screen Hierarchy

The full app sitemap as a tree structure. Depth indicates parent-child relationships. Phase tags show when each screen becomes available.

## 2.1 Pre-Authentication

■ **Splash Screen****  [MVP]**

■ **Intro Screens****  [MVP]**

▸ **Intro 1: 'Are You Tired'****  [MVP]**

▸ **Intro 2: 'What If'****  [MVP]**

▸ **Intro 3: 'Find Your Rhythm'****  [MVP]**

■ **Auth Gate****  [MVP]**

▸ **Sign Up (Email + Password)****  [MVP]**

○ Email Verification Pending**  [MVP]**

○ Email Verified Confirmation**  [MVP]**

▸ **Sign In (Email + Password)****  [MVP]**

○ Forgot Password**  [MVP]**

○ Password Reset Sent**  [MVP]**

▸ **Google Sign-In****  [Phase 1]**

▸ **Guest Mode Entry****  [Phase 1]**

## 2.2 Onboarding (Post Sign-Up)

■ **Onboarding Flow (7 Steps)****  [MVP]**

▸ **Step 1: Profile Setup (Name, Username, Email, Location)****  [MVP]**

▸ **Step 2: Food Preference (Veg/Non-Veg/Jain/Vegan)****  [MVP]**

▸ **Step 3: Allergies****  [MVP]**

▸ **Step 4: Cuisine Preferences (Bucket Sorting)****  [MVP]**

▸ **Step 5: Breakfast Preferences (Bucket Sorting)****  [MVP]**

▸ **Step 6: Lunch ****&**** Dinner Preferences (Bucket Sorting)****  [MVP]**

▸ **Step 7: Almost There (Role, Notifications, Family, Pantry Prompt)****  [MVP]**

○ Family Member Add (inline)**  [MVP]**

○ Pantry Setup Prompt (leads to Pantry in Phase 1)**  [Phase 1]**

## 2.3 Main App (Post-Onboarding)

■ **TAB 1: Planner (Home)****  [MVP]**

▸ **Day View****  [MVP]**

○ Breakfast Card (Swipeable Carousel)**  [MVP]**

○ Lunch Card (Swipeable Carousel)**  [MVP]**

○ Dinner Card (Swipeable Carousel)**  [MVP]**

○ Carousel End → Search Redirect**  [Phase 1]**

▸ **Week View****  [MVP]**

○ Week Grid (BLD x 7 Days)**  [MVP]**

○ Cell Expanded View**  [MVP]**

▸ **Filters Bar****  [MVP]**

○ Day/Week Toggle**  [MVP]**

○ Meal Filter (B/L/D)**  [MVP]**

○ Cuisine Quick Filter**  [MVP]**

○ Protein Filter**  [MVP]**

○ Mode Selector**  [Phase 2]**

○ Mood Selector**  [Phase 2]**

▸ **Grocery List (from planner context)****  [MVP]**

■ **Meal Detail Page****  [MVP]**

▸ **Hero Image + Dish Info****  [MVP]**

▸ **Ingredients Checklist****  [MVP]**

○ Check Pantry (comparison view)**  [Phase 1]**

▸ **Ingredients List (simple)****  [MVP]**

▸ **Recipe (Audio)****  [Phase 1]**

▸ **Recipe (Video)****  [Phase 1]**

▸ **Lock Button (select slot: B/L/D)****  [MVP]**

▸ **Plus Button (add to specific date)****  [MVP]**

▸ **Family Vote Button****  [Phase 2]**

▸ **Rating****  [Phase 2]**

▸ **Add to Diary****  [Phase 2]**

▸ **Show Variants (community)****  [Phase 2]**

▸ **Order Online (Zomato/Swiggy)****  [Phase 3]**

■ **Search****  [MVP]**

▸ **Search Results (PLP)****  [MVP]**

▸ **Filters Panel****  [MVP]**

○ Cuisine Filter**  [MVP]**

○ Meal Type Filter**  [MVP]**

○ Protein Filter**  [MVP]**

○ Sub-Category Filter**  [Phase 1]**

○ Cooking Time Filter**  [Phase 1]**

○ Calorie Filter**  [Phase 1]**

○ Complexity Filter**  [Phase 1]**

○ Pantry Available Filter**  [Phase 1]**

■ **Meal Listing Page (Suggestions PLP)****  [MVP]**

▸ **Card Grid / List View****  [MVP]**

▸ **Filters (same as Search)****  [MVP]**

## 2.4 Footer Tabs 2-4

■ **TAB 2: Pantry****  [Phase 1]**

▸ **Pantry Item List (by category)****  [Phase 1]**

▸ **Add Item: Manual (search + image grid)****  [Phase 1]**

▸ **Add Item: WhatsApp Integration****  [Phase 1]**

○ Photo Upload → AI Identification → Confirm**  [Phase 1]**

○ Text Message → AI Parse → Confirm**  [Phase 1]**

▸ **Add Item: OCR Scan****  [Phase 1]**

○ Camera Capture → AI Identification → Select/Deselect → Add**  [Phase 1]**

▸ **Missing Items (from meal plan)****  [Phase 1]**

○ Buy Online (Blinkit/Zepto links)**  [Phase 3]**

■ **TAB 3: Diary****  [Phase 2]**

▸ **Date-wise Meal Log****  [Phase 2]**

▸ **Diary Entry Detail****  [Phase 2]**

○ Photos**  [Phase 2]**

○ Recipe Changes / Notes**  [Phase 2]**

○ Rating**  [Phase 2]**

▸ **Hate List (Never items)****  [Phase 2]**

▸ **Filters: B/L/D | Cuisine | Time Period****  [Phase 2]**

■ **TAB 4: Profile****  [MVP]**

▸ **Profile Info (Photo, Name, Gender, DOB)****  [MVP]**

▸ **Email (Verify / Change)****  [MVP]**

▸ **Link Social Accounts****  [Phase 1]**

▸ **Change Preferences (re-run onboarding sections)****  [MVP]**

○ Edit Food Preference**  [MVP]**

○ Edit Allergies**  [MVP]**

○ Edit Cuisine Buckets**  [MVP]**

○ Edit Breakfast Buckets**  [MVP]**

○ Edit Lunch & Dinner Buckets**  [MVP]**

○ Edit Role (Cook/Instruct)**  [MVP]**

○ Edit Family Members**  [MVP]**

▸ **Notification Settings****  [MVP]**

▸ **Password Management****  [MVP]**

▸ **App Demo/Tutorial****  [Phase 2]**

▸ **Premium Subscription****  [MVP]**

○ Plan Comparison**  [MVP]**

○ Payment / Upgrade**  [MVP]**

▸ **Logout****  [MVP]**

## 2.5 Overlay / Modal Screens

■ **Gesture Tutorial Overlay (first-time)****  [MVP]**

■ **Lock Confirmation Modal (Select B/L/D)****  [MVP]**

■ **Never Confirmation ('Won't show again')****  [MVP]**

■ **Not Today Confirmation ('Moved to [date]')****  [MVP]**

■ **Family Vote Modal****  [Phase 2]**

■ **Add to Date Picker Modal****  [MVP]**

■ **Notification Permission Modal (onboarding)****  [MVP]**

■ **Location Permission Modal (onboarding)****  [MVP]**

■ **Carousel End Prompt ('Want something specific?')****  [Phase 1]**

## 2.6 Social Screens (Phase 3)

■ **Social: My Public Profile****  [Phase 3]**

■ **Social: Other User Profile****  [Phase 3]**

■ **Social: Search Users****  [Phase 3]**

■ **Social: Explore Feed****  [Phase 3]**

■ **Social: Post Detail (Likes, Comments)****  [Phase 3]**

■ **Social: Followers / Following List****  [Phase 3]**

## 2.7 Phase 4 Screens

■ **Voice Cooking Assistant****  [Phase 4]**

■ **Chef Login ****&**** Dashboard****  [Phase 4]**

■ **Dietician Services Hub****  [Phase 4]**

■ **Waste Minimizer Dashboard****  [Phase 4]**

# 3. Navigation Model

## 3.1 Primary Navigation (Footer Tabs)

| **Position** | **Tab** | **Destination** | **Phase** |
| --- | --- | --- | --- |
| **1** | **Planner** | Home Page (Day View default). The primary screen. Always returns to current day. | **MVP** |
| **2** | **Pantry** | Pantry Item List. Grayed out with 'Coming Soon' badge in MVP. | **Phase 1** |
| **3** | **Diary** | Date-wise Meal Log. Grayed out with 'Coming Soon' badge in MVP/Phase 1. | **Phase 2** |
| **4** | **Profile** | User profile and settings screen. | **MVP** |

**Design Rule:** Footer is always visible on main screens (Home, Pantry, Diary, Profile). Hidden on: Auth screens, Onboarding, Meal Detail Page (full-screen), Search (full-screen overlay), Modals.

## 3.2 Gesture Navigation

| **Gesture** | **Context** | **Result** | **Phase** |
| --- | --- | --- | --- |
| **Swipe Left/Right** | Home: Meal Card | Horizontal card stack: browse next/prev AI suggestion for that slot | **MVP** |
| **Swipe Left/Right** | Meal Detail Page | Navigate to next/prev dish in same slot | **MVP** |
| **Swipe Left/Right** | Intro Screens | Navigate between intro pages | **MVP** |
| **Long Press + Down** | Home: Meal Card | Never: permanently demote dish. Confirmation modal. Replacement loads. | **MVP** |
| **Long Press + Down** | Meal Detail Page | Same Never action. Returns to Home with replacement. | **MVP** |
| **Long Press + Up** | Home: Meal Card | Not Today: remove from today, move to future date. Confirmation modal. | **MVP** |
| **Long Press + Up** | Meal Detail Page | Same Not Today action. Returns to Home with replacement. | **MVP** |
| **Tap** | Home: Meal Card | Opens Meal Detail Page for that dish. | **MVP** |
| **Tap** | Week View: Cell | Expands cell to show details inline, or navigates to Day View for that date. | **MVP** |
| **Back Gesture/Button** | Meal Detail Page | Returns to Home (Day/Week View). | **MVP** |
| **Back Gesture/Button** | Search | Returns to previous screen (Home or Meal Detail). | **MVP** |
| **Pull Down** | Home: Day View | Refresh meal plan for today (regenerate suggestions). | **MVP** |

## 3.3 Button-Triggered Navigation

| **Button / Action** | **Located On** | **Navigates To** | **Phase** |
| --- | --- | --- | --- |
| **Search Icon** | Home Top Bar | Search Screen (full-screen overlay) | **MVP** |
| **Notification Bell** | Home Top Bar | Notifications List | **MVP** |
| **Grocery List Button** | Home Page | Grocery List Screen (context: today or week) | **MVP** |
| **Recipe (tap card)** | Home Meal Card | Meal Detail Page | **MVP** |
| **Ingredients (icon)** | Home Meal Card | Meal Detail → Ingredients section | **MVP** |
| **Lock Icon** | Home Meal Card | Lock Confirmation Modal (B/L/D selector) | **MVP** |
| **Lock Button** | Meal Detail Page | Lock Confirmation Modal | **MVP** |
| **Plus Button** | Meal Detail Page | Date Picker Modal (add to future date) | **MVP** |
| **Family Vote** | Meal Detail Page | Family Vote Modal | **Phase 2** |
| **Add to Diary** | Meal Detail Page | Diary Entry Form (photos, notes, rating) | **Phase 2** |
| **Order Online** | Meal Detail Page | External: Zomato/Swiggy deep link | **Phase 3** |
| **Check Pantry** | Meal Detail: Ingredients | Pantry Comparison View (overlay) | **Phase 1** |
| **'Want something specific?'** | Carousel End | Search with meal-slot pre-filtered | **Phase 1** |
| **Edit Preferences** | Profile Page | Re-run specific onboarding step | **MVP** |
| **Premium / Upgrade** | Profile Page | Plan Comparison + Payment | **MVP** |

# 4. Screen Inventory (MVP)

Every unique screen that must be designed and built for MVP launch, with key elements and navigation context.

| **#** | **Screen** | **Key Elements** | **Entry Points** |
| --- | --- | --- | --- |
| **1** | **Splash** | Logo, animation, auto-transition (2s) | App launch |
| **2** | **Intro 1** | 'Are You Tired' headline, illustration, swipe indicator | Splash (auto) or first launch |
| **3** | **Intro 2** | 'What If' headline, automation illustration, swipe indicator | Swipe from Intro 1 |
| **4** | **Intro 3** | 'Find Your Rhythm' headline, success imagery, 'Let's Go' CTA | Swipe from Intro 2 |
| **5** | **Auth Gate** | Sign In + Sign Up buttons | 'Let's Go' button |
| **6** | **Sign Up** | Name, email, password fields, submit, T&C link | Auth Gate |
| **7** | **Email Verification** | Pending state, resend link, check email prompt | Post sign-up |
| **8** | **Sign In** | Email, password, forgot password link, submit | Auth Gate |
| **9** | **Forgot Password** | Email input, send reset link | Sign In page |
| **10** | **Onboarding 1** | Name, username, email (opt), location access | Post email verify |
| **11** | **Onboarding 2** | Food pref icons (veg/non-veg/jain/vegan), single-select | Onboarding 1 |
| **12** | **Onboarding 3** | Allergy multi-select chips + custom input | Onboarding 2 |
| **13** | **Onboarding 4** | Cuisine list with drag-drop buckets (F/O/N) | Onboarding 3 |
| **14** | **Onboarding 5** | Breakfast items with drag-drop buckets | Onboarding 4 |
| **15** | **Onboarding 6** | Lunch & dinner items (combined) with buckets | Onboarding 5 |
| **16** | **Onboarding 7** | Role (cook/instruct), notifications, family, pantry prompt | Onboarding 6 |
| **17** | **Home: Day View** | 3 meal cards (Rubik's Cube), filters bar, top bar, footer | Login, notification, footer tab |
| **18** | **Home: Week View** | BLD x 7-day grid, tap to expand, navigate weeks | Day/Week toggle |
| **19** | **Meal Detail** | Hero image, info, ingredients, recipe, lock, plus button | Tap meal card |
| **20** | **Search** | Search bar, results PLP, filter panel | Top bar icon, carousel end |
| **21** | **Meal Listing** | Card grid/list, filters, browsable catalog | Search results, deep links |
| **22** | **Grocery List** | Ingredient checklist, serving adjuster, checkboxes | Home button |
| **23** | **Profile** | Photo, info, preferences, notifications, password, premium, logout | Footer tab |
| **24** | **Gesture Tutorial** | Overlay with swipe/long-press instructions, skip option | First time on Home |
| **25** | **Lock Modal** | B/L/D selector, confirm button | Lock icon tap |
| **26** | **Never Modal** | Confirmation: 'Won't suggest again', undo option | Long press + down |
| **27** | **Not Today Modal** | 'Moved to [date]' confirmation, undo option | Long press + up |
| **28** | **Date Picker Modal** | Calendar date selector, confirm | Plus button |
| **29** | **Permission Modals** | Notification + location permission requests | Onboarding step 7 |
| **30** | **Notifications List** | Chronological list of notifications | Bell icon |

**Total MVP Screens: 30.** This includes 7 onboarding steps, 6 modal/overlay screens, and 17 main screens. Phase 1 adds approximately 12 screens. Phase 2 adds approximately 10 screens. Phase 3 adds approximately 8 screens.

# 5. User Flow Maps

End-to-end journeys for the most critical tasks. Each flow maps the happy path and key alternative paths.

## 5.1 Flow: First Launch → First Meal Plan

| **#** | **Step** | **Screen + Action** |
| --- | --- | --- |
| **1** | **App Opens** | Splash Screen → auto-transition (2s) |
| **2** | **Intro Walkthrough** | Intro 1 → Swipe → Intro 2 → Swipe → Intro 3 → Tap 'Let's Go' |
| **3** | **Sign Up** | Auth Gate → Tap 'Sign Up' → Fill name, email, password → Submit |
| **4** | **Verify Email** | Email Verification screen. User checks email, taps link. App detects verification. |
| **5** | **Onboarding** | Steps 1-7 sequentially. Progress bar at top. Steps 1-6 mandatory, Step 7 skippable. |
| **6** | **Plan Generation** | Loading screen: 'Creating your first meal plan...' AI processes onboarding data + weather. |
| **7** | **Home: Day View** | First meal plan displayed. Gesture Tutorial Overlay shown (first time only). 3 meal cards ready. |
| **8** | **Explore** | User swipes cards, taps to view recipes. Morning notification set for tomorrow. |

**Alternative Paths:** If user exits during onboarding → progress saved, resume on next open. If email not verified within 24hrs → reminder notification. If location denied → use IP-based city for weather (degraded but functional).

## 5.2 Flow: Daily Returning User

| **#** | **Step** | **Screen + Action** |
| --- | --- | --- |
| **1** | **Morning Notification** | Push: 'Your meal plan is ready!' at 7:30 AM. Tap opens app. |
| **2** | **Home: Day View** | Today's BLD plan displayed. Previously locked meals preserved. New suggestions for unlocked slots. |
| **3** | **Browse Breakfast** | Swipe left/right on breakfast card to explore options. Find one they like. |
| **4** | **Lock Breakfast** | Tap lock icon → Lock Modal → Select 'Breakfast' → Confirm. Card shows lock indicator. |
| **5** | **Check Lunch Recipe** | Tap lunch card → Meal Detail Page. Review recipe and ingredients. |
| **6** | **Reject a Dinner** | Long press dinner card + drag down → Never Modal → Confirm. Replacement loads. |
| **7** | **Grocery Run** | Tap Grocery List button → See all ingredients for today's meals. Check off items while shopping. |
| **8** | **Evening** | Open app, review tomorrow's plan (if generated). Optionally swap dishes. |

## 5.3 Flow: Week Planning (Sunday Evening)

| **#** | **Step** | **Screen + Action** |
| --- | --- | --- |
| **1** | **Open Week View** | Toggle Day → Week on Home. Full BLD x 7-day grid displayed. |
| **2** | **Scan the Week** | Scroll through the week. Each cell shows dish name, image, calories. |
| **3** | **Swap Wednesday** | Tap Wednesday lunch cell → expands → swipe to browse alternatives → find preferred option. |
| **4** | **Lock Key Meals** | Lock 3-4 meals for the week that the user is committed to cooking. |
| **5** | **Not Today Friday** | Long press + up on Friday dinner → moves to Saturday. Replacement loads for Friday. |
| **6** | **Grocery List** | Tap Grocery List → see full week's ingredients. Quantity adjusted for number of people. |
| **7** | **Go Shopping** | Use checklist while at the store. Check off purchased items. |

## 5.4 Flow: Search for Specific Dish

| **#** | **Step** | **Screen + Action** |
| --- | --- | --- |
| **1** | **Open Search** | Tap search icon on Home top bar → Search screen opens. |
| **2** | **Type Query** | Enter 'biryani' or 'quick breakfast' or 'paneer'. Results load as user types. |
| **3** | **Apply Filters** | Optional: filter by cuisine, protein, meal type. Phase 1 adds time/calorie/complexity. |
| **4** | **Browse Results** | Scroll through meal card results (PLP view). Each shows image, name, time, calories. |
| **5** | **Tap to View** | Tap any result → Meal Detail Page. Full recipe and ingredients. |
| **6** | **Add to Plan** | Plus button → Date Picker → Select date and slot (B/L/D) → Confirm. Dish added to plan. |

## 5.5 Flow: Carousel End → Search (Phase 1)

| **#** | **Step** | **Screen + Action** |
| --- | --- | --- |
| **1** | **Exhaust Options** | User swipes through all 5-8 AI suggestions for a meal slot. |
| **2** | **End Card** | Special card appears: 'None of these? Want something specific?' with Search button. |
| **3** | **Pre-Filtered Search** | Tap → Search opens with meal slot pre-filtered (e.g., 'Lunch' filter active). |
| **4** | **Find ****&**** Add** | User searches, finds dish, uses Plus button to add to today's slot. |

# 6. Screen State Management

Key screens behave differently based on user state. Designers and developers must account for these variations.

| **Screen** | **State** | **Behavior** |
| --- | --- | --- |
| **Home: Day View** | *First time ever* | Gesture Tutorial Overlay shown. All 3 cards have fresh suggestions. No locked meals. |
| **Home: Day View** | *Returning user (has history)* | Cards show AI-personalized suggestions. Previously locked meals preserved. History influences options. |
| **Home: Day View** | *Offline* | Show cached plan from last sync. Swipe disabled (can't fetch new options). Banner: 'Offline — showing last plan.' |
| **Home: Day View** | *All meals locked* | All 3 cards show lock icons. Swipe disabled on locked cards. 'Your day is planned!' banner. |
| **Meal Card** | *Default (unlocked)* | Swipeable carousel. Lock icon empty. Long-press gestures active. |
| **Meal Card** | *Locked* | Swipe disabled. Lock icon filled. Long-press gestures disabled. Tap still opens Detail. |
| **Week View** | *Current week* | 'This Week' label. Today's column highlighted. Past days grayed out. |
| **Week View** | *Future week* | Full week editable. No grayed-out days. |
| **Grocery List** | *Day context* | Ingredients for today's 3 meals only. |
| **Grocery List** | *Week context* | Ingredients for all 21 meals (7 days x 3 slots). Quantities aggregated. |
| **Search** | *From top bar* | Empty search. No pre-applied filters. |
| **Search** | *From carousel end* | Meal slot filter pre-applied (e.g., 'Lunch'). Search bar focused. |
| **Profile** | *Email unverified* | Email field shows 'Verify' badge. Reminder banner at top. |
| **Profile** | *Free tier (post 3 months)* | Premium section shows comparison and upgrade CTA. |
| **Footer: Pantry** | *MVP* | Tab visible but grayed. Tap shows 'Coming in next update!' message. |
| **Footer: Diary** | *MVP / Phase 1* | Tab visible but grayed. Same 'Coming soon' treatment. |
| **Onboarding** | *Resumed (partial)* | Progress bar shows last completed step. User resumes from next incomplete step. |

# 7. Deep Link & Notification Entry Points

Screens that can be accessed directly from notifications, external links, or shortcuts. Critical for push notification UX.

| **Trigger** | **Destination Screen** | **Context Passed** | **Phase** |
| --- | --- | --- | --- |
| **Morning Plan Notification** | Home: Day View (today) | date=today | **MVP** |
| **Onboarding Incomplete Nudge** | Onboarding: last incomplete step | step=N | **MVP** |
| **Re-engagement Notification** | Home: Day View (today) | date=today | **MVP** |
| **Evening Prep Notification** | Home: Day View (tomorrow) | date=tomorrow | **Phase 1** |
| **Not Locked Reminder** | Home: Day View (today) | highlight=unlocked | **Phase 1** |
| **Family Vote Notification** | Meal Detail Page for voted dish | recipe_id, vote_id | **Phase 2** |
| **Shared Meal Plan Link** | Home: Day View (specific date) | user_id, date | **Phase 3** |
| **Social Activity** | Social: Post Detail | post_id | **Phase 3** |
| **App Store / Website Link** | Splash → Intro (new) or Home (existing) | utm_source | **MVP** |

# 8. Screen Count by Phase

| **Phase** | **New Screens** | **Cumulative** | **Key Additions** |
| --- | --- | --- | --- |
| **MVP** | **30** | **30** | Auth, onboarding, home (day+week), meal detail, search, grocery, profile, modals, gesture tutorial |
| **Phase 1** | **~12** | **~42** | Pantry (full system), carousel end prompt, advanced filters, rich media recipe views, guest mode, Google sign-in |
| **Phase 2** | **~10** | **~52** | Diary (full system), mood/mode selectors, family voting, ratings, variants, demo/tutorial, premium features (insights, health, smart ingredients) |
| **Phase 3** | **~8** | **~60** | Social suite (profile, search, explore, feed, post detail, followers), order online, WhatsApp/IoT integration |
| **Phase 4** | **~5** | **~65** | Voice assistant, chef dashboard, dietician hub, waste minimizer |

# 9. Information Architecture Principles

Design rules that govern the app's structure and should be followed by all designers and developers.

| **Principle** | **Application** |
| --- | --- |
| **Max 3 Taps to Core Action** | From Home to any core action (lock, recipe, grocery, search) takes no more than 3 taps. Most take 1-2. |
| **Gesture Consistency** | Same gesture = same action everywhere. Swipe L/R = browse. Long press down = never. Long press up = not today. No exceptions. |
| **Progressive Disclosure** | MVP footer shows 4 tabs, but 2 are grayed out. Users see the full app structure from day 1 but only what's available now. No sudden navigation changes when new phases launch. |
| **Context Preservation** | Navigating to Meal Detail from Day View → back returns to Day View at same position. From Week View → back returns to Week View at same cell. Search returns to source screen. |
| **Minimal Modals** | Modals only for confirmations (lock, never, not today, date picker). Never for content. Content always gets a full screen. |
| **Offline Graceful** | Cached data displayed with subtle 'Offline' indicator. No error screens. No broken states. Swipe to browse disabled (can't fetch). Everything else works. |
| **Future-Proof Footer** | 4 tabs from MVP, even though 2 are inactive. This prevents jarring navigation changes when Pantry and Diary launch. Users are already familiar with the tab positions. |
| **One Bucket Per Item** | Throughout the app, any preference item (cuisine, food item) can only be in one bucket at a time. This is enforced in onboarding and in Edit Preferences. |
| **Smart Defaults** | The current meal suggestion IS the plan. No explicit 'accept' needed. Lock only to protect. This minimizes required user actions. |
| **Notification as Entry Point** | Every notification deep-links to a specific screen with context. Never opens to a generic landing page. |

# 10. Next Steps

- Begin Document #9: UI/UX Wireframes based on this screen inventory (start with MVP's 30 screens)

- Wireframe priority order: Home Day View → Onboarding bucket system → Meal Detail → Search → Modals

- Create gesture prototype for usability testing (swipe + long-press interactions)

- Map Week View grid layout for various screen sizes (phones and tablets)

- Define animation specs: swipe transitions, lock animation, never/not-today confirmations

- Begin Document #10: Technical Architecture (routing, state management, navigation stack)

- Create a click-through prototype linking all 30 MVP screens for stakeholder review

***This document maps directly to PRD v3.**** Any screen not listed here is not in scope. Any new screen requires a PRD change request first, then an update to this IA document.*

Page
