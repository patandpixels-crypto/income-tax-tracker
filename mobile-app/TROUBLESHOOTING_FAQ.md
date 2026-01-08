# Troubleshooting FAQ
### Common Problems & Simple Solutions

This guide answers the most common questions from beginners.

---

## 🆘 Installation Issues

### ❌ "npm: command not found" or "node: command not found"

**Problem:** Node.js isn't installed or not in your system PATH

**Simple Solution:**
1. Completely uninstall Node.js:
   - **Windows:** Settings → Apps → Node.js → Uninstall
   - **Mac:** Open Terminal and type: `sudo rm -rf /usr/local/bin/node`
2. Restart your computer
3. Download fresh installer from https://nodejs.org
4. Install again (use default settings)
5. Restart computer AGAIN
6. Open new Command Prompt/Terminal
7. Try `node --version` again

---

### ❌ "Permission denied" when installing

**Problem:** You need admin rights

**Windows Solution:**
1. Close Command Prompt
2. Right-click Command Prompt
3. Select "Run as Administrator"
4. Try the command again

**Mac Solution:**
1. Add `sudo` before the command:
   ```bash
   sudo npm install -g expo-cli
   ```
2. Enter your Mac password when prompted
3. Press Enter

---

### ❌ "expo: command not found" after installing

**Problem:** Terminal needs to be restarted

**Solution:**
1. Close Command Prompt/Terminal completely
2. Open a NEW Command Prompt/Terminal
3. Try `expo --version` again

If still not working:
```bash
npm install -g expo-cli
```
Run this again, then restart terminal.

---

### ❌ VS Code won't open my project

**Problem:** Wrong folder or command

**Solution:**
1. Open Command Prompt/Terminal
2. Navigate to YOUR project folder:
   ```bash
   cd /home/user/income-tax-tracker
   ```
   (Replace with YOUR actual path)
3. Verify you're in the right place:
   ```bash
   ls
   ```
   (Windows: use `dir`)
