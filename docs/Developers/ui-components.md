# 🎨 UI Components Library

## Architecture
Our UI system combines **shadcn/ui** (base components) with **MagicUI** (animations) and custom **RPA-specific** components.

## 📦 Available Components

### shadcn/ui Base Components ✅ INSTALLED
```jsx
import { Button, Input, Card, Toaster } from '@/components/ui'
```

- **Button** - Accessible button with variants (default, destructive, outline, secondary, ghost, link)
- **Input** - Styled input field with focus states
- **Card** - Content container with header, content, footer sections  
- **Toaster** - Toast notification system (Sonner-based)

### MagicUI Animation Components ✅ INSTALLED
```jsx
import { Globe, Marquee, AnimatedBeam } from '@/components/ui'
```

- **Globe** - Interactive 3D globe
- **Marquee** - Scrolling text/content
- **AnimatedBeam** - Connection line animations

### Custom RPA Components
```jsx
import RpaFormField from '@/components/RpaFormField/RpaFormField'
```

- **RpaFormField** - Form field wrapper with validation, built on shadcn Input
- **ErrorBoundary** - React error boundary for crash handling
- **LoadingSpinner** - Accessible loading animation

## 🛠️ Installation Commands

### Add More shadcn/ui Components
```bash
# Forms & Data Entry
npx shadcn@latest add form
npx shadcn@latest add textarea  
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group

# Layout & Navigation
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add navigation-menu

# Data Display
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add separator

# Feedback
npx shadcn@latest add alert
npx shadcn@latest add progress
npx shadcn@latest add skeleton
```

### Add More MagicUI Components
```bash
# Backgrounds
npx shadcn@latest add "https://magicui.design/r/dot-pattern.json"
npx shadcn@latest add "https://magicui.design/r/grid-pattern.json" 

# Text Animations  
npx shadcn@latest add "https://magicui.design/r/typing-animation.json"
npx shadcn@latest add "https://magicui.design/r/word-rotate.json"

# Special Effects
npx shadcn@latest add "https://magicui.design/r/particles.json"
npx shadcn@latest add "https://magicui.design/r/sparkles.json"
```

## 🎯 Usage Patterns

### Basic Form
```jsx
import { Button } from '@/components/ui'
import RpaFormField from '@/components/RpaFormField/RpaFormField'

function MyForm() {
  return (
    <form className="space-y-4">
      <RpaFormField
        label="Workflow Name"
        value={name}
        onChange={setName}
        required
        error={errors.name}
      />
      <Button type="submit">Create Workflow</Button>
    </form>
  )
}
```

### Dashboard Cards
```jsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

function StatsCard({ title, value }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
```

### Animated Elements
```jsx
import { Globe, Marquee } from '@/components/ui'

function LandingPage() {
  return (
    <div>
      <Globe className="mx-auto" />
      <Marquee className="mt-8">
        <span>Feature 1</span>
        <span>Feature 2</span>
        <span>Feature 3</span>
      </Marquee>
    </div>
  )
}
```

## 🎨 Theming & Customization

### CSS Variables (Tailwind)
- `--background` / `--foreground` - Main colors
- `--primary` / `--primary-foreground` - Primary accent  
- `--secondary` / `--secondary-foreground` - Secondary accent
- `--muted` / `--muted-foreground` - Subtle backgrounds
- `--border` / `--input` / `--ring` - Border colors

### Custom Gradients (Legacy CSS)
- `var(--primary-gradient)` - Main brand gradient
- `var(--secondary-gradient)` - Secondary gradient  
- `var(--accent-gradient)` - Accent gradient

## 📱 Responsive Design
All components include:
- Mobile-first breakpoints
- Touch-friendly targets (44px minimum)
- Keyboard navigation
- Screen reader support
- High contrast mode support

## 🔄 Migration Guide

### Replace Custom Components
```jsx
// OLD - Custom button
<button className="create-workflow-btn">Create</button>

// NEW - shadcn Button  
<Button variant="default">Create</Button>
```

### Toast Notifications
```jsx
// OLD - Custom toast system
showToast('Success!', 'success')

// NEW - Sonner toast
import { toast } from 'sonner'
toast.success('Success!')
```

## 🧪 Testing
Components include:
- Accessibility testing via axe-core
- Visual regression tests
- Unit tests for interactions
- Cross-browser compatibility

Remember to update this documentation when adding new components!