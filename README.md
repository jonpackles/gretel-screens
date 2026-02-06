# Gretel Screens

A Next.js application that drives physical display screens with rotating visual modes. Media content from a shared Dropbox folder is presented through configurable display modes (slideshow, grid, mosaic, etc.) that auto-rotate on a timer. A built-in dashboard manages content, sequences, and settings.

## Quick Start

```bash
# 1. Symlink your assets folder
ln -s /path/to/Gretel_Internal/10_Assets ./public/content/linked-content

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the home page with links to each screen and the dashboard.

## How It Works

### Screens and Mode Rotation

Each physical screen runs at a URL like `/screen-a` or `/screen-b`. When a screen loads, it:

1. Fetches its **sequence** from the API (`/api/sequences?screen=screen-a`) — a JSON file listing which modes to play, in what order, and for how long.
2. Hands the sequence to **ModeManager**, which orchestrates everything:
   - Fetches media from the Dropbox-linked content folders
   - Selects the right image variant (small, medium, original) per mode
   - Renders the current mode component full-screen
   - Auto-rotates to the next mode after each duration elapses, with a fade transition
   - Preloads the next mode's assets for smooth transitions
3. Keyboard arrows and `postMessage` events allow manual navigation between modes.

### Display Modes

There are 9 built-in modes, all registered in a single file:

| Mode | Duration | Content Source |
|------|----------|----------------|
| Slideshow | 10s | Project images (original) |
| Vertical Carousel | 5s | Poster images (medium) |
| Grid | 30s | Project images (small) |
| Mosaic | 40s | Project images (medium) |
| Paths | 30s | Project images (medium) |
| Pose House | 30s | Camera / pose detection |
| Inform Calendar | 30s | Google Calendar events |
| Inform Projects | 30s | Google Sheets data |
| Inform | 30s | Combined event blocks |

Modes fall into two categories:
- **Media-driven** (Slideshow, Grid, Mosaic, etc.) — receive shuffled media arrays from ModeManager
- **Data-driven** (Inform, Pose House, etc.) — fetch their own data via hooks/APIs

### Adding a New Mode

Only two steps:

1. Create a component file in `src/features/display/modes/` (see `_ModeTemplate.tsx` for patterns)
2. Add one entry to `MODE_REGISTRY` in `src/features/display/modes/registry.ts`

No other files need editing. The registry is the single source of truth for mode names, durations, media paths, and components.

### Dashboard

The dashboard at `/dashboard` has four sections:

- **Content** (`/dashboard/content`) — Browse projects, view media files, toggle visibility, delete items
- **Sequences** (`/dashboard/sequences`) — Configure which modes each screen plays, in what order, with what durations
- **Inform** (`/dashboard/inform`) — Monitor Google Calendar events and Sheets data feeding the Inform modes
- **Settings** (`/dashboard/settings`) — Toggle overlays, auto-rotate, debug mode, quality settings

### Media and Variants

Media lives in `public/content/linked-content/` (a symlink to the shared Dropbox assets folder). The system supports image variants — the same image at different resolutions (`-sm`, `-md`, `-lg`, `-xl` suffixes). Each mode declares its preferred variant size so ModeManager fetches and selects the right resolution automatically.

Files can be hidden via a visibility database (`visibility.json`) without deleting them from disk.

### Inform System

The Inform feature pulls external data into display modes:
- **Google Calendar** — upcoming events rendered as content blocks
- **Google Sheets** — project data rendered as cards

Content is fetched via `/api/inform`, processed into typed blocks, and displayed by the Inform mode components. Dashboard polling keeps it fresh.

## Project Structure

```
app/
  [screen]/page.tsx        Dynamic screen display (loads sequence, renders ModeManager)
  dashboard/               Dashboard UI (content, sequences, inform, settings)
  api/                     API routes (media, sequences, settings, calendar, inform)

src/
  features/
    display/
      modes/               All display mode components + registry
        registry.ts        Single source of truth for mode metadata
        BaseMode.tsx        Shared wrapper (viewport container + empty state)
        _ModeTemplate.tsx   Reference template for creating new modes
        Slideshow.tsx       Example media-driven mode
        Inform.tsx          Example data-driven mode
        ...
      components/
        ModeManager/        Orchestrates mode rotation, media fetching, transitions
      services/             Sequence and preload services
      types/                Display feature types
    content/                Content management (dashboard media browser)
    dashboard/              Dashboard layout and components

  shared/
    constants/modes.ts      Re-exports from registry + screen constants
    types/                  MediaItem, common types
    hooks/                  useKeyboard, useInformContent, useGlobalSettings, etc.
    utils/                  variantUtils, mediaMetadata, visibilityDb

lib/
  inform/                   Google Calendar + Sheets integration
  credentials/              Google API credentials

public/
  content/linked-content/   Symlink to Dropbox assets folder
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/media` | GET | List media files with filtering, pagination, variant support |
| `/api/media/visibility` | GET/POST | Toggle file visibility |
| `/api/media/cache` | POST | Cache invalidation |
| `/api/sequences` | GET/POST | Load/save screen sequences |
| `/api/settings` | GET/POST | Global display settings |
| `/api/calendar` | GET | Google Calendar events |
| `/api/inform` | GET | Processed Inform content |
| `/api/inform/content` | POST | Raw Inform content |
| `/api/inform/image-upload` | POST | Upload images for Inform blocks |
| `/api/rename` | POST | Rename files |

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, SCSS Modules
- **Media:** Image variant system, ffprobe metadata extraction
- **Pose Detection:** MediaPipe
- **Integrations:** Google Calendar API, Google Sheets API
- **Monitoring:** Sentry
