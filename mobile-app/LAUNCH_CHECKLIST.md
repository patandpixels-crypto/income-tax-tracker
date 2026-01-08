# Launch Checklist - Quick Reference

Use this checklist to track your progress in making the app available to users.

## 🎯 Recommended Path: Google Play Store (Best for Nigerian Users)

**Total Cost:** $25 one-time
**Timeline:** 7-14 days
**SMS Features:** ✅ Yes

---

## Phase 1: Preparation (Days 1-2)

### ☐ Create App Assets
- [ ] Design app icon (1024x1024 px)
  - Use: https://www.appicon.co/ or Canva
- [ ] Create adaptive icon (1024x1024 px)
- [ ] Design splash screen (1284x2778 px)
- [ ] Save all to `mobile-app/assets/` folder

### ☐ Take Screenshots
- [ ] Run app on Android device/emulator
- [ ] Take 5-8 screenshots of key screens:
  - Welcome screen
  - Login screen
  - Dashboard with transactions
  - SMS scanning in action
  - Tax summary view

### ☐ Write Privacy Policy
- [ ] Create privacy policy (template in DEPLOYMENT.md)
- [ ] Host on GitHub Pages or your website
- [ ] Save URL for later

### ☐ Test App Thoroughly
```bash
cd mobile-app
npm install
npm run android
```
- [ ] Test registration
- [ ] Test login
- [ ] Test SMS scanning
- [ ] Test transaction management
- [ ] Test tax calculations
- [ ] Fix any bugs found

---

## Phase 2: Account Setup (Day 3)

### ☐ Create Expo Account
```bash
npm install -g eas-cli
eas register
# Or login: eas login
```
- [ ] Sign up at https://expo.dev
- [ ] Verify email
- [ ] Login via CLI

### ☐ Create Google Play Developer Account
- [ ] Go to https://play.google.com/console/signup
- [ ] Pay $25 one-time fee
- [ ] Complete profile
- [ ] Accept agreements
- [ ] Wait for approval (usually instant)

---

## Phase 3: Build App (Day 4)

### ☐ Configure Build
```bash
cd mobile-app
eas build:configure
```
- [ ] Creates `eas.json` file
- [ ] Verify configuration

### ☐ Build Production App
```bash
eas build --platform android --profile production
```
- [ ] Wait 10-20 minutes for build
- [ ] Download AAB file when complete
- [ ] Save file to safe location

---

## Phase 4: Play Store Listing (Day 5)

### ☐ Create App on Play Console
- [ ] Go to https://play.google.com/console
- [ ] Click "Create app"
- [ ] Name: "Income Tax Tracker"
- [ ] Language: English
- [ ] App/Game: App
- [ ] Free/Paid: Free

### ☐ Complete Store Listing
- [ ] App name: Income Tax Tracker
- [ ] Short description (80 chars max):
  ```
  Track income from bank SMS alerts and calculate Nigerian taxes automatically
  ```
- [ ] Full description (copy from DEPLOYMENT.md)
- [ ] Upload app icon (512x512)
- [ ] Upload feature graphic (1024x500)
- [ ] Upload screenshots (5-8 images)
- [ ] App category: Finance
- [ ] Email: your-email@example.com
- [ ] Privacy Policy URL: [your URL]

### ☐ Content Rating
- [ ] Complete questionnaire
- [ ] Select appropriate rating
- [ ] Submit

### ☐ App Content
- [ ] Privacy Policy: Add URL
- [ ] Ads: No
- [ ] Target audience: 18+
- [ ] Data safety section:
  - Collects: Email, Transaction data
  - SMS: Read locally only
  - Encryption: Yes (HTTPS)
  - No third-party sharing

### ☐ Pricing & Distribution
- [ ] Price: Free
- [ ] Countries: Nigeria (or All)
- [ ] Save

### ☐ SMS Permission Declaration
- [ ] Go to "App content" → "Sensitive permissions"
- [ ] Declare SMS usage
- [ ] Purpose: "Read bank transaction SMS alerts"
- [ ] Submit

---

## Phase 5: Upload & Submit (Day 5)