4. You should see: backend, mobile-app, src
5. Then type:
   ```bash
   code .
   ```
   (Don't forget the dot!)

---

## 📦 Dependency Issues

### ❌ "npm install" takes forever

**Problem:** Slow internet or npm cache

**Solution:**
1. Press Ctrl+C to cancel
2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
3. Try again:
   ```bash
   npm install
   ```
4. Be patient - can take 3-5 minutes
5. Make sure you have good internet

---

### ❌ "WARN" messages during npm install

**Problem:** This is actually NORMAL!

**Solution:**
- Yellow "WARN" messages = **OK, ignore them**
- Red "ERROR" messages = **Problem, need to fix**

**Example of OK warnings:**
```
npm WARN deprecated package@1.0.0: This package is deprecated
npm WARN optional SKIPPING OPTIONAL DEPENDENCY
```
↑ These are fine, just warnings.

**Example of real errors:**
```
npm ERR! code EACCES
npm ERR! permission denied
```
↑ This needs fixing (see Permission denied section above)

---

### ❌ "Cannot find module" error

**Problem:** Dependencies not installed

**Solution:**
```bash
# Go to mobile-app folder
cd mobile-app

# Delete old node_modules
rm -rf node_modules

# (Windows: rmdir /s node_modules)

# Reinstall everything
npm install

# Wait 3-5 minutes
```

---

## 🔐 Account Issues

### ❌ "Cannot login to Expo"

**Problem:** Wrong credentials or internet issue

**Solution:**
1. Make sure you created an Expo account at https://expo.dev
2. Check your email for verification link (check spam!)
3. Click verification link
4. Try login again:
   ```bash
   eas logout
   eas login
   ```
5. Enter email and password carefully
6. If still fails, reset password at https://expo.dev

---

### ❌ "Payment failed" on Google Play

**Problem:** Card declined or international payment blocked

**Solution:**
1. **Check with your bank** - they might have blocked international payment
2. Call your bank and say: "I'm trying to pay Google, please allow it"
3. Use a different card (credit cards work better than debit)
4. Try PayPal if available
5. Wait 10 minutes and try again

---

### ❌ "Google Play registration pending"

**Problem:** Google is verifying your account

**Solution:**
- This is normal!
- Can take 24-48 hours
- Check your email
- If longer than 48 hours, contact Google Support

---

## 🏗️ Build Issues

### ❌ "Build failed: Keystore error"

**Problem:** Android keystore not generated

**Solution:**
```bash
# Run build again
eas build --platform android --profile production

# When asked "Generate a new keystore?"
# Type: Y
# Press Enter

# Let EAS create it automatically
```

---

### ❌ "Build stuck at 'Queued'"

**Problem:** High demand on Expo servers

**Solution:**
- Be patient - can take 5-10 minutes to start
- Check https://status.expo.dev for any outages
- If still queued after 30 minutes, cancel and retry:
  ```bash
  # Press Ctrl+C to cancel
  # Run build again
  eas build --platform android --profile production
  ```

---

### ❌ "Build failed: Out of memory"

**Problem:** Rare issue with Expo servers

**Solution:**
```bash
# Try again with clear cache
eas build --platform android --profile production --clear-cache
```

---

### ❌ "Cannot download .aab file"

**Problem:** Browser blocking download or link expired

**Solution:**
1. Check your email - Expo sends download link
2. Copy the build URL from terminal
3. Open in different browser
4. If link expired, rebuild:
   ```bash
   eas build --platform android --profile production
   ```

---

## 🎨 Graphics Issues

### ❌ "App icon too small/large"

**Problem:** Wrong size image

**Solution:**
1. Go to https://www.iloveimg.com/resize-image
2. Upload your icon
3. Select "Resize using pixels"
4. Width: 1024, Height: 1024
5. Download resized image
6. Use this for upload

---

### ❌ "Feature graphic rejected"

**Problem:** Wrong dimensions or quality

**Solution:**
- Must be EXACTLY 1024 x 500 pixels
- Must be PNG or JPEG
- File size under 1 MB
- Use Canva template: "Google Play Feature Graphic"

---

### ❌ "Screenshots too small"

**Problem:** Wrong size

**Solution:**
- Minimum: 320 px on shortest side
- Maximum: 3840 px on longest side
- Recommended: 1080 x 1920 (phone size)
- Use https://www.iloveimg.com/resize-image

---

## 📝 Store Listing Issues

### ❌ "Privacy policy URL invalid"

**Problem:** URL not accessible or wrong format

**Solution:**
1. Make sure URL starts with `https://` (not `http://`)
2. Test URL in browser - should load the privacy policy
3. Make sure it's publicly accessible (not password protected)
4. If using GitHub Gist, use the "Raw" URL

---

### ❌ "App name already taken"

**Problem:** Another app has that name

**Solution:**
1. Try a different name:
   - "Income Tax Tracker NG"
   - "Tax Tracker Nigeria"
   - "Nigerian Tax Calculator"
2. Update name in both:
   - Google Play Console
   - `mobile-app/app.json` file (name field)

---

### ❌ "Description too long"

**Problem:** Exceeded character limit

**Solution:**
- Short description: MAX 80 characters
- Full description: MAX 4000 characters
- Count characters at: https://wordcounter.net
- Edit and shorten your text

---

### ❌ "Content rating questionnaire failed"

**Problem:** Inconsistent answers

**Solution:**
1. Start questionnaire again
2. For finance app, answer:
   - Violence: NO
   - Sexual content: NO
   - Profanity: NO
   - Controlled substances: NO
   - Share user content: NO
   - Internet access: YES
   - Collect personal info: YES
3. Be consistent - read questions carefully

---

## 📱 Data Safety Issues

### ❌ "Data safety declaration incomplete"

**Problem:** Missing required information

**Solution:**
Fill in ALL sections:
1. **Do you collect data?** → YES
2. **What data?**
   - Name (required, for app functionality)
   - Email (required, for account)
   - SMS (optional, for transaction import)
3. **Is data encrypted?** → YES
4. **Can users delete data?** → YES
5. **Why collect SMS?**
   - Type: "Used to extract bank transaction information from SMS alerts. Raw SMS is not stored on servers."

---

### ❌ "SMS permission rejected - policy violation"

**Problem:** Not explained clearly enough

**Solution:**
Update your privacy policy to include:
1. **WHY** you need SMS:
   - "To automatically read bank transaction alerts"
2. **WHAT** you do with SMS:
   - "Parse transaction details (amount, bank, date)"
   - "Raw SMS messages are NOT uploaded to servers"
3. **WHEN** you access SMS:
   - "Only when user taps 'Scan Bank SMS' button"
4. **HOW** users control it:
   - "Users can revoke permission anytime in Settings"

Then update your Play Store listing to reference this.

---

## 🚀 Upload Issues

### ❌ "Upload failed: Bundle invalid"

**Problem:** Wrong file type

**Solution:**
- Make sure you're uploading `.aab` file (not `.apk`)
- File should be named like: `build-12345.aab`
- Download fresh from EAS build if corrupted

---

### ❌ "Upload failed: Signature mismatch"

**Problem:** Using different keystore

**Solution:**
This happens if you rebuilt with different keystore.

For FIRST release:
1. Delete the failed release
2. Create new release
3. Upload the .aab file

For UPDATES (if app already published):
1. Use same keystore as original
2. Or contact Expo support to recover keystore

---

### ❌ "Version code already exists"

**Problem:** Uploading same version again

**Solution:**
1. Open `mobile-app/app.json`
2. Find:
   ```json
   "android": {
     "versionCode": 1
   }
   ```
3. Change to:
   ```json
   "android": {
     "versionCode": 2
   }
   ```
4. Rebuild app:
   ```bash
   eas build --platform android --profile production
   ```
5. Upload new build

---

## ⏰ Review Issues

### ❌ "Review taking too long"

**Problem:** App stuck in review

**Solution:**
- Normal review time: 1-7 days
- Average: 3-4 days
- If longer than 7 days:
  1. Check for emails from Google
  2. Log into Play Console and check status
  3. Contact Google Play support

---

### ❌ "App rejected: Policy violation"

**Problem:** Violates Google Play policies

**Common reasons:**
1. **Privacy policy missing SMS info**
   - Solution: Update privacy policy (see SMS permission section above)

2. **Misleading content**
   - Solution: Make sure screenshots match actual app
   - Don't promise features you don't have

3. **Intellectual property**
   - Solution: Don't use copyrighted images or names
   - Create original icon and graphics

4. **Malicious behavior**
   - Solution: Explain SMS usage is only for bank alerts
   - Add clear privacy policy

**How to fix:**
1. Read rejection email carefully
2. Fix the specific issue mentioned
3. Update app if needed (rebuild and reupload)
4. Resubmit for review

---

### ❌ "App approved but not appearing in search"

**Problem:** Indexing delay

**Solution:**
- Can take 6-24 hours to appear in search
- Direct link works immediately
- Search by exact app name first
- Share direct link while waiting:
  ```
  https://play.google.com/store/apps/details?id=com.incometaxtracker.mobile
  ```

---

## 🔧 Technical Errors

### ❌ "ENOENT: no such file or directory"

**Problem:** File or folder doesn't exist

**Solution:**
1. Check you're in the right folder:
   ```bash
   pwd
   ```
   (Windows: `cd`)
2. You should see path ending in `/mobile-app`
3. If not, navigate to it:
   ```bash
   cd mobile-app
   ```

---

### ❌ "Port 19000 already in use"

**Problem:** Expo server already running

**Solution:**
```bash
# Option 1: Kill the process
# Press Ctrl+C in the terminal running Expo

# Option 2: Use different port
expo start --port 19001

# Option 3: Restart computer
```

---

### ❌ "Metro bundler failed"

**Problem:** Build cache corrupted

**Solution:**
```bash
# Clear cache
expo start -c

# Or manually delete cache
rm -rf .expo
rm -rf node_modules
npm install
expo start
```

---

## 📧 Email Issues

### ❌ "Not receiving emails from Google"

**Problem:** Emails going to spam or wrong address

**Solution:**
1. **Check spam folder** - Google emails often go there
2. Add `googleplay-developer-support@google.com` to contacts
3. Verify email in Google Play Console:
   - Settings → Account details → Email
4. Check ALL email addresses (personal, work, etc.)

---

### ❌ "Not receiving Expo build emails"

**Problem:** Wrong email or not configured

**Solution:**
1. Check email used for Expo account
2. Check spam folder
3. Check build status manually:
   ```bash
   eas build:list
   ```
4. Or visit: https://expo.dev/accounts/[your-username]/projects

---

## 💳 Payment Issues

### ❌ "Card declined for $25 Google Play fee"

**Problem:** International payment blocked

**Solution:**
1. **Call your bank immediately**
2. Say: "I need to make a $25 payment to Google"
3. Ask them to allow international/online payments
4. Try payment again in 10 minutes
5. Alternative: Use PayPal if available
6. Alternative: Use different card (credit card preferred)

---

### ❌ "Paid $25 but account not activated"

**Problem:** Processing delay

**Solution:**
1. Wait 1-2 hours (payment processing time)
2. Check email for confirmation
3. Check bank statement - payment went through?
4. If payment processed but account still locked:
   - Wait 24 hours
   - Contact Google Play support
   - Have transaction ID ready

---

## 🌐 Internet/Connection Issues

### ❌ "Network request failed"

**Problem:** Internet connection or firewall

**Solution:**
1. Check internet connection
2. Try different network (phone hotspot, different WiFi)
3. Disable VPN if using one
4. Check if firewall is blocking:
   - Allow: expo.dev
   - Allow: play.google.com
5. Restart router
6. Try again

---

### ❌ "Unable to resolve host"

**Problem:** DNS issue

**Solution:**
```bash
# Flush DNS cache

# Windows:
ipconfig /flushdns

# Mac:
sudo dscacheutil -flushcache

# Then try again
```

---

## 📱 Testing Issues

### ❌ "Expo Go app won't scan QR code"

**Problem:** Wrong network or app version

**Solution:**
1. Make sure phone and computer on SAME WiFi
2. Update Expo Go app on phone
3. Update Expo CLI on computer:
   ```bash
   npm install -g expo-cli
   ```
4. Try different method:
   - Type `a` to open Android emulator
   - Or share link manually to phone

---

### ❌ "App crashes when requesting SMS permission"

**Problem:** Permission not properly configured

**Solution:**
1. Check `mobile-app/app.json` has:
   ```json
   "android": {
     "permissions": [
       "android.permission.READ_SMS",
       "android.permission.RECEIVE_SMS"
     ]
   }
   ```
2. Rebuild app:
   ```bash
   eas build --platform android --profile production
   ```

---

## 💡 General Tips

### "I'm completely stuck and don't know what to do"

**Step-by-step recovery:**
1. **Stop and breathe** - It's okay to be stuck
2. **Read the error message** - Screenshot it
3. **Google the exact error** - Someone else had this
4. **Check the guides** - BEGINNER_GUIDE.md, VISUAL_GUIDE.md
5. **Start fresh** - Sometimes easiest to restart from a clean state

### "Build works but app doesn't work on my phone"

**Debug steps:**
1. Check you're testing the production .aab (not development)
2. Install directly from Play Store (after approval)
3. Grant all permissions when asked
4. Check backend API is running: https://income-tax-tracker.onrender.com/api/health
5. Check phone has internet connection

### "Everything works but no one is downloading my app"

**Marketing tips:**
1. Share direct link (don't rely on search)
2. Post on social media with demo video
3. Ask friends/family to install and review
4. Post on Nigerian forums (Nairaland, etc.)
5. Make a TikTok/Instagram showing SMS feature
6. Join finance/tax groups and share (don't spam!)

---

## 🆘 When to Ask for Help

**Google first:**
- Copy exact error message
- Search: "[error message] expo react native"
- Check: Stack Overflow, Expo forums

**Ask Expo community:**
- https://forums.expo.dev
- https://discord.gg/expo

**Contact Google Play support:**
- Only for account/policy issues
- https://support.google.com/googleplay/android-developer

**Contact your bank:**
- Payment issues
- Card declined

---

## ✅ Success Checklist

If you've done these, you're on the right track:

- [ ] Can see version numbers for: node, git, expo, eas
- [ ] Can open project in VS Code
- [ ] Ran `npm install` without errors
- [ ] Logged into Expo successfully
- [ ] Build completed and downloaded .aab file
- [ ] Created Google Play account (paid $25)
- [ ] All Play Console sections show ✅
- [ ] Uploaded .aab file
- [ ] Submitted for review
- [ ] Received confirmation email

**If all checked = You did everything right! Just wait for approval! 🎉**

---

## 🔄 Quick Reset (Start Over)

If totally stuck, start fresh:

```bash
# 1. Delete everything
cd mobile-app
rm -rf node_modules
rm -rf .expo

# 2. Reinstall
npm install

# 3. Login fresh
eas logout
eas login

# 4. Try build again
eas build --platform android --profile production
```

Sometimes the cleanest solution!

---

## 📞 Emergency Contacts

**Expo Status:** https://status.expo.dev
**Google Play Status:** https://developers.google.com/status

**Support:**
- Expo Forums: https://forums.expo.dev
- Google Play Support: https://support.google.com/googleplay/android-developer
- Stack Overflow: https://stackoverflow.com (tag: expo, react-native)

---

**Remember: Every developer faces these issues. You're not alone! Keep trying! 💪**

**Most problems have simple solutions - just need to find them! 🔍**

---

*Last updated: January 2026*
