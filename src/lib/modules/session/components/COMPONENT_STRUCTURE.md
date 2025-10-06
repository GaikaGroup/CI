# SessionsList Component Structure

## Visual Layout

```
┌─────────────────────────────────────┐
│  Sessions                    [+]    │  ← Header with title and New Session button
├─────────────────────────────────────┤
│  🔍 Search sessions...              │  ← Search input (debounced)
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Math Practice            ✏️ 🗑️ │ │  ← Session item (selected)
│  │ Working on algebra...          │ │
│  │ 📅 2h ago  💬 10  ✨ fun  🌐 EN │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Spanish Lesson          ✏️ 🗑️  │ │  ← Session item
│  │ Practicing conjugations...     │ │
│  │ 📅 1d ago  💬 5  📚 learn  🌐 ES│ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ History Discussion      ✏️ 🗑️  │ │  ← Session item
│  │ 📅 3d ago  💬 15  ✨ fun  🌐 EN │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Previous]  Page 1 of 3  [Next]   │  ← Pagination
└─────────────────────────────────────┘
```

## Component Hierarchy

```
SessionsList.svelte
├── Header Section
│   ├── Title ("Sessions")
│   └── New Session Button (+)
│
├── Search Section
│   └── Search Input (with icon)
│
├── Content Section
│   ├── Loading State (skeleton loaders)
│   ├── Error State (error message + retry)
│   ├── Empty State (no sessions message)
│   └── Sessions List
│       └── Session Items (repeated)
│           ├── Title (editable)
│           ├── Preview text
│           ├── Metadata row
│           │   ├── Date
│           │   ├── Message count
│           │   ├── Mode
│           │   └── Language
│           └── Action buttons
│               ├── Edit button
│               └── Delete button
│
├── Pagination Section
│   ├── Previous button
│   ├── Page indicator
│   └── Next button
│
└── Modals
    ├── New Session Modal
    │   ├── Title input
    │   ├── Mode selection
    │   ├── Language dropdown
    │   └── Action buttons
    └── Delete Confirmation Modal
        ├── Warning message
        └── Action buttons
```

## State Flow

```
User Action → Component Handler → Store Method → API Call → Store Update → UI Update
```

### Example: Creating a New Session

```
1. User clicks [+] button
   ↓
2. openNewSessionModal()
   ↓
3. Modal opens with form
   ↓
4. User fills form and clicks "Create"
   ↓
5. handleCreateSession()
   ↓
6. sessionStore.createSession(title, mode, language)
   ↓
7. SessionService.createSession() → Database
   ↓
8. Store updates with new session
   ↓
9. UI updates (new session appears in list)
   ↓
10. Navigate to /sessions/{id}
```

### Example: Searching Sessions

```
1. User types in search input
   ↓
2. handleSearchInput() triggered
   ↓
3. Debounce timer starts (300ms)
   ↓
4. Timer completes
   ↓
5. sessionStore.searchSessions(query)
   ↓
6. SessionService.searchSessions() → Database
   ↓
7. Store updates with filtered sessions
   ↓
8. UI updates (filtered list displayed)
```

## Props & Events

### Props (Input)
```typescript
{
  selectedSessionId?: string | null  // Currently selected session ID
}
```

### Events (Output)
```typescript
// Prop binding updates
selectedSessionId: string | null  // Updates when session is selected
```

## Store Dependencies

```
sessionStore
├── sessions: Session[]
├── currentSession: Session | null
├── loading: boolean
├── error: string | null
├── searchQuery: string
├── selectedSessionId: string | null
└── pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNextPage: boolean
    hasPreviousPage: boolean
}

isSessionLoading: boolean
sessionError: string | null
user: User | null
isAuthenticated: boolean
```

## CSS Classes Structure

```
.flex.flex-col.h-full                    ← Main container
  .p-4.border-b                          ← Header
    .flex.items-center.justify-between   ← Title + Button row
    .relative                            ← Search container
  
  .flex-1.overflow-y-auto                ← Content area
    .p-4.space-y-3                       ← Loading skeleton
    .p-4.text-center                     ← Error state
    .p-8.text-center                     ← Empty state
    .divide-y                            ← Sessions list
      button.w-full.p-4                  ← Session item
        .flex.items-start.justify-between
        .text-sm.line-clamp-2            ← Preview
        .flex.items-center.gap-3         ← Metadata
    
    .p-4.border-t.flex                   ← Pagination
```

## Icon Usage

| Icon | Component | Usage |
|------|-----------|-------|
| Plus | lucide-svelte | New Session button |
| Search | lucide-svelte | Search input |
| Calendar | lucide-svelte | Date metadata |
| MessageSquare | lucide-svelte | Message count, empty state |
| Trash2 | lucide-svelte | Delete button |
| Edit2 | lucide-svelte | Edit button |
| Globe | lucide-svelte | Language metadata |
| Sparkles | lucide-svelte | Fun mode indicator |
| BookOpen | lucide-svelte | Learn mode indicator |
| X | lucide-svelte | Modal close button |

## Responsive Behavior

### Desktop (≥1024px)
- Fixed width sidebar (320px)
- Full feature set visible
- Hover states active

### Tablet (768px - 1023px)
- Collapsible sidebar
- Touch-optimized buttons
- Adjusted spacing

### Mobile (<768px)
- Full-width overlay
- Larger touch targets
- Simplified layout
- Bottom sheet for modals

## Accessibility Features

### Keyboard Navigation
- Tab: Move between interactive elements
- Enter: Activate buttons, save edits
- Escape: Cancel edits, close modals
- Arrow keys: Navigate list (future enhancement)

### Screen Reader Support
- Semantic HTML (header, nav, main, button)
- ARIA labels on icon buttons
- ARIA roles on modals
- Live regions for dynamic content

### Focus Management
- Visible focus indicators
- Focus trap in modals
- Focus restoration after modal close
- Skip links (future enhancement)

## Performance Considerations

### Optimizations
- Debounced search (300ms)
- Pagination (20 items per page)
- Virtual scrolling (future enhancement)
- Lazy loading images (future enhancement)
- Memoized computed values

### Bundle Size
- Component: ~15KB (uncompressed)
- Dependencies: lucide-svelte icons
- Total impact: Minimal

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Layout | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ | ✅ |
| Modals | ✅ | ✅ | ✅ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ | ✅ |
| Animations | ✅ | ✅ | ✅ | ✅ |

## Testing Strategy

### Unit Tests
- Component rendering
- User interactions
- State management
- Edge cases

### Integration Tests
- Store integration
- API calls
- Navigation
- Error handling

### E2E Tests (Future)
- Complete user flows
- Cross-browser testing
- Performance testing
- Accessibility testing