### ☐ Upload App Bundle
- [ ] Go to "Release" → "Production"
- [ ] Click "Create new release"
- [ ] Upload AAB file (from EAS build)
- [ ] Release name: "1.0.0"
- [ ] Release notes:
  ```
  Initial release!
  - Automatic bank SMS detection
  - Nigerian tax calculations
  - Multi-bank support
  ```

### ☐ Review & Submit
- [ ] Check all sections are complete (green checkmarks)
- [ ] Click "Review release"
- [ ] Click "Start rollout to Production"
- [ ] Confirm submission

---

## Phase 6: Wait for Approval (Days 6-12)

### ☐ Monitor Status
- [ ] Check email for updates from Google
- [ ] Check Play Console for status
- [ ] Respond to any requests from Google

### ☐ Possible Outcomes
- ✅ **Approved** → App goes live immediately
- ⚠️ **Needs changes** → Fix issues and resubmit
- ❌ **Rejected** → Review reason and appeal or fix

**Average approval time:** 1-7 days

---

## Phase 7: App is Live! (Day 13+)

### ☐ Verify App is Live
- [ ] Search "Income Tax Tracker" on Play Store
- [ ] Verify listing appears correctly
- [ ] Test installation on device
- [ ] Share with friends to test

### ☐ Get Your App Link
Your app will be at:
```
https://play.google.com/store/apps/details?id=com.incometaxtracker.mobile
```

### ☐ Promote Your App
- [ ] Share on social media
- [ ] Share on WhatsApp/Telegram groups
- [ ] Post on Nairaland, Twitter, Facebook
- [ ] Email your user base
- [ ] Create demo video (optional)

### ☐ Monitor Performance
- [ ] Check crash reports daily (first week)
- [ ] Read user reviews
- [ ] Respond to feedback
- [ ] Track install numbers

---

## Alternative: Quick APK Distribution (Skip Play Store)

If you want to distribute immediately without waiting for Play Store approval:

### ☐ Build APK
```bash
cd mobile-app
eas build --platform android --profile preview
```

### ☐ Download APK
- [ ] Download APK from EAS build link
- [ ] Rename: `income-tax-tracker-v1.0.0.apk`

### ☐ Share APK
**Option 1: Google Drive**
- [ ] Upload APK to Google Drive
- [ ] Set sharing to "Anyone with link"
- [ ] Share link with users

**Option 2: Your Website**
- [ ] Upload to your web server
- [ ] Create download page
- [ ] Share URL

**Option 3: WhatsApp/Email**
- [ ] Send APK file directly (if under 100MB)

### ☐ Installation Instructions for Users
```
1. Enable "Unknown Sources" on Android
   Settings → Security → Unknown Sources → ON

2. Download APK file

3. Tap APK to install

4. Grant SMS permissions when prompted

5. Open app and create account
```

---

## Cost Breakdown

### Google Play Store (Recommended)
- Google Play Developer Account: **$25** (one-time)
- EAS Build (Free tier): **$0/month** (limited builds)
- Total: **$25**

### Direct APK (No Store)
- EAS Build (Free tier): **$0/month**
- File hosting: **$0** (Google Drive/GitHub)
- Total: **$0**

### Both Options
- Play Store + APK backup: **$25**
- Best of both worlds

---

## Support Resources

- **Full Guide:** See `DEPLOYMENT.md`
- **Expo Docs:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Play Console Help:** https://support.google.com/googleplay/android-developer

---

## Troubleshooting

**Build fails?**
```bash
# Clear cache and retry
eas build --platform android --profile production --clear-cache
```

**Can't login to Expo?**
```bash
eas logout
eas login
```

**App rejected?**
- Check email for specific reason
- Fix issues mentioned
- Resubmit

**Need faster approval?**
- Ensure all sections are complete
- Provide clear privacy policy
- Respond quickly to Google's requests

---

## 🎉 Success Metrics

After launch, track:
- [ ] Day 1: 10+ installs
- [ ] Week 1: 50+ installs
- [ ] Week 2: 100+ installs
- [ ] Month 1: 500+ installs
- [ ] Maintain 4+ star rating
- [ ] Less than 1% crash rate

---

**You've got this! Follow the checklist step-by-step and your app will be live soon! 🚀**

**Questions?** See full DEPLOYMENT.md guide or open an issue on GitHub.
