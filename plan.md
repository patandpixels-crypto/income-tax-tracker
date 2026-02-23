# Tax Classification Feature - Implementation Plan

## Overview
Classify every transaction as taxable or non-taxable based on the Nigerian Personal Income Tax Act (PITA). Replace the Expenses card (mobile) and Effective Rate card (web) with Non-Taxable Income. Flag ambiguous transactions for user classification.

---

## Step 1: Database Schema Update
**File:** `backend/server.js` (initializeDatabase)

Add two columns to `transactions` table:
- `tax_category` TEXT: `'taxable'`, `'non_taxable'`, or `'unclassified'` (default: `'unclassified'`)
- `income_type` TEXT: `'salary'`, `'business'`, `'gift'`, `'loan'`, `'dividend'`, `'refund'`, `'other'` (default: `'other'`)

Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so existing data isn't lost.

---

## Step 2: Auto-Classification Logic
**File:** `backend/server.js` (new function `classifyTransaction(description)`)

Keyword-based classifier for transaction descriptions:

**Taxable keywords** → `{tax_category: 'taxable'}`:
- salary, sal, wage, monthly pay, bonus, commission, incentive
- freelance, consulting, contract, invoice, payment for, service
- rent, rental, lease, business, revenue

**Non-taxable keywords** → `{tax_category: 'non_taxable'}`:
- gift, birthday, wedding, congratulations
- loan, borrow, lending
- refund, reversal, chargeback, returned
- dividend, insurance, claim, pension, gratuity

**Unclassified** → `{tax_category: 'unclassified'}`:
- Empty/null description
- Description < 3 meaningful words
- Generic transfer with just a person's name
- No matching keywords from either category

---

## Step 3: Backend Endpoints
**File:** `backend/server.js`

1. **Update POST /api/transactions** — auto-classify on creation, store tax_category and income_type
2. **Update GET /api/transactions** — return tax_category and income_type fields
3. **New: PUT /api/transactions/:id/classify** — user manually classifies a transaction
   - Body: `{tax_category: 'taxable'|'non_taxable', income_type: 'gift'|'loan'|'salary'|...}`
4. **Update POST /api/extract-pdf** — include auto-classification for each extracted transaction

---

## Step 4: Web Frontend Changes
**File:** `src/App.jsx`

1. **Tax calculation**: Change `totalIncome` to only sum taxable transactions for tax calculation
   - `totalIncome` = sum of ALL transactions (for display)
   - `taxableIncome` = sum of transactions where `tax_category === 'taxable'`
   - `nonTaxableIncome` = sum of transactions where `tax_category === 'non_taxable'`
   - Tax calculated on `taxableIncome` only

2. **Stat cards** (4 cards):
   - Total Income → stays (all income)
   - Estimated Tax → calculated on taxable income only
   - Net (After Tax) → taxableIncome - tax + nonTaxableIncome
   - **Effective Rate → REPLACE with Non-Taxable Income** showing `nonTaxableIncome`

3. **Transaction list**: Add tax category badge next to each transaction
   - Green "Taxable" badge
   - Blue "Non-Taxable" badge
   - Orange "Unclassified" badge with classify buttons

4. **Classification UI for unclassified transactions**: Inline button group:
   - "Gift" → non_taxable
   - "Loan" → non_taxable
   - "Pay for work" → taxable
   - Calls PUT /api/transactions/:id/classify

5. **PDF modal**: Show classification for each extracted transaction

---

## Step 5: Mobile App Changes

### DashboardScreen.js
1. **Stat cards**: Replace "Expenses" card with "Non-Taxable Income"
2. **Tax calculation**: Same logic — only taxable income used for tax
3. **Transaction list**: Add badges + classification prompt for unclassified items

### taxCalculator.js
- No changes needed (just receives income amount)

### api.js
- Add `classifyTransaction(id, taxCategory, incomeType)` API call

### bankAlertParser.js
- Add classification logic to `parseBankAlert()` return value

---

## Step 6: Classification Prompt for Unclassified Transactions

Both web and mobile show a banner at the top if there are unclassified transactions:
> "⚠️ X transactions need classification. These couldn't be automatically categorized."

Each unclassified transaction shows 3 buttons inline:
- 🎁 Gift (→ non_taxable, income_type: gift)
- 💰 Loan (→ non_taxable, income_type: loan)
- 💼 Pay for work (→ taxable, income_type: salary)

---

## Nigerian Tax Act Reference (PITA)
- **Taxable**: Employment income, business income, commissions, bonuses, rental income, investment income
- **Non-taxable**: Gifts (genuinely gratuitous), loans received, refunds, reversals, dividends (WHT already deducted), pension lump sums, gratuities, insurance proceeds
- **Tax brackets**: 0% (≤₦800k), 15% (800k-3M), 18% (3M-12M), 21% (12M-25M), 23% (25M-50M), 25% (50M+)
