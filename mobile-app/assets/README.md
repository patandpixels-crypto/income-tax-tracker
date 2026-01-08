# Assets Directory

This directory contains app assets like icons, splash screens, and images.

## Required Assets for Expo

When building for production, you'll need these assets:

### App Icon
- **File:** `icon.png`
- **Size:** 1024x1024 px
- **Format:** PNG with transparency

### Adaptive Icon (Android)
- **File:** `adaptive-icon.png`
- **Size:** 1024x1024 px
- **Format:** PNG with transparency
- **Safe Zone:** Keep important content within 66% center circle

### Splash Screen
- **File:** `splash.png`
- **Size:** 1284x2778 px (or larger)
- **Format:** PNG
- **Background:** White (#ffffff)

### Favicon (Web)
- **File:** `favicon.png`
- **Size:** 48x48 px
- **Format:** PNG

## Generating Assets

You can use these tools to generate app assets:

1. **[Expo Asset Generator](https://www.appicon.co/#app-icon)**
2. **[MakeAppIcon](https://makeappicon.com/)**
3. **[App Icon Generator](https://appicon.co/)**

## Current Status

For development, Expo will use default placeholder assets. Before publishing to app stores, replace these with your custom branded assets.

## Design Guidelines

### App Icon
- Simple, memorable design
- Avoid text (too small to read)
- High contrast
- Works at small sizes
- Represents your brand

### Color Scheme (Current App)
- Primary: `#8b5cf6` (Purple)
- Secondary: `#10b981` (Green)
- Background: `#f3f4f6` (Light Gray)
- Text: `#1f2937` (Dark Gray)

## Example Icon Ideas

For Income Tax Tracker, consider:
- 💰 Money/currency symbol
- 📊 Chart/graph icon
- 🏦 Bank building
- 📱 Phone with transaction
- ₦ Naira symbol

---

**Note:** Add your custom assets before building production APK/IPA.
