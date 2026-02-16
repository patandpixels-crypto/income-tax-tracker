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
eas build --platform android --profile production
```

### ProGuard/R8 Configuration

The app is configured with ProGuard/R8 obfuscation for production builds. This:
- Reduces app size by removing unused code
- Obfuscates code to make reverse engineering harder
- Generates mapping files for crash debugging

### Uploading Deobfuscation Files to Google Play Console

When publishing to Google Play Store, you'll see a warning about missing deobfuscation files. Here's how to fix it:

1. **Download the mapping file from EAS**:
   - After your build completes, go to https://expo.dev
   - Navigate to your project → Builds
   - Click on the completed production build
   - Download the `mapping.txt` file (or `proguard-mapping.txt`)

2. **Upload to Google Play Console**:
   - Go to Google Play Console
   - Select your app
   - Go to: **Release** → **App bundle explorer** → Select your release
   - Click on the **Downloads** tab
   - Click **Upload** under "ProGuard mapping file"
   - Upload the `mapping.txt` file you downloaded from EAS

3. **Alternative - Automatic Upload**:
   You can also upload mapping files using Google Play's Upload API, but manual upload is simpler for most cases.

**Why this matters**: The mapping file allows Google Play to deobfuscate crash reports, making it easier to debug production issues.

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

## SMS Auto-Detection Feature

### Overview

The app can automatically detect bank transaction SMS alerts and add them to your income tracker! This feature works by monitoring incoming SMS messages for bank transaction patterns.

### Requirements

- **Android device only** (iOS does not allow SMS monitoring)
- **Production build** (EAS Build - will NOT work with Expo Go)
- **SMS permissions** granted by the user
- **Bank alert name** configured in the app

### How It Works

1. **Build the app** using EAS Build (production or preview)
2. **Install the APK** on your Android device
3. **Open the app** and log in
4. **Set your bank alert name** - This is your name as it appears in bank SMS alerts (e.g., "PATRICK CHIDOZIE")
5. **Grant SMS permissions** when prompted or tap "Enable SMS Auto-Detection"
6. **Receive a bank alert SMS** - The app will automatically:
   - Detect the incoming SMS
   - Parse the transaction amount and bank
   - Add it to your income tracker
   - Show a notification

### Supported Banks

The app currently supports alerts from:
- UBA (United Bank for Africa)
- GTBank (Guaranty Trust Bank)
- Zenith Bank
- Access Bank
- First Bank
- And more Nigerian banks

### Important Notes

- ⚠️ **Does NOT work in Expo Go** - You must build with `eas build` and install the APK
- ⚠️ **Android only** - iOS does not allow apps to read SMS messages
- ✅ **Only income transactions** are added automatically (debits are ignored)
- ✅ **Privacy**: SMS data is only processed locally on your device
- ✅ **Permissions**: You can revoke SMS permissions anytime in Android settings

### Building with EAS

```bash
# Production build (for Play Store)
eas build --platform android --profile production

# Preview build (for testing SMS feature)
eas build --platform android --profile preview
```

After the build completes, download and install the APK on your Android device to test the SMS feature.
