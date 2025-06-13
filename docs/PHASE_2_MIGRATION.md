# Phase 2 Migration - Feature Extraction

## Overview
Phase 2 extracts business logic into services, implements a mode registry pattern, and organizes code into domain-driven features.

## New Architecture

### **Feature-Based Structure**
```
src/features/display/
├── components/
│   └── ModeManager/       # Orchestrates mode switching
├── modes/
│   ├── Calendar.tsx       # All individual modes
│   ├── Grid.tsx
│   ├── Paths.tsx
│   └── index.ts          # Mode registry with lazy loading
├── services/
│   ├── mediaService.ts    # Media fetching and caching
│   ├── preloadService.ts  # Preloading logic
│   └── sequenceService.ts # Sequence management
└── types/
    └── index.ts          # Display-specific types
```

## Key Improvements

### **1. Mode Registry Pattern**
- **Centralized mode management** with lazy loading
- **Type-safe mode access** via registry
- **Easy to add new modes** without touching ModeManager

```typescript
import { MODE_REGISTRY, getModeComponent } from '@/features/display/modes';

// Lazy-loaded modes
const Calendar = lazy(() => import('./Calendar'));
const Grid = lazy(() => import('./Grid'));
```

### **2. Service Layer Architecture**

#### **MediaService**
- Fetches and caches media from API
- Handles shuffling and filtering
- Provides media statistics

```typescript
const mediaCache = await MediaService.fetchMultipleMedia(paths);
const videos = MediaService.filterByType(media, 'video');
```

#### **PreloadService**
- Preloads modes and media for performance
- Handles timeouts and error recovery
- Provides preload statistics

```typescript
await PreloadService.preloadNextMode(currentIndex, modes, media);
```

#### **SequenceService**
- Manages screen sequence configuration
- Validates sequence data
- Handles API communication

```typescript
const sequence = await SequenceService.getSequence('screen-a');
```

### **3. Refactored ModeManager**
- **Focused on orchestration** rather than implementation
- **Uses services** for all business logic
- **Cleaner, more testable** code
- **Suspense integration** for better loading states

### **4. Updated Import Structure**
```typescript
// Before (scattered imports)
import ModeManager from '../modes/ModeManager';
import { AVAILABLE_MODES } from './constants';

// After (clean feature imports)
import { ModeManager, ModeSequenceItem } from '@/features/display';
import { AVAILABLE_MODES } from '@/shared/constants/modes';
```

## Benefits

### **🎯 Separation of Concerns**
- **UI logic** separated from **business logic**
- **Services** are independently testable
- **Components** focus on presentation

### **🚀 Performance**
- **Lazy loading** of modes reduces initial bundle size
- **Improved preloading** with dedicated service
- **Better caching** strategies

### **🔧 Maintainability**
- **Clear responsibilities** for each service
- **Easy to find** related functionality
- **Consistent patterns** across features

### **📈 Scalability**
- **Easy to add** new modes to registry
- **Service layer** can be extended independently
- **Feature boundaries** prevent code coupling

## Migration Changes

### **Updated Files**
- ✅ **`app/[screen]/page.tsx`** - Uses new ModeManager import
- ✅ **`app/dashboard/sequences/page.tsx`** - Uses shared constants
- ✅ **All modes** moved to `src/features/display/modes/`
- ✅ **ModeManager** refactored to use services

### **New Files Created**
- 🆕 **`src/features/display/modes/index.ts`** - Mode registry
- 🆕 **`src/features/display/services/`** - Service layer
- 🆕 **`src/features/display/types/`** - Feature types
- 🆕 **`src/features/display/index.ts`** - Main feature export

### **Preserved Functionality**
- ✅ **All existing modes** work unchanged
- ✅ **Dashboard** still manages sequences
- ✅ **Keyboard navigation** still works
- ✅ **Preloading** still functions (improved)

## Usage Examples

### **Adding a New Mode**
```typescript
// 1. Create mode component
export default function NewMode({ media }: { media: MediaItem[] }) {
  return <div>New mode content</div>;
}

// 2. Add to mode registry
export const MODE_REGISTRY = {
  // ... existing modes
  'New Mode': lazy(() => import('./NewMode')),
};

// 3. Add to constants
export const AVAILABLE_MODES = [
  // ... existing modes
  'New Mode',
] as const;
```

### **Using Services Directly**
```typescript
// Fetch media
const media = await MediaService.fetchMedia('linked-content/projects');

// Preload next mode
await PreloadService.preloadNextMode(currentIndex, modes, mediaMap);

// Validate sequence
const { isValid, errors } = SequenceService.validateSequence(sequence);
```

## Testing Phase 2

1. ✅ **Verify screens work**: Visit `/screen-a` and `/screen-b`
2. ✅ **Test mode switching**: Use arrow keys to navigate
3. ✅ **Check dashboard**: Sequence editor should work
4. ✅ **Verify preloading**: Check console for preload logs
5. ✅ **Test lazy loading**: Network tab should show mode chunks

## Next Steps (Phase 3)
- [ ] Restructure API routes
- [ ] Clean up old test screens
- [ ] Add comprehensive error boundaries
- [ ] Implement mode metrics and analytics 