# Session Summary — HeroSection Refinement & Layout Polish

## Current HeroSection State (Final)

| Property | Value |
|----------|-------|
| Height | `120vh` |
| Scroll mapping | `[0, 0.24, 0.25, 0.49, 0.50, 0.74, 0.75, 1] → [0, 0, 1, 1, 2, 2, 3, 3]` |
| Video aspect ratio | `2.4:1` (ultra-wide cinematic) |
| Video width | `min(75%, 800px)` |
| Border radius | `18px` (all cards) |
| Video sources | 4 videos: `first-video.mp4` through `fourth-video.mp4` |

### What Changed This Session

1. **Height reduced** from 500vh → 375vh → 200vh → 140vh → 120vh (final)
2. **Scroll remapped** each time height changed; final mapping gives tight windows per video with snap zones
3. **Video aspect ratio**: 16:10 → 16:9 → 9:16 → 2.4:1 (current — ultra-wide)
4. **Video width**: 700px → 660px → 400px → 800px (current)
5. **All overlays removed from videos**: No backdrop-filter, no gradient overlays, no glass effects ON TOP of video content in both HeroSection and ProjectShowcase
6. **Effects migrated** from ProjectShowcase to HeroSection: glass reflection sweep, top edge glow, navigation dots
7. **Auto-scroll timer removed** (was buggy, rejected by user)
8. **Unused state removed**: `smoothValue`, `activeIndexRef` deleted
9. **Depth staging**: Non-active cards use staggered z-index, y-offset, scale, and opacity for perspective stack effect
10. **Float animation**: Independent timing per card (7s + index*1.5s duration, index*1.5s delay)

## Homepage Architecture (App.tsx)

Current section order in `App.tsx`:

| Order | Section | Component | Transition | Key Content |
|-------|---------|-----------|------------|-------------|
| 1 | Hero | `HeroSection` | none | 4 video stack, scroll-driven index |
| 2 | Neural Network | `NeuralNetworkSection` | variant 1 | Canvas animation, 400vh |
| 3 | Idea to System | `IdeaToSystem` | variant 3 | Scrollytelling timeline, 400vh |
| 4 | Projects | `ProjectShowcase` | variant 1 | 4 video cards, scroll-driven index |
| 5 | Capabilities | `LivingEcosystem` | variant 0 | Canvas node graph, 250vh |
| 6 | Experience | `HorizontalGallery` | variant 3 | Horizontal scroll gallery, 300vh |
| 7 | Why Treetiti | `WhySection` | variant 0 | Text reveal, 300vh |
| 8 | CTA | `CTASection` | variant 1 | Final call-to-action |

**Note:** The AGENTS.md spec lists a 5-scene structure (Hero, Services, Portfolio, Process, Final CTA) but the actual App.tsx routing is different and has 8 sections. The ServicesSection, ShowcaseSection, ProcessSection, AboutSection, ArchitectureSection, UGCSection, PackageSection, ContactSection, and CinematicHome components exist but are NOT used in the main App.tsx homepage.

## Component Inventory (Notable)

### Used in App.tsx:
- HeroSection, NeuralNetworkSection, IdeaToSystem, ProjectShowcase, LivingEcosystem, HorizontalGallery, WhySection, CTASection

### Exist but Not in Homepage Route:
- **CinematicHome.tsx** — appears to be an older/alternative version of the full page (not imported anywhere in App.tsx)
- **ServicesSection.tsx** — 13 AI service cards with CinematicPanel (App.tsx only shows ServiceModal from services data)
- **ShowcaseSection.tsx** — separate scroll-driven card showcase (not the same as ProjectShowcase)
- **ProcessSection.tsx** — 4-step process with animated canvas
- **AboutSection.tsx** — 5-scene about section with stat counters
- **ArchitectureSection.tsx** — images + stat meters
- **UGCSection.tsx** — video grid
- **PackageSection.tsx** — 5 pricing/package cards
- **ContactSection.tsx** — contact form with particle canvas
- **ContactForm.tsx** — form component (referenced by ContactSection only)
- **ScrollMarquee.tsx** — horizontal scrolling tag cloud
- **HorizontalScroll.tsx** — another horizontal scroll (different from HorizontalGallery)
- Several other utility/animation components

## Some Notes

- Lenis is initialized in `App.tsx` for smooth scrolling (not in individual sections)
- Global ambient background is in `AmbientBackground` component in App.tsx
- `SectionTransition` wraps most sections with cinematic clip-path/reveal animation + a subtle horizontal gradient line
- HeroSection and ProjectShowcase share a similar pattern: 4 videos, scroll-driven index, spring interpolation
- NeuralNetworkSection, LivingEcosystem use canvas-based animated backgrounds
- Most non-hero sections use `WhileInView` or `Viewport` triggers rather than scroll-linked animations
- ThemeSwitch component exists but dark-only theme is enforced
- AuthModal + Supabase auth connected
- ChatWidget + WhatsAppButton are always present on homepage

## User Priorities (from conversation)

- Every pixel must feel cinematic, premium, intentional
- Videos must be clean — no overlays/glass on top of video content
- Scroll should feel natural and responsive (not sluggish at 120vh)
- Mobile needs its own optimized experience (MobileVideoStack in HeroSection)
- Comprehensive layout polish across all sections was requested
