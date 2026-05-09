# Design System Inspired by 다인가구

## 1. Visual Theme & Atmosphere

다인가구’s interface should feel like a private, living scrapbook for close friends: casual, immediate, social, and lightly nostalgic without becoming decorative. The product is not a polished creator tool; it is a “same day, same moment” micro-vlog space where friends capture tiny slices of life and see them come together as a shared day.

The design language is mobile-first, intimate, and low-friction. It should feel more like opening a friend group’s camera roll than entering a content platform. The UI must get out of the way of capture, playback, and friend presence. Surfaces are clean and mostly light, typography is direct and rounded, and color is used sparingly to signal time, activity, friendship, and successful capture.

**Core personality:**
- Real-time, not edited.
- Friend-first, not audience-first.
- Warm, playful, and fast.
- Everyday, not performative.
- Youthful, but not childish.
- Camera-native, but not cinematic.

**Key visual characteristics:**
- Rounded mobile cards that feel like stacked memories.
- Large video/photo cells with minimal chrome.
- Soft off-white backgrounds, black text, and one vivid “signal” accent.
- Time-based UI patterns: hourly markers, day strips, progress rings, timeline chips.
- Split-screen/grid layouts for friend logs.
- Friendly microcopy and conversational empty states.
- Subtle motion: snap, stitch, reveal, pulse, and loop.

---

## 2. Color Palette & Roles

### Primary Neutrals

- **다인가구 Ink** (`#111111`)  
  Primary text, icons, active nav, high-priority labels.

- **Soft Black** (`#1C1C1E`)  
  Camera overlays, bottom sheets, dark-mode cards, video controls.

- **Paper White** (`#FFFFFF`)  
  Main content surfaces, cards, sheets, modal backgrounds.

- **Warm Canvas** (`#FAF8F4`)  
  App background, onboarding background, non-media pages.

- **Cloud Gray** (`#F1F1F1`)  
  Secondary surfaces, inactive chips, skeleton loaders.

- **Line Gray** (`#E6E3DE`)  
  Dividers, hairline borders, input outlines.

- **Muted Text** (`#77746E`)  
  Secondary copy, timestamps, captions, helper text.

- **Disabled Gray** (`#B9B5AE`)  
  Disabled controls, placeholder text, inactive icons.

### Brand Accent

- **다인가구 Coral** (`#FF5A66`)  
  Primary CTA, capture button state, notification badges, active friendship moments.

- **Coral Light** (`#FFECEF`)  
  Accent background for selected chips, friend prompts, soft alerts.

- **Coral Pressed** (`#E84755`)  
  Pressed state for primary buttons and capture actions.

### Social & Time Accents

- **Morning Peach** (`#FFD6B8`)  
  Morning time blocks, warm day-start states.

- **Noon Yellow** (`#FFE66D`)  
  Noon/highlight markers, optimistic activity states.

- **Evening Lavender** (`#CBB7FF`)  
  Evening time blocks, soft reflective moments.

- **Night Blue** (`#1F2A44`)  
  Night sections, dark playback mode, late-day logs.

- **Friend Green** (`#2ED47A`)  
  Friend active/online indicator, successful upload, completed log.

- **Link Blue** (`#3478F6`)  
  Text links, settings actions, system-level navigation.

### Semantic Colors

- **Success** (`#2ED47A`)  
  Saved, uploaded, joined, completed.

- **Warning** (`#FFB020`)  
  Missed log, incomplete time slot, low urgency warning.

- **Error** (`#FF3B30`)  
  Failed upload, blocked camera, destructive actions.

- **Info** (`#3478F6`)  
  Permission help, feature education, neutral guidance.

### Gradients

Use gradients only for temporal atmosphere, not as generic decoration.

- **Day Glow**: `linear-gradient(135deg, #FFD6B8 0%, #FFE66D 45%, #FFFFFF 100%)`
- **Friend Moment**: `linear-gradient(135deg, #FF5A66 0%, #CBB7FF 100%)`
- **Night Log**: `linear-gradient(180deg, #1F2A44 0%, #111111 100%)`

