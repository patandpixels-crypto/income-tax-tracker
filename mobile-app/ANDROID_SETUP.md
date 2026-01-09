# Android Setup for SMS Reading

This guide explains how to properly configure Android permissions for SMS reading functionality.

## Required Permissions

The app needs these Android permissions to scan bank SMS alerts:

```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
```

These are already configured in `app.json` under `android.permissions`.

## Runtime Permissions

Starting from Android 6.0 (API 23), dangerous permissions like SMS must be requested at runtime.

### How It Works in the App

1. **User Action:** User taps "Scan Bank SMS Alerts" button
2. **Permission Request:** App calls `smsReader.requestPermissions()`
3. **User Decision:** Android shows permission dialog
4. **Grant/Deny:** User accepts or denies
5. **Action:** If granted, SMS scanning proceeds

### Permission Flow Code

```javascript
// services/smsReader.js
async requestPermissions() {
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);

  return (
    granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
    granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
  );
}
```

## Testing Permissions

### On Real Android Device

1. Install the app via Expo Go or APK
2. Navigate to dashboard
3. Tap "Scan Bank SMS Alerts"
4. Accept permission dialog
5. App will scan inbox for bank SMS

### Checking Permission Status

**Via Device Settings:**
```
Settings → Apps → Income Tax Tracker → Permissions → SMS → Allow
```

**Via ADB (Debug):**
```bash
adb shell dumpsys package com.incometaxtracker.mobile | grep permission
```

## SMS Reading Implementation

### Library Used: react-native-sms-android

```javascript
import SmsAndroid from 'react-native-sms-android';

// Read SMS
SmsAndroid.list(
  JSON.stringify({ box: 'inbox', maxCount: 50 }),
  (fail) => console.error(fail),
  (count, smsList) => {
    const messages = JSON.parse(smsList);
    // Process messages
  }
);
```

### Filtering Bank SMS

```javascript
const BANK_SENDERS = [
  'GTBank', 'AccessBank', 'ZenithBank', 'FirstBank',
  'UBA', 'StanbicIBTC', 'Kuda', 'OPAY', 'Moniepoint', 'PalmPay'
];

isBankSender(sender) {
  return BANK_SENDERS.some(bank =>
    sender.toUpperCase().includes(bank.toUpperCase())
  );
}
```

## Building for Production

### Expo Build (EAS Build)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS:**
   ```bash
   eas build:configure
   ```

3. **Build APK:**
   ```bash
   eas build --platform android --profile preview
   ```

### Manual Android Build

If you need native code access:

1. **Eject from Expo:**
   ```bash
   expo prebuild
   ```

2. **Modify AndroidManifest.xml:**
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="android.permission.READ_SMS" />
   <uses-permission android:name="android.permission.RECEIVE_SMS" />
   ```

3. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## Google Play Store Requirements

If publishing to Google Play, you must:

1. **Declare SMS Permissions Use:** Explain why you need SMS access in the Privacy Policy
2. **Permission Declaration Form:** Fill out Google Play's Permissions Declaration form
3. **SMS/Call Log Policy:** Comply with Google's restricted permissions policy

### Acceptable Use Cases (per Google):
- ✅ Banking/financial apps that read transaction SMS
- ✅ Expense tracking apps
- ❌ Apps that share SMS data with third parties
- ❌ Apps that don't clearly explain SMS usage

## Privacy Considerations

### What the App Does:
- ✅ Reads SMS locally on device
- ✅ Filters for bank SMS only
- ✅ Sends parsed transaction data to backend
- ✅ Does NOT store raw SMS on server

### What the App Does NOT Do:
- ❌ Read personal SMS messages
- ❌ Share SMS with third parties
- ❌ Upload raw SMS content
- ❌ Access SMS without user action

## Troubleshooting

### Permission Denied
**Problem:** User denied SMS permissions

**Solution:**
```javascript
Alert.alert(
  'Permission Required',
  'Please grant SMS permissions in Settings',
  [
    { text: 'Cancel' },
    {
      text: 'Settings',
      onPress: () => Linking.openSettings()
    }
  ]
);
```

### SMS Not Reading
**Problem:** `react-native-sms-android` not working

**Solution:**
1. Check permissions are granted
2. Verify Android version (works on Android 6.0+)
3. Test on real device (not emulator)
4. Check SMS inbox has messages

### Package Not Found
**Problem:** Module `react-native-sms-android` not found

**Solution:**
```bash
npm install react-native-sms-android
expo prebuild
```

## Alternative: Expo SMS Module

For simpler setup, you can use Expo's built-in SMS module:

```bash
expo install expo-sms
```

**Note:** Expo SMS can only SEND SMS, not READ SMS. For reading SMS, you must use `react-native-sms-android` or native code.

## Security Best Practices

1. **Request permissions only when needed** (not on app startup)
2. **Explain why** you need SMS access before requesting
3. **Filter SMS by sender** to avoid reading personal messages
4. **Don't store raw SMS** on the server
5. **Use HTTPS** for all API calls
6. **Sanitize data** before sending to backend

## Testing Without SMS

For development without real bank SMS:

```javascript
// Mock SMS for testing
const mockBankSMS = {
  address: 'GTBank',
  body: 'Credit Alert: NGN 50,000.00 from John Doe',
  date: Date.now(),
};

await smsReader.processBankSMS(mockBankSMS);
```

## Resources

- [Android Permissions Guide](https://developer.android.com/guide/topics/permissions/overview)
- [react-native-sms-android Docs](https://github.com/rhaker/react-native-sms-android)
- [Google Play SMS & Call Log Policy](https://support.google.com/googleplay/android-developer/answer/9047303)

---

**Need help? Check the main README or open an issue!**
