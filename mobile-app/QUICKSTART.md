# Quick Start Guide - Mobile App

Get the Income Tax Tracker mobile app running in 5 minutes!

## Prerequisites

✅ Node.js installed (v16 or higher)
✅ Expo CLI installed globally
✅ Android device or emulator (for SMS features)

## Installation Steps

### 1. Install Expo CLI (if not already installed)

```bash
npm install -g expo-cli
```

### 2. Navigate to Mobile App Directory

```bash
cd mobile-app
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm start
```

This will open Expo DevTools in your browser.

### 5. Run on Your Device

**Option A: Using Expo Go App (Easiest)**

1. Install "Expo Go" from Google Play Store (Android) or App Store (iOS)
2. Scan the QR code shown in the terminal
3. App will load on your device

**Option B: Android Emulator**

```bash
npm run android
```

**Option C: iOS Simulator (Mac only)**

```bash
npm run ios
```

## First Time Setup

### 1. Create an Account

- Open the app
- Tap "Create Account"
- Enter your email, password, and full name
- Tap "Register"

### 2. Grant SMS Permissions (Android Only)

- You'll be automatically logged in to the dashboard
- Tap **"📱 Scan Bank SMS Alerts"**
- When prompted, tap **"Allow"** to grant SMS permissions
- Tap "Scan" to start importing transactions

### 3. View Your Income & Tax Summary

- Your transactions will appear on the dashboard
- Tax calculations update automatically
- Pull down to refresh data

## Testing Without a Real Device

If you don't have an Android device with bank SMS messages, you can still test the app:

1. Use the web app to manually add transactions
2. The mobile app will sync with the same backend
3. All features except SMS scanning will work

## Common Issues

### "Expo CLI not found"
```bash
npm install -g expo-cli
```

### "Dependencies not installed"
```bash
cd mobile-app
npm install
```

### "SMS permissions not working"
- SMS reading only works on Android devices
- iOS does not allow SMS access
- Test with an Android device or emulator

### "Cannot connect to backend"
- Check your internet connection
- Backend URL: https://income-tax-tracker.onrender.com/api
- Make sure the backend server is running

## Development Tips

### Clear Cache
```bash
expo start -c
```

### Reinstall Dependencies
```bash
rm -rf node_modules
npm install
```

### View Logs
```bash
npx react-native log-android  # Android logs
npx react-native log-ios      # iOS logs
```

## Next Steps

- 📖 Read the full [README.md](README.md) for detailed documentation
- 🔧 Explore the code in `app/` and `services/` directories
- 🚀 Build a production APK when ready

## Need Help?

- Check [README.md](README.md) for troubleshooting
- Review the code comments in `services/smsReader.js`
- Open an issue on GitHub

---

**Happy coding! 🎉**