---

## 3. Typography Rules

### Font Family

- **Primary Sans**: `Pretendard`, `Inter`, `SF Pro Display`, `system-ui`, `sans-serif`
- **Numeric / Time UI**: `SF Mono`, `Roboto Mono`, `ui-monospace`, `monospace`
- **Fallback Korean**: `Apple SD Gothic Neo`, `Noto Sans KR`, `sans-serif`

다인가구 should use a clean system-adjacent sans. Korean and English text must feel equally native. Avoid overly geometric or corporate fonts.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
|---|---:|---:|---:|---:|---:|---|
| App Hero | Primary Sans | 40px | 800 | 1.05 | -1.2px | Onboarding headline |
| Page Title | Primary Sans | 28px | 800 | 1.15 | -0.7px | Main screen title |
| Section Title | Primary Sans | 22px | 700 | 1.25 | -0.4px | “오늘의 로그”, “친구들” |
| Card Title | Primary Sans | 18px | 700 | 1.3 | -0.2px | Log card titles |
| Body Large | Primary Sans | 17px | 500 | 1.55 | 0 | Onboarding, descriptions |
| Body | Primary Sans | 15px | 500 | 1.45 | 0 | Main copy, captions |
| Body Small | Primary Sans | 13px | 500 | 1.35 | 0 | Helper text, metadata |
| Caption | Primary Sans | 12px | 500 | 1.25 | 0 | Timestamps, labels |
| Micro Label | Primary Sans | 11px | 700 | 1.1 | 0.2px | Badges, nav labels |
| Time Number | Monospace | 14px | 600 | 1.1 | -0.1px | Hour chips, timers |
| Camera Timer | Monospace | 32px | 700 | 1 | -0.8px | Recording countdown |

### Typography Principles

- **Use bold for friendliness, not authority.** Titles can be chunky and confident; body text should remain soft and readable.
- **Keep captions compact.** 다인가구 is a fast app; metadata should not compete with media.
- **Time should feel mechanical.** Use monospace for hourly slots, countdowns, and duration labels.
- **Korean-first rhythm.** Avoid English-only casing patterns. Do not overuse uppercase except for short technical labels like `LIVE`, `NOW`, or `2 SEC`.

---

## 4. Component Stylings

### Primary Button

Use for onboarding, joining a group, saving permissions, or starting a log.

```css
background: #111111;
color: #ffffff;
border-radius: 999px;
padding: 14px 20px;
font-size: 16px;
font-weight: 700;
box-shadow: 0 6px 18px rgba(17, 17, 17, 0.14);
```

**Hover / Pressed**
- Web hover: translateY(-1px), shadow slightly stronger.
- Mobile pressed: scale(0.98), background `#1C1C1E`.

### Accent Button

Use for capture, invite, and friend-specific actions.

```css
background: #FF5A66;
color: #ffffff;
border-radius: 999px;
padding: 14px 20px;
font-size: 16px;
font-weight: 800;
box-shadow: 0 8px 22px rgba(255, 90, 102, 0.28);
```

### Secondary Button

```css
background: #F1F1F1;
color: #111111;
border-radius: 999px;
padding: 12px 18px;
font-size: 15px;
font-weight: 700;
```

### Ghost Button

```css
background: transparent;
color: #111111;
border: 1px solid #E6E3DE;
border-radius: 999px;
padding: 11px 16px;
font-size: 14px;
font-weight: 700;
```

### Capture Button

The capture button is the emotional center of the UI.

```css
width: 76px;
height: 76px;
border-radius: 50%;
background: #FF5A66;
box-shadow:
  0 0 0 6px #FFFFFF,
  0 0 0 8px rgba(255, 90, 102, 0.18),
  0 10px 28px rgba(255, 90, 102, 0.35);
```

States:
- **Ready**: coral fill, white outer ring.
- **Recording**: inner dot contracts into rounded square; subtle pulse ring.
- **Uploading**: circular progress stroke around button.
- **Complete**: friend green check, quick haptic-like scale bounce.

### Log Card

