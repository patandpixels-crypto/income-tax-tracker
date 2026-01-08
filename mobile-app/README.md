# Income Tax Tracker - Mobile App

A React Native mobile application for tracking income and calculating taxes, with **automatic bank SMS alert detection**.

## Features

### Core Features (from Web App)
- ✅ User authentication (register/login)
- ✅ Transaction tracking
- ✅ Nigerian tax calculation with progressive brackets
- ✅ Tax summary dashboard
- ✅ Transaction management (view/delete)

### Mobile-Exclusive Features
- 📱 **Automatic Bank SMS Detection** - Automatically scan and import bank credit alerts
- 🔔 **SMS Permissions** - Read SMS messages to detect bank transactions
- 📊 **Real-time Parsing** - Intelligent parsing of Nigerian bank SMS formats
- 🏦 **Multi-Bank Support** - Supports GTBank, Access, Zenith, First Bank, UBA, Stanbic, Kuda, OPay, Moniepoint, PalmPay
- 🔄 **Pull to Refresh** - Easy data synchronization
- 📱 **Native Mobile UI** - Optimized for mobile devices

## Technology Stack

- **React Native 0.74** with Expo
- **Expo Router** for navigation
- **AsyncStorage** for local data persistence
- **Axios** for API calls
- **react-native-sms-android** for SMS reading (Android only)

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Android device or emulator (for SMS features)
- iOS device or simulator (limited SMS features)

## Installation

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - **Android:** Press `a` or run `npm run android`
   - **iOS:** Press `i` or run `npm run ios`
   - **Expo Go App:** Scan the QR code with Expo Go app

## SMS Permissions (Android)

The app requires the following Android permissions to scan bank SMS alerts:

- `READ_SMS` - Read existing SMS messages
- `RECEIVE_SMS` - Receive new SMS messages

These permissions are requested at runtime when you tap "Scan Bank SMS Alerts".

### Granting Permissions

1. When prompted, tap "Allow" to grant SMS permissions
2. If denied, you can manually enable in: Settings → Apps → Income Tax Tracker → Permissions → SMS

**Note:** SMS reading is only available on Android devices. iOS does not allow apps to access SMS messages.

## How to Use

### 1. Create Account / Login
- Open the app
- Register with your email, password, and full name
- Or login if you already have an account

### 2. Scan Bank SMS Alerts
- Tap the **"📱 Scan Bank SMS Alerts"** button on the dashboard
- Grant SMS permissions when prompted
- The app will automatically:
  - Scan your recent SMS messages
  - Identify bank alerts
  - Parse credit transactions
  - Import them to your account

### 3. View Tax Summary
- See your total income
- View estimated tax based on Nigerian tax brackets
- Check net income after tax
- Monitor effective tax rate

### 4. Manage Transactions
- View all imported transactions
- Delete incorrect entries
- Pull down to refresh data

## Supported Banks

The app automatically detects SMS alerts from these Nigerian banks:

- **GTBank** (Guaranty Trust Bank)
- **Access Bank**
- **Zenith Bank**
- **First Bank**
- **UBA** (United Bank for Africa)
- **Stanbic IBTC**
- **Kuda Bank**
- **OPay**
- **Moniepoint**
- **PalmPay**

## Project Structure

```
mobile-app/
├── app/                    # Expo Router screens
│   ├── _layout.js         # Root layout with navigation
│   ├── index.js           # Welcome screen
│   ├── login.js           # Login screen
│   ├── register.js        # Registration screen
│   └── dashboard.js       # Main dashboard
├── components/            # Reusable components (future)
├── services/              # API and services
│   ├── api.js            # API client and endpoints
│   └── smsReader.js      # SMS reading and parsing service
├── utils/                 # Utility functions
│   ├── parser.js         # Transaction text parser
│   └── taxCalculator.js  # Tax calculation logic
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── babel.config.js       # Babel configuration
```

## API Integration

The mobile app connects to the same backend API as the web app:

**API URL:** `https://income-tax-tracker.onrender.com/api`

### Endpoints Used:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile
- `GET /api/transactions` - Fetch all transactions
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/:id` - Delete transaction

## SMS Parsing Logic

The app intelligently parses bank SMS alerts by:

1. **Detecting Bank:** Identifies the bank from sender ID or message content
2. **Extracting Amount:** Parses NGN and USD formatted amounts
3. **Credit/Debit Classification:** Determines if transaction is credit or debit
4. **Description Extraction:** Pulls relevant transaction details
5. **Date Capture:** Uses SMS timestamp

### Parsing Example:

**SMS:**
```
GTBank: Credit Alert
Acct: ***1234
Amt: NGN 50,000.00
Desc: Transfer from John Doe
Date: 08-Jan-2026
Bal: NGN 150,000.00
```

**Parsed Result:**
- Amount: 50000
- Bank: GTBank
- Type: Credit
- Description: Transfer from John Doe
- Date: 2026-01-08

## Building for Production

### Android APK

```bash
eas build --platform android --profile preview
```

### iOS App

```bash
eas build --platform ios --profile preview
```

## Troubleshooting

### SMS Permissions Not Working
- Make sure you're testing on an Android device (not iOS)
- Check that permissions are granted in device settings
- Restart the app after granting permissions

### Transactions Not Importing
- Verify SMS messages are from supported banks
- Check that messages contain credit transactions (debits are filtered out)
- Ensure backend API is accessible

### App Won't Start
- Clear Expo cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Update Expo: `expo upgrade`

## Differences from Web App

| Feature | Web App | Mobile App |
|---------|---------|------------|
| SMS Scanning | ❌ Manual image upload | ✅ Automatic SMS reading |
| OCR | ✅ Claude API | ❌ Not needed |
| Platform | 🌐 Browser | 📱 iOS/Android |
| Auth Storage | LocalStorage | AsyncStorage |
| Navigation | Single page | Multi-screen |

## Future Enhancements

- [ ] Background SMS monitoring for real-time imports
- [ ] Push notifications for new transactions
- [ ] Export transactions to CSV
- [ ] Offline mode with sync
- [ ] Biometric authentication
- [ ] Transaction categorization
- [ ] Custom tax bracket configuration

## Contributing

This mobile app is part of the Income Tax Tracker project. It reuses the same backend API and database.

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.

---

**Built with ❤️ using React Native and Expo**
