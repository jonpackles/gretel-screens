# Phase 1 Migration - Project Restructure

## Overview
Phase 1 introduces a new organized project structure with better separation of concerns and easier imports.

## New Structure

### `/src/shared/`
Contains reusable code used across multiple features:
- **`components/`** - UI components (Button, Card, LazyVideo, MediaDisplay)
- **`hooks/`** - Custom React hooks (useKeyboard, useContainerSize, usePoseDetection)
- **`utils/`** - Pure utility functions
- **`types/`** - TypeScript type definitions
- **`constants/`** - App-wide constants
- **`config/`** - Configuration and defaults

### `/src/features/`
Domain-specific modules (to be populated in future phases):
- **`display/`** - Display modes and screen management
- **`content/`** - Content management functionality
- **`dashboard/`** - Dashboard-specific logic
- **`integrations/`** - External service integrations

## Key Changes

### 1. Dynamic Screen Routing
- **Before**: `/app/screens/screen-a/page.tsx` and `/app/screens/screen-b/page.tsx`
- **After**: `/app/[screen]/page.tsx` handles any screen ID dynamically

### 2. Centralized Constants
```typescript
// Instead of hardcoded values throughout the app
import { AVAILABLE_MODES, DEFAULT_MODE_DURATIONS } from '@/constants/modes';
```

### 3. Improved TypeScript Paths
```typescript
// Clean imports using new path mapping
import { useKeyboard, useContainerSize } from '@/hooks';
import { MediaItem, ModeName } from '@/types';
import { APP_DEFAULTS } from '@/config/defaults';
```

### 4. Reusable Hooks
- **`useKeyboard`** - Centralized keyboard navigation
- **`useContainerSize`** - Container size tracking for responsive modes

## Migration Status

### ✅ Completed
- [x] New directory structure created
- [x] Shared utilities and types moved
- [x] Dynamic screen routing implemented
- [x] TypeScript path mapping configured
- [x] Reusable hooks created
- [x] Constants centralized

### 📋 Next Steps (Future Phases)
- [ ] Move modes to `src/features/display/modes/`
- [ ] Extract services from components
- [ ] Restructure API routes
- [ ] Implement mode registry pattern
- [ ] Clean up old test screens

## Usage Examples

### Using the new keyboard hook:
```typescript
import { useKeyboard } from '@/hooks';

function MyComponent() {
  useKeyboard({
    onNext: () => setIndex(i => i + 1),
    onPrev: () => setIndex(i => i - 1),
  });
}
```

### Using centralized constants:
```typescript
import { AVAILABLE_MODES, APP_DEFAULTS } from '@/constants';

const duration = APP_DEFAULTS.FADE_DURATION;
```

### Accessing screens:
- Visit `/screen-a` or `/screen-b` (uses dynamic routing)
- Add new screens by just using `/screen-c`, `/screen-d`, etc.

## Testing
- Verify existing functionality works unchanged
- Test dynamic screen routing with `/screen-a` and `/screen-b`
- Ensure TypeScript compilation succeeds with new paths 