Used for daily summaries, friend entries, and saved micro-vlogs.

```css
background: #FFFFFF;
border-radius: 24px;
padding: 14px;
box-shadow:
  0 1px 0 rgba(17, 17, 17, 0.04),
  0 8px 24px rgba(17, 17, 17, 0.08);
```

Structure:
- Media preview first.
- Friend/avatar row next.
- Time range and completion status below.
- CTA or overflow menu last.

### Split-Screen Log Grid

The signature component. It should show friends’ tiny clips as synchronized cells.

- Radius: 20px outer, 12px inner cells.
- Gap: 3px–6px.
- Background: `#111111` or `#F1F1F1` depending on media brightness.
- Each cell should have a small friend avatar/name chip.
- Current user cell can have coral outline.
- Missing slot uses blurred neutral placeholder with friendly copy.

### Time Slot Chip

```css
background: #FFFFFF;
color: #111111;
border: 1px solid #E6E3DE;
border-radius: 999px;
padding: 8px 11px;
font-family: SF Mono, ui-monospace;
font-size: 13px;
font-weight: 600;
```

States:
- **Completed**: `#111111` background, white text.
- **Current**: coral background, white text, pulsing dot.
- **Missed**: cloud gray background, muted text.
- **Friend updated**: coral light background, coral text.

### Avatar Stack

Friendship should be visible everywhere.

- Avatar size: 28px standard, 36px featured, 48px profile.
- Border: 2px solid white.
- Stack overlap: -8px.
- Active ring: `2px solid #2ED47A`.
- Recent update ring: `2px solid #FF5A66`.

### Inputs

```css
background: #F1F1F1;
border: 1px solid transparent;
border-radius: 18px;
padding: 14px 16px;
font-size: 16px;
font-weight: 500;
color: #111111;
```

Focus:
```css
background: #FFFFFF;
border-color: #FF5A66;
box-shadow: 0 0 0 4px rgba(255, 90, 102, 0.12);
```

### Bottom Sheets

다인가구 should rely on native-feeling bottom sheets for friend settings, sharing, time-slot details, and permission education.

```css
background: #FFFFFF;
border-radius: 28px 28px 0 0;
box-shadow: 0 -12px 40px rgba(17, 17, 17, 0.16);
padding: 20px;
```

- Drag handle: 36px × 5px, `#D8D3CB`, radius 999px.
- Title: 22px / 700.
- Actions: large rounded rows, 52px min height.

### Navigation

Mobile bottom navigation is preferred.

- Height: 76px–88px including safe area.
- Background: white with slight blur.
- Active item: 다인가구 Coral icon or filled pill.
- Inactive item: muted gray.
- Labels: 11px / 700.
- Center capture action may float above the nav.

```css
background: rgba(255, 255, 255, 0.88);
backdrop-filter: blur(18px);
border-top: 1px solid rgba(17, 17, 17, 0.06);
```

---

## 5. Layout Principles

### Mobile-First Frame

다인가구 is an iPhone-native social experience. Design every screen for one-handed use first.

- Primary interactions live in the lower 45% of the screen.
- Capture controls stay thumb-accessible.
- Destructive or advanced controls go into bottom sheets.
- Important media gets full width.
- Avoid dense dashboards.

### Spacing Scale

Use a soft 4px grid.

| Token | Value | Use |
|---|---:|---|
| `space-1` | 4px | Tiny gaps, icon/text gap |
| `space-2` | 8px | Chip gaps, compact padding |
| `space-3` | 12px | Card internal gaps |
| `space-4` | 16px | Standard screen padding |
| `space-5` | 20px | Sheet padding, section gaps |
| `space-6` | 24px | Card spacing, onboarding blocks |
| `space-8` | 32px | Major section spacing |
| `space-10` | 40px | Hero rhythm |
| `space-12` | 48px | Onboarding vertical rhythm |

### Screen Padding

- Mobile default: 16px.
- Dense media screen: 12px.
- Onboarding: 24px.
- Desktop preview/web landing: max-width 1120px, 24px side padding.

### Grid Rules

