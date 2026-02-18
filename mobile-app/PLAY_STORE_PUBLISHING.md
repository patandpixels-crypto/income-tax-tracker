# Publishing to Google Play Store - Complete Guide

This guide walks you through publishing your Income Tax Tracker app to the Google Play Store.

## Prerequisites

- [x] EAS CLI installed: `npm install -g eas-cli`
- [x] EAS account created and logged in: `eas login`
- [x] Google Play Console account (one-time $25 fee)
- [x] App bundle built and tested

## Step 1: Build the Production App Bundle

```bash
cd mobile-app
eas build --platform android --profile production
```

This will:
- Create an optimized `.aab` (Android App Bundle) file
- Apply ProGuard/R8 obfuscation
- Generate a `mapping.txt` file for crash debugging
- Sign the bundle with your keystore

⏱️ Build takes 10-20 minutes. You'll get a URL to download the `.aab` file when complete.

## Step 2: Download Build Artifacts

After the build completes:

1. Go to https://expo.dev → Your Project → Builds
2. Click on the completed build
3. Download:
   - **App bundle** (`.aab` file) - This is what you upload to Play Store
   - **mapping.txt** - ProGuard mapping file for crash debugging

## Step 3: Create App in Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name**: Income Tax Tracker
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
4. Accept declarations and click **Create app**

## Step 4: Set Up Store Listing

### Main Store Listing

Navigate to **Store presence** → **Main store listing**:

**App name**: Income Tax Tracker

**Short description** (80 chars max):
```
Track income, calculate Nigerian taxes automatically from bank SMS alerts.
```

**Full description** (4000 chars max):
```
Income Tax Tracker helps Nigerian freelancers and self-employed professionals easily track income and calculate tax obligations.

KEY FEATURES:
✅ Automatic tax calculation using Nigerian tax brackets
✅ SMS bank alert detection - automatically add income from bank notifications
✅ Real-time tax tracking and bracket display
✅ Transaction history with bank details
✅ CSV export for tax filing
✅ Secure cloud sync across devices

HOW IT WORKS:
1. Log in or create an account
2. Grant SMS permissions (optional but recommended)
3. Set your bank alert name
4. Receive bank alerts - income is automatically tracked!
5. View your annual income and calculated tax in real-time

SUPPORTED BANKS:
- UBA (United Bank for Africa)
- GTBank (Guaranty Trust Bank)
- Zenith Bank
- Access Bank
- First Bank
- And many more Nigerian banks

TAX CALCULATIONS:
The app uses official Nigerian tax brackets to calculate:
- Tax owed based on annual income
- Effective tax rate
- Net income after tax

PRIVACY & SECURITY:
- SMS data processed locally on your device
- Secure authentication
- Cloud backup for your data
- No third-party data sharing

Perfect for freelancers, contractors, gig workers, and anyone earning income in Nigeria who needs to track taxes!
```

**App icon**: Upload your 512x512 PNG icon

**Feature graphic**: Create a 1024x500 banner showcasing the app

**Phone screenshots**: Upload 2-8 screenshots (minimum 2 required)
- Dashboard showing tax calculations
- SMS detection feature in action
- Transaction history
- Welcome/login screens

**Tablet screenshots** (optional but recommended): Same as phone

### Category & Tags

- **App category**: Finance
- **Tags**: tax, income, finance, freelance, nigeria

### Contact details

- **Email**: Your support email
- **Website**: Your app website (or GitHub repo)
- **Privacy policy**: https://yourdomain.com/privacy-policy

## Step 5: Upload the App Bundle

Navigate to **Release** → **Production** → **Create new release**:

1. Click **Upload** and select your `.aab` file
2. Wait for upload and processing
3. You'll see a warning: **"There is no deobfuscation file associated with this App Bundle"**

## Step 6: Upload ProGuard Mapping File

This fixes the deobfuscation warning:

1. After uploading the `.aab`, look for the **App bundle explorer** link
2. OR go to: **Release** → **App bundle explorer** → Select your version
3. Click the **Downloads** tab
4. Under "ProGuard mapping file", click **Upload**
5. Upload the `mapping.txt` file you downloaded from EAS
6. The warning will disappear ✅

## Step 7: Review and Rollout

1. **Release name**: Version 1.0.0 (or your version)
2. **Release notes**:
   ```
   Initial release of Income Tax Tracker!

   Features:
   - Automatic Nigerian tax calculation
   - SMS bank alert detection
   - Transaction history and CSV export
   - Secure cloud sync
   ```
3. Click **Review release**
4. Review all information
5. Click **Start rollout to Production**

## Step 8: Content Rating

Navigate to **Policy** → **App content** → **Content rating**:

1. Click **Start questionnaire**
2. Select your email address
3. Select category: **Utility, Productivity, Communication, or Other**
4. Answer questions honestly (mostly "No" for a finance tracker)
5. Submit for rating

## Step 9: Target Audience and Content

Navigate to **Policy** → **App content** → **Target audience**:

1. **Target age group**: 18+ (financial app)
2. **Appeal to children**: No
3. Save

Navigate to **Ads**:
1. **Contains ads**: No (or Yes if you have ads)
2. Save

## Step 10: Privacy Policy

Required for apps that access sensitive data (SMS):

1. Create a privacy policy at https://yourdomain.com/privacy-policy
2. In Play Console, go to **Store presence** → **Privacy Policy**
3. Enter your privacy policy URL
4. Save

## Step 11: App Access

If your app requires login:

1. Go to **Policy** → **App content** → **App access**
2. Provide test credentials:
   ```
   Username: test@example.com
   Password: TestPassword123
   ```
3. This allows Google to test your app during review

## Step 12: Submit for Review

1. Go to **Publishing overview** dashboard
2. Complete all required sections (marked with ⚠️)
3. Once all sections are complete, you'll see **Ready to publish**
4. Click **Send for review**

⏱️ Review typically takes 1-7 days.

## After Publishing

### Updating the App

When you need to publish an update:

1. Update `versionCode` in `app.json`:
   ```json
   "versionCode": 2
   ```

2. Build new version:
   ```bash
   eas build --platform android --profile production
   ```

3. Download new `.aab` and `mapping.txt`

4. In Play Console:
   - Go to **Production** → **Create new release**
   - Upload new `.aab`
   - Upload new `mapping.txt`
   - Add release notes
   - Roll out

### Monitoring

- **Crashes**: View crash reports in Play Console
- **Ratings**: Respond to user reviews
- **Statistics**: Monitor installs and user engagement

## Troubleshooting

### "App bundle not signed"
- EAS automatically signs your app. Check your credentials in `eas credentials`

### "You uploaded a debuggable APK"
- Make sure you're using `--profile production`, not `--profile preview`

### "Missing permissions declaration"
- SMS permissions are declared in `app.json`. If warning persists, add permission rationale in Play Console

### "Deobfuscation file warning"
- Follow Step 6 to upload the `mapping.txt` file

## Resources

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)

---

Good luck with your launch! 🚀
