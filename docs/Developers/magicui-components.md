# 🪄 MagicUI Components Reference

## Available Components
All components can be imported using:
```bash
npx shadcn@latest add "https://magicui.design/r/[component].json"
```

### 🌍 Backgrounds
- **Globe** (`globe.json`) - Interactive 3D globe ✅ INSTALLED
- **Dot Pattern** (`dot-pattern.json`) - Animated dot backgrounds
- **Grid Pattern** (`grid-pattern.json`) - Grid overlay backgrounds
- **Linear Gradient** (`linear-gradient.json`) - Animated gradient backgrounds
- **Radial Gradient** (`radial-gradient.json`) - Radial gradient effects
- **Ripple** (`ripple.json`) - Ripple animation effects

### 🔘 Buttons
- **Animated Subscribe Button** (`animated-subscribe-button.json`) - Subscribe with animations
- **Border Beam** (`border-beam.json`) - Animated border effects
- **Magic Button** (`magic-button.json`) - Button with special effects
- **Shimmer Button** (`shimmer-button.json`) - Shimmering button effect
- **Pulse Button** (`pulse-button.json`) - Pulsing button animation

### ✨ Text Animations
- **Animated Shiny Text** (`animated-shiny-text.json`) - Shimmering text effect
- **Blur In** (`blur-in.json`) - Text blur-in animation
- **Fade In** (`fade-in.json`) - Text fade-in animation
- **Flip Text** (`flip-text.json`) - Text flipping animation
- **Gradual Spacing** (`gradual-spacing.json`) - Letter spacing animation
- **Letter Pullup** (`letter-pullup.json`) - Letter pull-up effect
- **Scroll Based Velocity** (`scroll-based-velocity.json`) - Scroll-based text effects
- **Separate Away** (`separate-away.json`) - Text separation animation
- **Typing Animation** (`typing-animation.json`) - Typewriter effect
- **Word Fade In** (`word-fade-in.json`) - Word-by-word fade in
- **Word Pull Up** (`word-pull-up.json`) - Word pull-up animation
- **Word Rotate** (`word-rotate.json`) - Rotating word animation

### 🎬 Animations
- **Animated Beam** (`animated-beam.json`) - Connection beam animation ✅ INSTALLED
- **Animated List** (`animated-list.json`) - List item animations
- **Box Reveal** (`box-reveal.json`) - Box reveal animation
- **Confetti** (`confetti.json`) - Confetti particle effects
- **Cool Mode** (`cool-mode.json`) - Special interaction effects
- **Fireworks** (`fireworks.json`) - Fireworks animation
- **Floating Dock** (`floating-dock.json`) - Floating navigation dock
- **Interactive Icon Cloud** (`interactive-icon-cloud.json`) - 3D icon cloud
- **Meteor** (`meteor.json`) - Meteor trail effects
- **Number Ticker** (`number-ticker.json`) - Animated number counting
- **Orbiting Circles** (`orbiting-circles.json`) - Circular orbit animation
- **Particles** (`particles.json`) - Particle system effects
- **Rainbow Button** (`rainbow-button.json`) - Rainbow color effects
- **Sparkles** (`sparkles.json`) - Sparkle particle effects
- **Wavy Text** (`wavy-text.json`) - Wavy text animation

### 🌟 Special Effects
- **Avatar Circles** (`avatar-circles.json`) - Overlapping avatar display
- **Bento Grid** (`bento-grid.json`) - Grid layout component
- **Border Trail** (`border-trail.json`) - Animated border trails
- **Dock** (`dock.json`) - macOS-style dock
- **Hyper Text** (`hyper-text.json`) - Animated hypertext effect
- **Magic Card** (`magic-card.json`) - Interactive card component
- **Marquee** (`marquee.json`) - Scrolling marquee text ✅ INSTALLED
- **Retro Grid** (`retro-grid.json`) - Retro-style grid background
- **Safari** (`safari.json`) - Browser mockup component
- **Shine Border** (`shine-border.json`) - Shining border effect
- **Spinning Text** (`spinning-text.json`) - Circular spinning text

### 📱 Device Mocks
- **iPhone 15 Pro** (`iphone-15-pro.json`) - iPhone mockup component
- **Safari** (`safari.json`) - Browser window mockup

### 🎨 Templates
- **Portfolio** (Free template) - Complete portfolio template

## Implementation Notes
- All components are built with React + Tailwind CSS
- Compatible with shadcn/ui architecture
- Accessible by default with ARIA support
- Mobile-responsive design
- Support for dark/light themes

## Import Pattern
```jsx
import { ComponentName } from "@/components/magicui/component-name";

export default function Example() {
  return (
    <div>
      <ComponentName />
    </div>
  );
}
```

## Usage in Project
When implementing features, refer to this list for:
- Enhanced landing page animations
- Interactive dashboard elements
- Engaging workflow builder effects
- Professional loading states
- Modern UI enhancements

Remember to update imports/exports when adding new MagicUI components!