- Daily log grid: 2 columns by default for friend video blocks.
- Larger friend groups: adaptive mosaic, preserving equal visual weight.
- Time strip: horizontal scroll; do not wrap into multiple lines.
- Cards: single column on mobile, 2–3 columns only on tablet/desktop web.

### Whitespace Philosophy

Whitespace should feel like breathing room between memories. Do not over-pack the interface. 다인가구 should feel fast because it is clear, not because it is visually compressed.

---

## 6. Depth & Elevation

다인가구 uses soft, iOS-like elevation. Avoid harsh Material-style shadows.

| Level | Treatment | Use |
|---|---|---|
| Level 0 | No shadow | Main background, full-screen camera |
| Level 1 | `0 1px 0 rgba(17,17,17,0.05)` | Dividers, nav bars |
| Level 2 | `0 6px 18px rgba(17,17,17,0.08)` | Cards, chips, small floating items |
| Level 3 | `0 12px 36px rgba(17,17,17,0.14)` | Bottom sheets, overlays |
| Level 4 | `0 18px 54px rgba(17,17,17,0.20)` | Modals, full share previews |
| Accent Glow | `0 8px 22px rgba(255,90,102,0.28)` | Capture button, primary social CTA |

### Surface Hierarchy

1. **Canvas**: warm off-white.
2. **Cards**: pure white, rounded, soft shadow.
3. **Media**: full-bleed within cards, radius clipped.
4. **Controls**: floating, pill-shaped, high contrast.
5. **Overlays**: translucent black on video, white sheets for actions.

### Blur

Use blur for camera/video overlays and nav only.

```css
backdrop-filter: blur(18px);
background: rgba(255, 255, 255, 0.82);
```

For dark overlays:

```css
background: rgba(17, 17, 17, 0.42);
backdrop-filter: blur(10px);
```

---

## 7. Do’s and Don’ts

### Do

- Do make media the hero.
- Do keep capture and playback controls large and thumb-friendly.
- Do use coral only for meaningful actions or current moments.
- Do use rounded cards, rounded chips, and circular avatars consistently.
- Do show friend presence through avatars, rings, and small status dots.
- Do make time visible: hour chips, daily progress, current slot, missed slots.
- Do use conversational Korean microcopy.
- Do keep empty states warm and low-pressure.
- Do use playful motion when a log is captured, stitched, or completed.
- Do support safe-area padding on iOS.

### Don’t

- Don’t make 다인가구 look like a professional video editor.
- Don’t use heavy gradients behind every screen.
- Don’t overuse coral for decoration.
- Don’t create feeds that feel public, competitive, or influencer-oriented.
- Don’t add dense analytics, likes-first hierarchy, or vanity metrics.
- Don’t use sharp 4px enterprise corners for core surfaces.
- Don’t hide capture behind complex menus.
- Don’t use aggressive dark mode unless the user is in playback/camera context.
- Don’t make missed logs feel punitive; keep the tone gentle.

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| Mobile Small | <360px | Compress chips, reduce card radius slightly |
| Mobile | 360–430px | Primary target layout |
| Mobile Large | 430–600px | More generous media height, larger cards |
| Tablet | 600–900px | 2-column cards, centered mobile preview |
| Desktop | 900–1200px | Marketing/documentation layout, phone mockups |
| Wide | >1200px | Max-width containers, no stretched media |

### Mobile Adaptation

- Bottom navigation always respects safe area.
- Capture button remains fixed and reachable.
- Time chips scroll horizontally.
- Friend grids preserve cell spacing and crop media with `object-fit: cover`.
- Bottom sheets can cover 50%, 75%, or 92% of screen height.

### Desktop / Web Landing Adaptation

If 다인가구 needs a web landing page:
- Use a centered hero with a large phone mockup.
- Show split-screen log examples inside device frames.
- Use warm canvas background and coral CTA.
- Keep copy short and social.
- Use 2–3 feature cards maximum per row.
- Avoid enterprise SaaS dashboard styling.

### Touch Targets

