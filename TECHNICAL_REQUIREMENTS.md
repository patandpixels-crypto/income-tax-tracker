# Technical Requirements Document
## Income Tax Tracker Platform

**Version:** 1.0
**Date:** March 2, 2026
**Status:** Production-Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Requirements](#5-data-requirements)
6. [Security Requirements](#6-security-requirements)
7. [Integration Requirements](#7-integration-requirements)
8. [Platform-Specific Requirements](#8-platform-specific-requirements)
9. [Performance Requirements](#9-performance-requirements)
10. [Deployment Requirements](#10-deployment-requirements)
11. [Compliance Requirements](#11-compliance-requirements)

---

## 1. Executive Summary

### 1.1 Purpose
The Income Tax Tracker is a comprehensive multi-platform application designed to help Nigerian income earners automatically track their income and calculate tax obligations based on the Personal Income Tax Act (PITA). The system provides intelligent automation through bank SMS alert detection, AI-powered document processing, and real-time tax calculations.

### 1.2 Scope
- **Web Application**: Full-featured dashboard for income tracking and tax calculation
- **Mobile Application**: Android/iOS app with automatic SMS transaction detection
- **Backend API**: RESTful service with PostgreSQL database and AI integration
- **Target Market**: Individual Nigerian taxpayers, freelancers, and salary earners

### 1.3 Key Differentiators
- Automatic transaction detection via SMS (Android)
- AI-powered OCR for bank screenshots and PDF statements
- Progressive tax calculation aligned with Nigerian PITA
- Multi-bank support (10+ Nigerian banks)
- Cross-platform synchronization

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Web Client    │         │  Mobile Client  │
│  (React/Vite)   │         │ (React Native)  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └──────────┬────────────────┘
                    │ HTTPS/REST API
         ┌──────────▼────────────┐
         │   Backend Server      │
         │  (Node.js/Express)    │
         └──────────┬────────────┘
                    │
         ┌──────────┼────────────┬──────────────┐
         │          │            │              │
    ┌────▼───┐ ┌───▼────┐ ┌────▼─────┐  ┌────▼────┐
    │ PostgreSQL│ │Claude AI│ │Google   │  │Bank SMS │
    │ Database  │ │   API   │ │  OAuth  │  │ Alerts  │
    └──────────┘ └─────────┘ └──────────┘  └─────────┘
```

### 2.2 Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Web Frontend** | React | 18.2 |
| | Vite | 5.0 |
| | Tailwind CSS | 3.4 |
| **Mobile Frontend** | React Native | 0.81 |
| | Expo SDK | 54 |
| **Backend** | Node.js + Express | 4.18 |
| | PostgreSQL | 8.11 |
| **AI/ML** | Claude API (Anthropic) | Sonnet 4 |
| **Authentication** | JWT + Google OAuth 2.0 | - |

---

## 3. Functional Requirements

### 3.1 User Management

#### 3.1.1 Authentication
- **FR-AUTH-001**: System SHALL support email/password registration
- **FR-AUTH-002**: System SHALL support email/password login
- **FR-AUTH-003**: System SHALL support Google OAuth 2.0 authentication
- **FR-AUTH-004**: System SHALL issue JWT tokens with 7-day expiration
- **FR-AUTH-005**: System SHALL hash passwords using bcryptjs with salt rounds
- **FR-AUTH-006**: Users SHALL be able to retrieve their profile information
- **FR-AUTH-007**: Users SHALL be able to update their bank alert name
- **FR-AUTH-008**: Users SHALL be able to request account deletion

#### 3.1.2 User Profile
- **FR-USER-001**: Profile SHALL store: email, name, password (encrypted), google_id, bank_alert_name
- **FR-USER-002**: Email addresses MUST be unique across the system
- **FR-USER-003**: Bank alert name SHALL be used for SMS parsing personalization

### 3.2 Transaction Management

#### 3.2.1 Transaction Creation
- **FR-TRANS-001**: Users SHALL create transactions manually via web/mobile forms
- **FR-TRANS-002**: Users SHALL create transactions via SMS detection (Android mobile)
- **FR-TRANS-003**: Users SHALL create transactions via OCR image upload
- **FR-TRANS-004**: Users SHALL create transactions via PDF bank statement upload
- **FR-TRANS-005**: System SHALL support bulk transaction creation
- **FR-TRANS-006**: Each transaction SHALL contain: date, amount, description, bank, type, tax_category, income_type

#### 3.2.2 Transaction Classification
- **FR-TRANS-007**: System SHALL automatically classify transactions as taxable/non-taxable/unclassified
- **FR-TRANS-008**: Classification SHALL use keyword-based pattern matching
- **FR-TRANS-009**: Taxable keywords: salary, bonus, commission, freelance, consulting, business, invoice, rental, interest
- **FR-TRANS-010**: Non-taxable keywords: gift, loan, refund, dividend, pension, insurance, gratuity
- **FR-TRANS-011**: Users SHALL manually reclassify transactions via UI
- **FR-TRANS-012**: System SHALL support income types: salary, business, gift, loan, dividend, refund, pension, interest, other

#### 3.2.3 Transaction Operations
- **FR-TRANS-013**: Users SHALL view all their transactions
- **FR-TRANS-014**: Users SHALL delete individual transactions
- **FR-TRANS-015**: Users SHALL export transactions to CSV format
- **FR-TRANS-016**: Transactions SHALL be filterable by date range
- **FR-TRANS-017**: System SHALL prevent duplicate transactions based on date, amount, and description

### 3.3 Tax Calculation

#### 3.3.1 Nigerian PITA Tax Brackets
- **FR-TAX-001**: System SHALL implement Nigerian progressive tax rates:
  - ₦0 - ₦800,000: 0%
  - ₦800,001 - ₦3,000,000: 15%
  - ₦3,000,001 - ₦12,000,000: 18%
  - ₦12,000,001 - ₦25,000,000: 21%
  - ₦25,000,001 - ₦50,000,000: 23%
  - ₦50,000,001+: 25%

#### 3.3.2 Tax Calculations
- **FR-TAX-002**: System SHALL calculate total gross income (sum of taxable transactions)
- **FR-TAX-003**: System SHALL calculate total non-taxable income separately
- **FR-TAX-004**: System SHALL calculate estimated tax based on progressive brackets
- **FR-TAX-005**: System SHALL calculate net income (gross income - tax)
- **FR-TAX-006**: System SHALL calculate effective tax rate (tax/income × 100)
- **FR-TAX-007**: All calculations SHALL use NGN currency

### 3.4 Document Processing

#### 3.4.1 OCR Image Processing
- **FR-DOC-001**: System SHALL accept bank screenshot images (JPEG, PNG)
- **FR-DOC-002**: System SHALL extract text from images using Claude AI
- **FR-DOC-003**: System SHALL parse extracted text for transaction details
- **FR-DOC-004**: Maximum image size: 50MB
- **FR-DOC-005**: OCR SHALL use Claude Sonnet model with 1000 max tokens

#### 3.4.2 PDF Bank Statement Processing
- **FR-DOC-006**: System SHALL accept PDF bank statements
- **FR-DOC-007**: System SHALL extract transactions from PDF statements using Claude AI
- **FR-DOC-008**: System SHALL detect and warn about overlapping statement periods
- **FR-DOC-009**: System SHALL store statement metadata (filename, period, transaction count)
- **FR-DOC-010**: PDF processing SHALL use Claude Sonnet model with 4000 max tokens
- **FR-DOC-011**: System SHALL process up to 15,000 characters of PDF text per request

### 3.5 SMS Alert Detection (Mobile Android Only)

#### 3.5.1 SMS Monitoring
- **FR-SMS-001**: Android app SHALL monitor incoming SMS messages
- **FR-SMS-002**: System SHALL parse credit/debit transaction alerts
- **FR-SMS-003**: System SHALL support 10+ Nigerian banks:
  - GTBank, UBA, Access Bank, Zenith Bank, First Bank
  - Stanbic IBTC, Kuda Bank, OPay, Moniepoint, PalmPay
- **FR-SMS-004**: SMS listener SHALL run as background service
- **FR-SMS-005**: Users SHALL toggle SMS listener on/off

#### 3.5.2 SMS Parsing
- **FR-SMS-006**: System SHALL extract: amount, bank name, transaction type, sender/recipient
- **FR-SMS-007**: System SHALL determine debit vs credit transactions
- **FR-SMS-008**: System SHALL identify business names in payment recipients
- **FR-SMS-009**: Parsed SMS data SHALL be stored in raw_sms field
- **FR-SMS-010**: Users SHALL approve transactions before addition (one-tap)

#### 3.5.3 Notifications
- **FR-SMS-011**: System SHALL send push notifications for detected transactions
- **FR-SMS-012**: Notifications SHALL include amount and bank details

### 3.6 Dashboard & Reporting

#### 3.6.1 Web Dashboard
- **FR-DASH-001**: Dashboard SHALL display total income
- **FR-DASH-002**: Dashboard SHALL display estimated tax
- **FR-DASH-003**: Dashboard SHALL display net income (after tax)
- **FR-DASH-004**: Dashboard SHALL display non-taxable income
- **FR-DASH-005**: Dashboard SHALL display recent transactions list
- **FR-DASH-006**: Dashboard SHALL update in real-time on transaction changes

#### 3.6.2 Mobile Dashboard
- **FR-DASH-007**: Mobile dashboard SHALL include all web dashboard features
- **FR-DASH-008**: Mobile dashboard SHALL include SMS listener controls
- **FR-DASH-009**: Mobile dashboard SHALL include manual transaction entry
- **FR-DASH-010**: Mobile dashboard SHALL include settings (bank alert name, logout)

---

## 4. Technical Architecture

### 4.1 Backend Architecture

#### 4.1.1 API Design
- **TR-API-001**: Backend SHALL implement RESTful API architecture
- **TR-API-002**: All endpoints SHALL use JSON format
- **TR-API-003**: API SHALL be versioned under `/api` prefix
- **TR-API-004**: API SHALL implement CORS with configurable origins
- **TR-API-005**: API SHALL support request body size up to 50MB

#### 4.1.2 API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google OAuth authentication
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/bank-name` - Update bank alert name
- `POST /api/auth/delete-account-request` - Request account deletion

**Transactions:**
- `GET /api/transactions` - Fetch user transactions
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/bulk` - Bulk create transactions
- `DELETE /api/transactions/:id` - Delete transaction
- `PUT /api/transactions/:id/classify` - Classify transaction

**Document Processing:**
- `POST /api/extract-text` - OCR image processing
- `POST /api/extract-pdf` - PDF statement processing

**Bank Statements:**
- `GET /api/bank-statements` - List statements
- `POST /api/bank-statements` - Save statement metadata

**System:**
- `GET /api/health` - Health check

#### 4.1.3 Middleware
- **TR-API-006**: Authentication middleware SHALL verify JWT tokens
- **TR-API-007**: Protected routes SHALL require valid JWT
- **TR-API-008**: Token expiration SHALL be enforced
- **TR-API-009**: Request logging SHALL be implemented
- **TR-API-010**: Error handling middleware SHALL return consistent error format

### 4.2 Frontend Architecture (Web)

#### 4.2.1 Technology Stack
- **TR-WEB-001**: Web app SHALL use React 18.2
- **TR-WEB-002**: Web app SHALL use Vite 5.0 for bundling
- **TR-WEB-003**: Web app SHALL use Tailwind CSS 3.4 for styling
- **TR-WEB-004**: Web app SHALL use Axios for HTTP requests
- **TR-WEB-005**: Web app SHALL use Lucide React for icons

#### 4.2.2 State Management
- **TR-WEB-006**: Authentication state SHALL persist in localStorage
- **TR-WEB-007**: JWT tokens SHALL be stored in localStorage
- **TR-WEB-008**: Axios interceptors SHALL automatically attach JWT to requests
- **TR-WEB-009**: Token expiration SHALL trigger automatic logout

#### 4.2.3 Component Structure
- **TR-WEB-010**: Application SHALL use functional components with hooks
- **TR-WEB-011**: UI SHALL be responsive (mobile, tablet, desktop)
- **TR-WEB-012**: Forms SHALL include client-side validation
- **TR-WEB-013**: Loading states SHALL be displayed during API calls
- **TR-WEB-014**: Error messages SHALL be user-friendly

### 4.3 Mobile Architecture

#### 4.3.1 Technology Stack
- **TR-MOB-001**: Mobile app SHALL use React Native 0.81
- **TR-MOB-002**: Mobile app SHALL use Expo SDK 54
- **TR-MOB-003**: Mobile app SHALL use Expo Router for navigation
- **TR-MOB-004**: Mobile app SHALL use AsyncStorage for persistence
- **TR-MOB-005**: Mobile app SHALL use react-native-android-sms-listener for SMS (Android)

#### 4.3.2 State Management
- **TR-MOB-006**: Authentication state SHALL use Context API
- **TR-MOB-007**: User data SHALL be cached in AsyncStorage
- **TR-MOB-008**: App SHALL support offline mode with cached data
- **TR-MOB-009**: Token refresh SHALL occur on app launch

#### 4.3.3 Navigation
- **TR-MOB-010**: Navigation stack SHALL include: Welcome, Login, Register, Dashboard
- **TR-MOB-011**: Protected routes SHALL redirect to Login if unauthenticated
- **TR-MOB-012**: Navigation SHALL preserve state on screen transitions

#### 4.3.4 Platform-Specific Features
- **TR-MOB-013**: Android builds SHALL request SMS permissions (READ_SMS, RECEIVE_SMS)
- **TR-MOB-014**: iOS builds SHALL support limited functionality (no SMS access)
- **TR-MOB-015**: Camera access SHALL be requested for photo capture
- **TR-MOB-016**: Notifications permissions SHALL be requested

---

## 5. Data Requirements

### 5.1 Database Schema

#### 5.1.1 Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  name TEXT NOT NULL,
  google_id TEXT UNIQUE,
  bank_alert_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Constraints:**
- **DR-DB-001**: Email MUST be unique
- **DR-DB-002**: Password MAY be NULL (for Google OAuth users)
- **DR-DB-003**: Google_id MUST be unique when present
- **DR-DB-004**: Name is REQUIRED

#### 5.1.2 Transactions Table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  bank TEXT,
  raw_sms TEXT,
  tax_category TEXT CHECK (tax_category IN ('taxable', 'non_taxable', 'unclassified')),
  income_type TEXT CHECK (income_type IN ('salary', 'business', 'gift', 'loan', 'dividend', 'refund', 'pension', 'interest', 'other')),
  type TEXT NOT NULL CHECK (type IN ('credit', 'expense')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Constraints:**
- **DR-DB-005**: User_id MUST reference valid user
- **DR-DB-006**: Date format: YYYY-MM-DD
- **DR-DB-007**: Amount MUST be positive number
- **DR-DB-008**: Tax_category MUST be one of: taxable, non_taxable, unclassified
- **DR-DB-009**: Income_type MUST be predefined enum
- **DR-DB-010**: Type MUST be credit or expense
- **DR-DB-011**: Transactions CASCADE DELETE with user

#### 5.1.3 Bank Statements Table
```sql
CREATE TABLE bank_statements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  transaction_count INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Constraints:**
- **DR-DB-012**: User_id MUST reference valid user
- **DR-DB-013**: Statements CASCADE DELETE with user

### 5.2 Data Validation

#### 5.2.1 Input Validation
- **DR-VAL-001**: All user inputs SHALL be validated on client and server
- **DR-VAL-002**: Email format SHALL be validated with regex
- **DR-VAL-003**: Amounts SHALL be validated as positive numbers
- **DR-VAL-004**: Dates SHALL be validated in YYYY-MM-DD format
- **DR-VAL-005**: Enums SHALL be validated against allowed values

#### 5.2.2 Data Integrity
- **DR-INT-001**: Foreign key constraints SHALL be enforced
- **DR-INT-002**: Cascade deletes SHALL remove related data on user deletion
- **DR-INT-003**: Database SHALL use transactions for multi-step operations
- **DR-INT-004**: Duplicate detection SHALL prevent redundant transactions

---

## 6. Security Requirements

### 6.1 Authentication & Authorization

- **SR-AUTH-001**: All passwords SHALL be hashed using bcryptjs with minimum 10 salt rounds
- **SR-AUTH-002**: JWT tokens SHALL expire after 7 days
- **SR-AUTH-003**: JWT tokens SHALL be signed with secure secret key
- **SR-AUTH-004**: Protected endpoints SHALL verify JWT before processing
- **SR-AUTH-005**: Invalid tokens SHALL return 401 Unauthorized
- **SR-AUTH-006**: Google OAuth SHALL use verified client IDs
- **SR-AUTH-007**: OAuth tokens SHALL be validated server-side

### 6.2 Data Protection

- **SR-DATA-001**: All API communications SHALL use HTTPS in production
- **SR-DATA-002**: Database connections SHALL use SSL in production
- **SR-DATA-003**: Sensitive data (passwords) SHALL NEVER be logged
- **SR-DATA-004**: User tokens SHALL be stored securely (AsyncStorage/localStorage)
- **SR-DATA-005**: SMS data SHALL be processed locally, not transmitted unnecessarily
- **SR-DATA-006**: Claude API responses SHALL NOT be cached with sensitive data

### 6.3 Access Control

- **SR-ACCESS-001**: Users SHALL only access their own transactions
- **SR-ACCESS-002**: Database queries SHALL filter by authenticated user_id
- **SR-ACCESS-003**: Transaction deletion SHALL verify ownership
- **SR-ACCESS-004**: Profile updates SHALL verify authentication

### 6.4 Input Sanitization

- **SR-INPUT-001**: All user inputs SHALL be sanitized to prevent SQL injection
- **SR-INPUT-002**: React default XSS protection SHALL be enabled
- **SR-INPUT-003**: File uploads SHALL be validated by type and size
- **SR-INPUT-004**: API request size limits SHALL be enforced (50MB max)

### 6.5 Mobile Security

- **SR-MOB-001**: SMS permissions SHALL be requested with clear justification
- **SR-MOB-002**: Sensitive data SHALL NOT be logged in production
- **SR-MOB-003**: ProGuard/R8 obfuscation SHALL be enabled for release builds
- **SR-MOB-004**: API keys SHALL NOT be hardcoded in mobile app

---

## 7. Integration Requirements

### 7.1 Claude AI Integration

- **IR-CLAUDE-001**: System SHALL use Anthropic Claude API for OCR
- **IR-CLAUDE-002**: API model: claude-sonnet-4-20250514
- **IR-CLAUDE-003**: Image processing max tokens: 1000
- **IR-CLAUDE-004**: PDF processing max tokens: 4000
- **IR-CLAUDE-005**: API key SHALL be stored in environment variables
- **IR-CLAUDE-006**: Rate limiting SHALL be handled gracefully
- **IR-CLAUDE-007**: API errors SHALL be logged and user-friendly messages shown

### 7.2 Google OAuth Integration

- **IR-GOOGLE-001**: System SHALL use Google Sign-In SDK
- **IR-GOOGLE-002**: Client IDs SHALL be configured for web and mobile
- **IR-GOOGLE-003**: User profile data (email, name) SHALL be retrieved
- **IR-GOOGLE-004**: Google ID SHALL be stored for account linking
- **IR-GOOGLE-005**: OAuth flow SHALL handle errors gracefully

### 7.3 Android SMS Integration

- **IR-SMS-001**: System SHALL use react-native-android-sms-listener
- **IR-SMS-002**: SMS permissions SHALL be requested at runtime
- **IR-SMS-003**: SMS listener SHALL start/stop on user command
- **IR-SMS-004**: SMS parsing SHALL support 10+ bank formats
- **IR-SMS-005**: Failed SMS parsing SHALL not crash the app

### 7.4 Database Integration

- **IR-DB-001**: PostgreSQL connection SHALL use connection pooling
- **IR-DB-002**: Database URL SHALL be from environment variable
- **IR-DB-003**: SSL SHALL be required in production
- **IR-DB-004**: Connection errors SHALL trigger automatic retry
- **IR-DB-005**: Database initialization SHALL create tables if not exist

---

## 8. Platform-Specific Requirements

### 8.1 Web Application

#### 8.1.1 Browser Support
- **PR-WEB-001**: SHALL support Chrome 90+
- **PR-WEB-002**: SHALL support Firefox 88+
- **PR-WEB-003**: SHALL support Safari 14+
- **PR-WEB-004**: SHALL support Edge 90+

#### 8.1.2 Responsive Design
- **PR-WEB-005**: SHALL support mobile viewports (320px+)
- **PR-WEB-006**: SHALL support tablet viewports (768px+)
- **PR-WEB-007**: SHALL support desktop viewports (1024px+)
- **PR-WEB-008**: Layout SHALL adapt to screen size

#### 8.1.3 Build & Deployment
- **PR-WEB-009**: Build output SHALL be in `/dist` directory
- **PR-WEB-010**: Shall support Vercel deployment
- **PR-WEB-011**: Shall support Netlify deployment
- **PR-WEB-012**: Environment variables SHALL be injectable at build time

### 8.2 Mobile Application

#### 8.2.1 Android Requirements
- **PR-AND-001**: Minimum SDK version: 21 (Android 5.0)
- **PR-AND-002**: Target SDK version: 35
- **PR-AND-003**: Compile SDK version: 35
- **PR-AND-004**: Package name: `com.patch1d.incometaxtracker`
- **PR-AND-005**: SMS permissions: READ_SMS, RECEIVE_SMS
- **PR-AND-006**: ProGuard SHALL be enabled for release builds
- **PR-AND-007**: App SHALL be deployable to Google Play Store

#### 8.2.2 iOS Requirements
- **PR-IOS-001**: Minimum iOS version: 13.0
- **PR-IOS-002**: Bundle ID: `com.incometaxtracker.app`
- **PR-IOS-003**: Camera permissions SHALL be requested
- **PR-IOS-004**: Limited functionality (no SMS access)
- **PR-IOS-005**: App SHALL be deployable to App Store

#### 8.2.3 Build Configuration
- **PR-MOB-001**: Expo SDK version: 54
- **PR-MOB-002**: EAS Build SHALL be used for production builds
- **PR-MOB-003**: Development builds SHALL support OTA updates
- **PR-MOB-004**: App icon and splash screen SHALL be configured

---

## 9. Performance Requirements

### 9.1 Response Time

- **PERF-001**: API endpoints SHALL respond within 2 seconds (95th percentile)
- **PERF-002**: OCR image processing SHALL complete within 10 seconds
- **PERF-003**: PDF processing SHALL complete within 15 seconds
- **PERF-004**: Transaction list SHALL load within 1 second
- **PERF-005**: Dashboard calculations SHALL update within 500ms

### 9.2 Throughput

- **PERF-006**: System SHALL support 100 concurrent users
- **PERF-007**: Database SHALL handle 1000 transactions per user
- **PERF-008**: API SHALL handle 100 requests per minute per user

### 9.3 Resource Usage

- **PERF-009**: Mobile app size SHALL be under 50MB
- **PERF-010**: Web bundle size SHALL be under 5MB
- **PERF-011**: Database queries SHALL use indexes for user_id
- **PERF-012**: Image uploads SHALL be limited to 50MB

### 9.4 Scalability

- **PERF-013**: Database SHALL support horizontal scaling
- **PERF-014**: API SHALL be stateless for load balancing
- **PERF-015**: File uploads SHALL support chunked transfer

---

## 10. Deployment Requirements

### 10.1 Backend Deployment

- **DEP-BE-001**: Backend SHALL be deployed on Render.com
- **DEP-BE-002**: Production URL: `https://income-tax-tracker.onrender.com/api`
- **DEP-BE-003**: Node.js version: 18+ LTS
- **DEP-BE-004**: Port: 3001 (configurable via PORT env var)
- **DEP-BE-005**: Zero-downtime deployment SHALL be supported

#### 10.1.1 Environment Variables
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=<secure-secret-key>
ANTHROPIC_API_KEY=<claude-api-key>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
NODE_ENV=production
PORT=3001
FRONTEND_URL=<web-app-url>
```

### 10.2 Web Deployment

- **DEP-WEB-001**: Web app SHALL be deployable to Vercel
- **DEP-WEB-002**: Web app SHALL be deployable to Netlify
- **DEP-WEB-003**: Build command: `npm run build`
- **DEP-WEB-004**: Output directory: `dist`
- **DEP-WEB-005**: SPA rewrites SHALL be configured

#### 10.2.1 Environment Variables
```
VITE_API_URL=https://income-tax-tracker.onrender.com/api
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

### 10.3 Mobile Deployment

- **DEP-MOB-001**: Android builds SHALL use EAS Build
- **DEP-MOB-002**: Production APK SHALL be signed
- **DEP-MOB-003**: App SHALL be deployable to Google Play Store
- **DEP-MOB-004**: iOS builds SHALL use EAS Build (when ready)

#### 10.3.1 Build Configuration
- **Project ID**: `e4a836ef-186c-4604-baa4-2aef91a5457a`
- **Android Package**: `com.patch1d.incometaxtracker`
- **iOS Bundle**: `com.incometaxtracker.app`

### 10.4 Database Deployment

- **DEP-DB-001**: PostgreSQL SHALL be hosted on Render.com
- **DEP-DB-002**: SSL connections SHALL be enforced in production
- **DEP-DB-003**: Automated backups SHALL be configured
- **DEP-DB-004**: Database migrations SHALL be version-controlled

---

## 11. Compliance Requirements

### 11.1 Nigerian Tax Compliance

- **COMP-TAX-001**: Tax calculations SHALL follow PITA (Personal Income Tax Act)
- **COMP-TAX-002**: Tax brackets SHALL be accurate as of 2026
- **COMP-TAX-003**: System SHALL support NGN currency only
- **COMP-TAX-004**: Tax year SHALL align with calendar year (Jan-Dec)
- **COMP-TAX-005**: System SHALL NOT file taxes (information only)

### 11.2 Data Privacy

- **COMP-PRIV-001**: Privacy policy SHALL be displayed and accessible
- **COMP-PRIV-002**: Users SHALL consent to data collection
- **COMP-PRIV-003**: SMS data SHALL be processed locally (not stored by default)
- **COMP-PRIV-004**: Users SHALL be able to delete their accounts
- **COMP-PRIV-005**: User data SHALL be deleted upon account deletion
- **COMP-PRIV-006**: No data SHALL be sold to third parties

### 11.3 Mobile App Store Compliance

- **COMP-STORE-001**: Privacy policy SHALL be published and linked
- **COMP-STORE-002**: SMS permissions SHALL have clear usage description
- **COMP-STORE-003**: Camera permissions SHALL have clear usage description
- **COMP-STORE-004**: App SHALL comply with Google Play policies
- **COMP-STORE-005**: App SHALL comply with Apple App Store guidelines

### 11.4 Accessibility

- **COMP-ACCESS-001**: Web app SHALL meet WCAG 2.1 Level AA where feasible
- **COMP-ACCESS-002**: Color contrast SHALL meet minimum ratios
- **COMP-ACCESS-003**: Forms SHALL have proper labels
- **COMP-ACCESS-004**: Keyboard navigation SHALL be supported

---

## 12. Testing Requirements

### 12.1 Unit Testing

- **TEST-UNIT-001**: Tax calculation functions SHALL have unit tests
- **TEST-UNIT-002**: SMS parsing functions SHALL have unit tests
- **TEST-UNIT-003**: Transaction classification SHALL have unit tests
- **TEST-UNIT-004**: Utility functions SHALL have unit tests
- **TEST-UNIT-005**: Code coverage target: 70%+

### 12.2 Integration Testing

- **TEST-INT-001**: API endpoints SHALL be integration tested
- **TEST-INT-002**: Database operations SHALL be tested
- **TEST-INT-003**: Authentication flow SHALL be tested
- **TEST-INT-004**: Claude API integration SHALL be mocked and tested

### 12.3 E2E Testing

- **TEST-E2E-001**: User registration flow SHALL be tested
- **TEST-E2E-002**: Login and authentication SHALL be tested
- **TEST-E2E-003**: Transaction creation flows SHALL be tested
- **TEST-E2E-004**: Tax calculation display SHALL be tested

### 12.4 Mobile Testing

- **TEST-MOB-001**: App SHALL be tested on Android 5.0+
- **TEST-MOB-002**: App SHALL be tested on iOS 13.0+
- **TEST-MOB-003**: SMS detection SHALL be tested with real bank alerts
- **TEST-MOB-004**: Offline mode SHALL be tested

---

## 13. Monitoring & Logging

### 13.1 Application Logging

- **MON-LOG-001**: API requests SHALL be logged with timestamp, method, path
- **MON-LOG-002**: Errors SHALL be logged with stack traces
- **MON-LOG-003**: Authentication failures SHALL be logged
- **MON-LOG-004**: Claude API calls SHALL be logged (without sensitive data)
- **MON-LOG-005**: Production logs SHALL NOT include sensitive user data

### 13.2 Health Monitoring

- **MON-HEALTH-001**: Health check endpoint SHALL be available at `/api/health`
- **MON-HEALTH-002**: Database connection SHALL be monitored
- **MON-HEALTH-003**: API response times SHALL be monitored
- **MON-HEALTH-004**: Error rates SHALL be tracked

### 13.3 Analytics

- **MON-ANALYTICS-001**: User registration events MAY be tracked
- **MON-ANALYTICS-002**: Transaction creation methods MAY be tracked
- **MON-ANALYTICS-003**: Feature usage MAY be analyzed
- **MON-ANALYTICS-004**: Analytics SHALL respect user privacy

---

## 14. Documentation Requirements

### 14.1 User Documentation

- **DOC-USER-001**: README SHALL explain project setup
- **DOC-USER-002**: Privacy policy SHALL be published
- **DOC-USER-003**: Mobile app setup guide SHALL be available
- **DOC-USER-004**: Play Store publishing guide SHALL be maintained

### 14.2 Developer Documentation

- **DOC-DEV-001**: API endpoints SHALL be documented
- **DOC-DEV-002**: Database schema SHALL be documented
- **DOC-DEV-003**: Environment variables SHALL be documented
- **DOC-DEV-004**: Build and deployment processes SHALL be documented
- **DOC-DEV-005**: Code SHALL include comments for complex logic

### 14.3 Architecture Documentation

- **DOC-ARCH-001**: System architecture diagram SHALL be maintained
- **DOC-ARCH-002**: Data flow diagrams SHALL be available
- **DOC-ARCH-003**: Technology decisions SHALL be documented
- **DOC-ARCH-004**: Integration points SHALL be documented

---

## 15. Supported Bank Formats

### 15.1 Nigerian Banks

The system SHALL support SMS alert parsing for the following banks:

1. **GTBank** (Guaranty Trust Bank)
2. **UBA** (United Bank for Africa)
3. **Access Bank**
4. **Zenith Bank**
5. **First Bank of Nigeria**
6. **Stanbic IBTC Bank**
7. **Kuda Bank** (Digital Bank)
8. **OPay** (Fintech)
9. **Moniepoint** (Fintech)
10. **PalmPay** (Fintech)

Each bank format SHALL include:
- Amount extraction (NGN format with commas)
- Sender/Recipient parsing
- Transaction type determination (debit/credit)
- Balance extraction (when available)

---

## 16. Future Enhancements (Roadmap)

### 16.1 Planned Features

- **FUTURE-001**: Enhanced tax classification with multiple non-taxable income types
- **FUTURE-002**: Tax filing assistance and document generation
- **FUTURE-003**: Multi-year tax comparison
- **FUTURE-004**: Tax planning and projections
- **FUTURE-005**: Expense tracking and deductions
- **FUTURE-006**: Receipt scanning and categorization
- **FUTURE-007**: Tax consultant integration
- **FUTURE-008**: Real-time tax updates based on PITA changes
- **FUTURE-009**: Multiple currency support
- **FUTURE-010**: Bank account direct integration (Open Banking API)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **PITA** | Personal Income Tax Act - Nigerian tax legislation |
| **OCR** | Optical Character Recognition - technology to extract text from images |
| **JWT** | JSON Web Token - authentication token format |
| **EAS** | Expo Application Services - build service for React Native |
| **OTA** | Over-The-Air - remote app updates |
| **NGN** | Nigerian Naira - official currency of Nigeria |
| **SMS** | Short Message Service - text messaging |
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |

---

## Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-02 | System | Initial comprehensive technical requirements document |

---

## Appendix C: References

1. **Personal Income Tax Act (PITA)** - Nigerian tax legislation
2. **Claude API Documentation** - https://docs.anthropic.com/
3. **React Native Documentation** - https://reactnavigator.org/
4. **PostgreSQL Documentation** - https://www.postgresql.org/docs/
5. **Expo Documentation** - https://docs.expo.dev/

---

**Document Status**: Production-Ready
**Last Updated**: March 2, 2026
**Maintained By**: Development Team
