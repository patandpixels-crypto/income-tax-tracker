# Income Tax Tracker Mobile App

A React Native mobile app for tracking income and calculating Nigerian tax obligations.

## Features

- 📊 Track income and expenses
- 🧮 Automatic Nigerian tax calculation
- 💰 Real-time tax bracket display
- 📱 SMS bank alert detection (production build only)
- 🔐 Secure authentication
- 📈 Transaction history

## Quick Start

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Start the Development Server

```bash
npm start
```

Or use:

```bash
npx expo start
```

### 3. Run on Your Phone

1. Install **Expo Go** from Google Play Store
2. Scan the QR code shown in your terminal
3. The app will load on your phone

## Taking Screenshots for Store Listing

1. Run `npm start` in the mobile-app folder
2. Scan the QR code with Expo Go
3. Navigate through the app screens:
   - Welcome screen
   - Login screen
   - Register screen
   - Dashboard
4. Take screenshots of each screen

## Building for Production

To create a production APK for Google Play Store:

```bash
npm install -g eas-cli
eas login
eas build --platform android
```

## Screens

- **Welcome Screen**: App introduction and features
- **Login Screen**: User authentication
- **Register Screen**: New user signup
- **Dashboard**: Main screen with tax calculations and transaction history

## Tech Stack

- React Native 0.74.5
- Expo SDK 51
- React Navigation 6
- AsyncStorage for local data
- Axios for API calls

## Backend API

The app connects to: `https://income-tax-tracker.onrender.com/api`

## Note on SMS Feature

The automatic SMS bank alert detection requires a custom development build and will not work in Expo Go. This feature will be fully functional in the production APK.