- Minimum interactive target: 44px × 44px.
- Preferred primary action height: 52px–56px.
- Icon-only buttons: 44px circular.
- Camera controls: 64px–76px.

---

## 9. Agent Prompt Guide

### Quick Color Reference

- Background: Warm Canvas `#FAF8F4`
- Card: Paper White `#FFFFFF`
- Text: 다인가구 Ink `#111111`
- Muted Text: `#77746E`
- Border: Line Gray `#E6E3DE`
- Primary Accent: 다인가구 Coral `#FF5A66`
- Accent Background: Coral Light `#FFECEF`
- Success / Complete: Friend Green `#2ED47A`
- Current Time / Capture: 다인가구 Coral `#FF5A66`
- Night Playback: Night Blue `#1F2A44`

### Example Component Prompts

**Home screen**
> Create a mobile 다인가구 home screen on `#FAF8F4`. Use a bold 28px title, rounded white cards, and a horizontal row of monospace time-slot chips. The current hour chip is coral with white text. Below, show a split-screen friend log card with 2x2 video cells, rounded 20px corners, tiny avatar chips, and a soft shadow.

**Capture screen**
> Create a full-screen camera capture UI. Use minimal chrome, a large coral circular capture button fixed near the bottom, a monospace countdown timer, and a translucent top bar showing the current time slot. Add a white outer ring and coral glow to the capture button. Keep all secondary controls as circular translucent buttons.

**Friend log grid**
> Design a synchronized friend micro-vlog grid. Use equal media cells with 4px gaps, rounded outer corners, avatar badges in the lower-left of each cell, and a coral outline around the current user’s cell. Missing clips should show a blurred warm-gray placeholder with friendly Korean copy.

**Onboarding**
> Create an onboarding screen with warm canvas background, a large friendly headline in Korean, a phone mockup showing split-screen daily clips, and a black pill primary CTA. Use 다인가구 Coral only for highlights and small animated time dots.

**Bottom sheet**
> Create an iOS-style bottom sheet with white background, 28px top radius, drag handle, 22px bold title, rounded action rows, and soft shadow. Use coral for the recommended action and muted gray for secondary text.

### Iteration Guide

1. Start with a warm, mostly white mobile interface.
2. Make the media preview the largest object on screen.
3. Add time context: current hour, completed slots, missed slots.
4. Add friend presence through avatars, names, and status rings.
5. Use coral only for the live/current/primary moment.
6. Keep controls rounded, large, and thumb-friendly.
7. Add soft motion: pulse for current slot, bounce for completed capture, slide-up for sheets.
8. Avoid public-feed energy; every screen should feel private and close-friends oriented.

---

## 10. Suggested Design Tokens

```css
:root {
  --setlog-ink: #111111;
  --setlog-soft-black: #1C1C1E;
  --setlog-white: #FFFFFF;
  --setlog-canvas: #FAF8F4;
  --setlog-cloud: #F1F1F1;
  --setlog-line: #E6E3DE;
  --setlog-muted: #77746E;
  --setlog-disabled: #B9B5AE;

  --setlog-coral: #FF5A66;
  --setlog-coral-light: #FFECEF;
  --setlog-coral-pressed: #E84755;

  --setlog-morning: #FFD6B8;
  --setlog-noon: #FFE66D;
  --setlog-evening: #CBB7FF;
  --setlog-night: #1F2A44;
  --setlog-green: #2ED47A;
  --setlog-blue: #3478F6;

  --radius-chip: 999px;
  --radius-card: 24px;
  --radius-media: 20px;
  --radius-sheet: 28px;

  --shadow-card: 0 1px 0 rgba(17, 17, 17, 0.04), 0 8px 24px rgba(17, 17, 17, 0.08);
  --shadow-sheet: 0 -12px 40px rgba(17, 17, 17, 0.16);
  --shadow-coral: 0 8px 22px rgba(255, 90, 102, 0.28);

  --font-sans: Pretendard, Inter, "SF Pro Display", system-ui, sans-serif;
  --font-mono: "SF Mono", "Roboto Mono", ui-monospace, monospace;
}
```
