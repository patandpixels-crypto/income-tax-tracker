# Mobile App Deployment Guide

Complete step-by-step guide to make your Income Tax Tracker mobile app available to users.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Option 1: Google Play Store (Recommended for SMS features)](#option-1-google-play-store)
3. [Option 2: Apple App Store (Limited - No SMS)](#option-2-apple-app-store)
4. [Option 3: Direct APK Distribution](#option-3-direct-apk-distribution)
5. [Option 4: Expo Go (Testing Only)](#option-4-expo-go-testing-only)
6. [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

### 1. Complete App Assets

**Required Assets:**
- [ ] App icon (1024x1024 px)
- [ ] Adaptive icon for Android (1024x1024 px)
- [ ] Splash screen (1284x2778 px or larger)
- [ ] Feature graphics for stores
- [ ] Screenshots (5-8 per platform)

**Create/Add Icons:**
```bash
cd mobile-app/assets/

# Add these files:
# - icon.png (1024x1024)
# - adaptive-icon.png (1024x1024)
# - splash.png (1284x2778)
# - favicon.png (48x48)
```

**Tools for generating icons:**
- https://www.appicon.co/
- https://makeappicon.com/
- Canva, Figma, or Adobe Illustrator

### 2. Update App Configuration

**Edit `mobile-app/app.json`:**
```json
{
  "expo": {
    "name": "Income Tax Tracker",
    "slug": "income-tax-tracker-mobile",
    "version": "1.0.0",
    "description": "Track your income and calculate Nigerian taxes automatically",
    "privacy": "public",
    "android": {
      "package": "com.incometaxtracker.mobile",
      "versionCode": 1,
      "permissions": [
        "android.permission.READ_SMS",
        "android.permission.RECEIVE_SMS"
      ]
    },
    "ios": {
      "bundleIdentifier": "com.incometaxtracker.mobile",
      "buildNumber": "1.0.0"
    }
  }
}
```

### 3. Create Privacy Policy

**Required for app stores!**

Create a `PRIVACY_POLICY.md` file:

```markdown
# Privacy Policy for Income Tax Tracker

## Data Collection
- SMS messages: Only bank SMS alerts are read and parsed
- Transaction data: Stored on our secure servers
- Personal info: Email, name, and password (hashed)

## Data Usage
- SMS data is used only to extract transaction information
- Raw SMS messages are NOT stored on servers
- Only parsed transaction data (amount, bank, date) is saved

## Data Sharing
- We do NOT share your data with third parties
- We do NOT sell your information
- We do NOT use data for advertising

## SMS Permissions
- Required only on Android
- Used exclusively for reading bank transaction alerts
- You can revoke permissions anytime in device settings

## Data Security
- All API calls use HTTPS encryption
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days

## Contact
For questions: [your-email@example.com]

Last Updated: January 2026
```

**Host it online:**
- GitHub Pages (free)
- Your website
- Google Sites
- Or use: https://www.privacypolicygenerator.info/

### 4. Test Thoroughly

```bash
cd mobile-app

# Test on Android
npm run android

# Test on iOS
npm run ios

# Test core features:
# - ✅ User registration
# - ✅ Login/logout
# - ✅ SMS scanning (Android)
# - ✅ Transaction viewing
# - ✅ Transaction deletion
# - ✅ Tax calculations
# - ✅ Pull to refresh
```

---

## Option 1: Google Play Store

### Step 1: Set Up Google Play Developer Account

**Cost:** $25 one-time fee

1. Go to https://play.google.com/console/signup
2. Create Google Play Developer account
3. Pay $25 registration fee (one-time)
4. Fill out account details
5. Accept Developer Distribution Agreement

### Step 2: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 3: Log in to Expo Account

```bash
# Create free Expo account if needed
eas login

# Or create account
eas register
```

### Step 4: Configure EAS Build

```bash
cd mobile-app

# Initialize EAS
eas build:configure
```

This creates `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "release"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Step 5: Generate Android Keystore

**Option A: Let EAS generate it (Recommended)**
```bash
eas build --platform android --profile production
# EAS will prompt to generate keystore automatically
# Choose "Yes" when asked
```

**Option B: Generate manually**
```bash
keytool -genkeypair -v -keystore income-tax-tracker.keystore \
  -alias income-tax-tracker -keyalg RSA -keysize 2048 -validity 10000
```

### Step 6: Build Production APK

```bash
# Build for Android (AAB for Play Store)
eas build --platform android --profile production

# Or build APK
eas build --platform android --profile preview
```

**Build time:** 10-20 minutes

**Output:** Download URL for APK/AAB file

### Step 7: Create Google Play Store Listing

1. **Go to Google Play Console**
   - https://play.google.com/console

2. **Create New App**
   - Click "Create app"
   - Name: "Income Tax Tracker"
   - Language: English (or your choice)
   - Type: App
   - Category: Finance
   - Click "Create app"

3. **Fill Store Listing**

   **App Details:**
   - App name: Income Tax Tracker
   - Short description (80 chars):
     ```
     Track income from bank SMS alerts and calculate Nigerian taxes automatically
     ```

   - Full description (4000 chars):
     ```
     Income Tax Tracker helps Nigerian earners track their income and calculate
     taxes automatically.

     KEY FEATURES:
     📱 Automatic Bank SMS Detection - Scan your SMS inbox for bank credit alerts
     💰 Tax Calculator - Calculate taxes using Nigerian progressive tax brackets
     🏦 Multi-Bank Support - Works with GTBank, Access, Zenith, First Bank, UBA,
        Stanbic, Kuda, OPay, Moniepoint, PalmPay
     📊 Real-time Dashboard - See total income, estimated tax, and net income
     🔐 Secure - All data encrypted with HTTPS, passwords hashed

     HOW IT WORKS:
     1. Create free account
     2. Grant SMS permissions (Android only)
     3. Tap "Scan Bank SMS Alerts"
     4. App automatically imports credit transactions
     5. View tax calculations in real-time

     PRIVACY & SECURITY:
     - Only bank SMS alerts are read
     - Raw SMS messages are NOT stored
     - No data sharing with third parties
     - All API calls use HTTPS encryption

     SUPPORTED BANKS:
     All major Nigerian banks including GTBank, Access Bank, Zenith Bank,
     First Bank, UBA, Stanbic IBTC, Kuda, OPay, Moniepoint, and PalmPay.

     Download now and take control of your income tracking!
     ```

   **Graphics:**
   - App icon: 512x512 px (required)
   - Feature graphic: 1024x500 px (required)
   - Screenshots: At least 2, up to 8 (recommended 5-8)
     - Size: 320-3840 px
     - Take screenshots from the app

   **Contact Details:**
   - Email: your-support@email.com
   - Privacy Policy URL: https://yourwebsite.com/privacy
   - Website: https://income-tax-tracker.onrender.com (optional)

   **Categorization:**
   - App category: Finance
   - Tags: tax, income, finance, banking, nigeria

4. **Content Rating**
   - Complete questionnaire
   - Select "Finance" category
   - Answer all questions honestly
   - Submit for rating

5. **App Content**
   - Privacy Policy: Upload or link to URL
   - Ads: Select "No" (if no ads)
   - Target audience: 18+
   - Data safety: Complete data safety form
     - Collect: Email, SMS (local only), transaction data
     - Share: No data shared
     - Encryption: Yes (HTTPS)

6. **Pricing & Distribution**
   - Price: Free
   - Countries: Nigeria (or worldwide)
   - Content rating: For all ages or 18+

### Step 8: Upload APK/AAB

1. **Go to "Release" → "Production"**
2. **Click "Create new release"**
3. **Upload AAB file** (from EAS build)
4. **Release name:** "1.0.0" (matches app version)
5. **Release notes:**
   ```
   Initial release of Income Tax Tracker!

   Features:
   - Automatic bank SMS detection
   - Nigerian tax calculations
   - Multi-bank support
   - Real-time tax dashboard
   - Secure authentication
   ```
6. **Click "Review release"**
7. **Click "Start rollout to Production"**

### Step 9: SMS Permissions Declaration

**IMPORTANT:** Google requires declaration for SMS permissions

1. **Go to "Policy" → "App content"**
2. **Find "Sensitive permissions"**
3. **Declare SMS usage:**
   - Purpose: "Read bank transaction SMS alerts"
   - Core functionality: Yes
   - User-initiated: Yes
   - Delete after use: No (but not stored on server)
   - Privacy Policy: [your URL]

### Step 10: Submit for Review

1. **Review all sections** (must be complete)
2. **Click "Submit for review"**
3. **Wait for approval** (typically 1-7 days)

### Step 11: Post-Approval

Once approved:
- **App is live on Google Play Store!**
- Users can search and install
- Share link: `https://play.google.com/store/apps/details?id=com.incometaxtracker.mobile`

---

## Option 2: Apple App Store

**⚠️ Note:** SMS features won't work on iOS (Apple doesn't allow SMS reading)

### Step 1: Apple Developer Account

**Cost:** $99/year

1. Go to https://developer.apple.com/programs/
2. Enroll in Apple Developer Program
3. Pay $99 annual fee
4. Complete enrollment (may take 24-48 hours)

### Step 2: Create App ID

1. Go to https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** to create new App ID
4. **Bundle ID:** `com.incometaxtracker.mobile`
5. **App Name:** Income Tax Tracker
6. Save

### Step 3: Build for iOS

```bash
cd mobile-app

# Build iOS app
eas build --platform ios --profile production
```

**Requirements:**
- Valid Apple Developer account
- Build time: 15-30 minutes
- Output: IPA file

### Step 4: App Store Connect

1. **Go to:** https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. **Fill details:**
   - Platform: iOS
   - Name: Income Tax Tracker
   - Primary Language: English
   - Bundle ID: com.incometaxtracker.mobile
   - SKU: incometaxtracker2026
   - User Access: Full Access

### Step 5: App Information

**Category:**
- Primary: Finance
- Secondary: Productivity

**Description:**
```
Track your income and calculate Nigerian taxes automatically with Income Tax Tracker.

FEATURES:
• Real-time tax calculations using Nigerian tax brackets
• Transaction tracking and management
• Secure authentication
• Cloud sync across devices
• Beautiful, intuitive interface

PERFECT FOR:
• Freelancers and contractors
• Small business owners
• Anyone tracking income for tax purposes

Note: Automatic SMS reading is not available on iOS due to Apple's privacy policies.
Use the web app for SMS upload functionality.

Download now and simplify your tax tracking!
```

**Keywords:**
```
tax, income, finance, nigeria, tracker, calculator
```

**Screenshots:**
- 6.5" iPhone: At least 1 (up to 10)
- 5.5" iPhone: At least 1 (up to 10)
- iPad: Optional

### Step 6: Pricing & Availability

- **Price:** Free
- **Availability:** All countries (or Nigeria only)

### Step 7: Upload Build

1. **In Xcode or EAS:**
   ```bash
   eas submit --platform ios
   ```

2. **Or manually:**
   - Download IPA from EAS
   - Use Transporter app (Mac only)
   - Upload IPA to App Store Connect

### Step 8: Submit for Review

1. **Complete all sections**
2. **Add privacy policy**
3. **Add support URL**
4. **Submit for review**
5. **Wait 1-7 days for approval**

---

## Option 3: Direct APK Distribution

**Best for:** Testing, internal use, or avoiding Play Store fees

### Step 1: Build Standalone APK

```bash
cd mobile-app

# Build APK
eas build --platform android --profile preview
```

### Step 2: Download APK

After build completes, download the APK file from the link provided.

### Step 3: Distribute APK

**Option A: Host on your website**
```bash
# Upload APK to your web server
# Example: https://yourwebsite.com/downloads/income-tax-tracker.apk
```

**Option B: Use file hosting**
- Google Drive (set to "Anyone with link")
- Dropbox
- GitHub Releases
- Firebase Hosting

**Option C: Email directly**
- Send APK file via email
- Users download and install

### Step 4: Installation Instructions for Users

**For Users to Install:**

1. **Enable Unknown Sources**
   - Go to Settings → Security
   - Enable "Install unknown apps" or "Unknown sources"
   - Select browser/file manager to allow installations

2. **Download APK**
   - Download from link/email
   - Tap on downloaded APK file

3. **Install**
   - Tap "Install"
   - Grant SMS permissions when prompted
   - Open app

**⚠️ Warning:** This method bypasses Play Store security. Only share with trusted users.

### Step 5: Update Distribution

**Create landing page:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Income Tax Tracker - Download</title>
</head>
<body>
  <h1>Income Tax Tracker</h1>
  <p>Track your income and calculate Nigerian taxes automatically</p>

  <h2>Download for Android</h2>
  <a href="income-tax-tracker-v1.0.0.apk" download>
    <button>Download APK (v1.0.0)</button>
  </a>

  <h3>Installation Instructions:</h3>
  <ol>
    <li>Enable "Unknown Sources" in Android settings</li>
    <li>Download APK file</li>
    <li>Tap to install</li>
    <li>Grant SMS permissions</li>
  </ol>

  <h3>Requirements:</h3>
  <ul>
    <li>Android 6.0 or higher</li>
    <li>SMS permissions (for automatic detection)</li>
  </ul>
</body>
</html>
```

---

## Option 4: Expo Go (Testing Only)

**Best for:** Testing with small group before production

### Step 1: Publish to Expo

```bash
cd mobile-app

# Publish app
eas update --branch production --message "Initial release"
```

### Step 2: Share QR Code

1. Run `npx expo start`
2. Share QR code with testers
3. Testers install "Expo Go" app
4. Testers scan QR code
5. App runs in Expo Go

**Limitations:**
- Requires Expo Go app
- SMS reading may not work in Expo Go
- Not suitable for production

---

## Post-Deployment

### 1. Monitor App Performance

**Google Play Console:**
- Check crash reports
- View user reviews
- Monitor installs/uninstalls

**Analytics (Optional):**
```bash
# Add Firebase Analytics
expo install @react-native-firebase/app
expo install @react-native-firebase/analytics
```

### 2. Respond to Reviews

- Respond to user reviews promptly
- Address bugs and feature requests
- Maintain 4+ star rating

### 3. Update App Regularly

**Version Updates:**
```bash
# Update version in app.json
# "version": "1.0.1"
# "android.versionCode": 2

# Build new version
eas build --platform android --profile production

# Upload to Play Store
```

### 4. Marketing

**Promote your app:**
- Share on social media
- Create demo video
- Write blog post
- Submit to app directories
- Run ads (optional)

### 5. Monitor Backend

- Ensure backend API is stable
- Monitor server load
- Check database performance
- Set up error logging (Sentry, LogRocket)

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Google Play Developer | $25 | One-time |
| Apple Developer | $99 | Annual |
| Expo EAS Build (Free tier) | $0 | Monthly |
| Expo EAS Build (Production) | $29+ | Monthly (optional) |
| Privacy Policy Hosting | $0 | Free (GitHub Pages) |
| APK Hosting | $0-10 | Monthly |

**Minimum to start:** $25 (Google Play only)

**Recommended:** $25 Google Play + $0 Free EAS tier = $25 total

---

## Recommended Path

**For Nigerian Users (SMS required):**
1. ✅ Build with EAS (free tier)
2. ✅ Publish to Google Play Store ($25)
3. ❌ Skip Apple App Store (SMS doesn't work on iOS)
4. ✅ Create direct APK download as backup

**Timeline:**
- Day 1-2: Complete assets, privacy policy, testing
- Day 3: Build production APK
- Day 4: Create Play Store listing
- Day 5: Submit for review
- Day 6-12: Wait for approval
- Day 13+: App is live!

---

## Need Help?

- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Google Play:** https://support.google.com/googleplay/android-developer
- **Apple App Store:** https://developer.apple.com/app-store/

---

**Good luck with your app launch! 🚀**
