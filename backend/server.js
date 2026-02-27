import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google OAuth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        google_id TEXT UNIQUE,
        bank_alert_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        bank TEXT,
        raw_sms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_statements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT,
        period_start TEXT,
        period_end TEXT,
        transaction_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add tax classification columns to existing transactions
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_category TEXT DEFAULT 'unclassified'`);
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS income_type TEXT DEFAULT 'other'`);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initializeDatabase();

// Nigerian Tax Act (PITA) - Auto-classify transaction as taxable/non-taxable
function classifyTransaction(description) {
  if (!description || description.trim().length < 3) {
    return { tax_category: 'unclassified', income_type: 'other' };
  }

  const desc = description.toLowerCase().trim();

  // Non-taxable patterns (gifts, loans, refunds, dividends, pension, gratuity)
  const nonTaxablePatterns = [
    { pattern: /\b(gift|birthday|xmas|christmas|wedding|congrat|donation|charity|eid|sallah)\b/, type: 'gift' },
    { pattern: /\b(loan|borrow|lending|repayment|payback)\b/, type: 'loan' },
    { pattern: /\b(refund|reversal|chargeback|returned|cashback)\b/, type: 'refund' },
    { pattern: /\b(dividend|div\b|share\s*profit)\b/, type: 'dividend' },
    { pattern: /\b(pension|gratuity|retirement|severance)\b/, type: 'pension' },
    { pattern: /\b(insurance|claim|indemnity)\b/, type: 'insurance' },
  ];

  for (const { pattern, type } of nonTaxablePatterns) {
    if (pattern.test(desc)) {
      return { tax_category: 'non_taxable', income_type: type };
    }
  }

  // Taxable patterns (salary, business, commission, rent, freelance)
  const taxablePatterns = [
    { pattern: /\b(salary|sal\b|wage|monthly\s*pay|payroll|basic\s*pay)\b/, type: 'salary' },
    { pattern: /\b(bonus|incentive|allowance|overtime|ot\s*pay)\b/, type: 'salary' },
    { pattern: /\b(commission|comm\b)\b/, type: 'commission' },
    { pattern: /\b(freelance|consulting|consult|contract\s*pay|professional\s*fee|service\s*fee)\b/, type: 'business' },
    { pattern: /\b(rent|rental|lease|tenant)\b/, type: 'rental' },
    { pattern: /\b(invoice|inv\b|payment\s*for|service\s*charge|fee\s*for)\b/, type: 'business' },
    { pattern: /\b(business|revenue|sales|profit|earning|income)\b/, type: 'business' },
    { pattern: /\b(interest\s*(earned|income|payment|credited))\b/, type: 'interest' },
  ];

  for (const { pattern, type } of taxablePatterns) {
    if (pattern.test(desc)) {
      return { tax_category: 'taxable', income_type: type };
    }
  }

  // If description is too short or just a name with no context → unclassified
  const words = desc.split(/\s+/).filter(w => w.length > 1);
  if (words.length <= 2) {
    return { tax_category: 'unclassified', income_type: 'other' };
  }

  // Generic transfer with a narration but no clear category → unclassified
  return { tax_category: 'unclassified', income_type: 'other' };
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name required' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be 6+ characters' });
    }

    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, name]
    );

    const token = jwt.sign(
      { userId: result.rows[0].id, email, name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.rows[0].id, email, name }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bankAlertName: user.bank_alert_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth Login/Register
app.post('/api/auth/google', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: accessToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(
        'INSERT INTO users (email, name, google_id, password) VALUES ($1, $2, $3, NULL) RETURNING *',
        [email, name, googleId]
      );
      user = result.rows[0];
    } else {
      user = result.rows[0];
      // Link Google account if not already linked
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bankAlertName: user.bank_alert_name
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, bank_alert_name FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      bankAlertName: user.bank_alert_name
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update bank name
app.put('/api/auth/bank-name', authenticateToken, async (req, res) => {
  try {
    const { bankAlertName } = req.body;
    await pool.query(
      'UPDATE users SET bank_alert_name = $1 WHERE id = $2',
      [bankAlertName, req.user.userId]
    );

    const result = await pool.query(
      'SELECT id, email, name, bank_alert_name FROM users WHERE id = $1',
      [req.user.userId]
    );

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        bankAlertName: result.rows[0].bank_alert_name
      }
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Request account deletion
app.post('/api/auth/delete-account-request', async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Log the deletion request
    console.log(`Account deletion requested for: ${email}`);
    console.log(`Reason: ${reason || 'Not provided'}`);

    // TODO: Store deletion requests in a table or send email notification
    // For now, just log it

    res.json({
      success: true,
      message: 'Account deletion request received. We will process it within 30 days.'
    });
  } catch (error) {
    console.error('Delete account request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [req.user.userId]
    );

    res.json({
      success: true,
      transactions: result.rows.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        bank: t.bank,
        rawSMS: t.raw_sms,
        taxCategory: t.tax_category || 'unclassified',
        incomeType: t.income_type || 'other'
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { date, amount, description, bank, rawSMS, taxCategory, incomeType } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ error: 'Date and amount required' });
    }

    // Auto-classify if not provided, or use explicit values
    const classification = (taxCategory && taxCategory !== 'unclassified')
      ? { tax_category: taxCategory, income_type: incomeType || 'other' }
      : classifyTransaction(description);

    const result = await pool.query(
      'INSERT INTO transactions (user_id, date, amount, description, bank, raw_sms, tax_category, income_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.userId, date, amount, description, bank, rawSMS, classification.tax_category, classification.income_type]
    );

    const t = result.rows[0];
    res.status(201).json({
      success: true,
      transaction: {
        id: t.id,
        date: t.date,
        amount: t.amount,
        description: t.description,
        bank: t.bank,
        rawSMS: t.raw_sms,
        taxCategory: t.tax_category,
        incomeType: t.income_type
      }
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Classify/reclassify a transaction (user manual action)
app.put('/api/transactions/:id/classify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { taxCategory, incomeType } = req.body;

    if (!taxCategory || !['taxable', 'non_taxable'].includes(taxCategory)) {
      return res.status(400).json({ error: 'taxCategory must be "taxable" or "non_taxable"' });
    }

    const result = await pool.query(
      'UPDATE transactions SET tax_category = $1, income_type = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [taxCategory, incomeType || 'other', id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const t = result.rows[0];
    res.json({
      success: true,
      transaction: {
        id: t.id, date: t.date, amount: t.amount, description: t.description,
        bank: t.bank, rawSMS: t.raw_sms, taxCategory: t.tax_category, incomeType: t.income_type
      }
    });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: 'Failed to classify transaction' });
  }
});

// Extract text from image
app.post('/api/extract-text', authenticateToken, async (req, res) => {
  try {
    const { imageData, mediaType } = req.body;

    if (!imageData || !mediaType) {
      return res.status(400).json({ error: 'Image data required' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageData }
        }, {
          type: 'text',
          text: 'Extract ALL text from this bank SMS screenshot. Return ONLY the raw text.'
        }]
      }]
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    res.json({ success: true, text });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

// Extract transactions from PDF bank statement
app.post('/api/extract-pdf', authenticateToken, async (req, res) => {
  try {
    const { pdfData } = req.body;

    if (!pdfData) {
      return res.status(400).json({ error: 'PDF data required' });
    }

    // Convert base64 to buffer and extract text with pdf-parse
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    let pdfText = '';
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const parsed = await parser.getText();
      pdfText = parsed.text;
    } catch (parseErr) {
      console.error('PDF parse error:', parseErr?.message);
      return res.status(400).json({ error: 'Could not read PDF file. Make sure it is a valid, non-password-protected PDF.' });
    }

    if (!pdfText || pdfText.trim().length < 20) {
      return res.status(400).json({ error: 'PDF appears to be empty or image-only. Please upload a text-based bank statement PDF.' });
    }

    // Send extracted text to Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Analyze this bank statement text and extract ALL income/credit transactions.

Return ONLY a valid JSON array. Each object must have:
- date: string (YYYY-MM-DD format)
- amount: number (numeric value only, no currency symbols or commas)
- description: string (narration or description of the transaction)
- bank: string (bank name if visible, otherwise empty string)
- type: string (must be "credit")

Only include CREDIT/INCOME transactions (money received). Skip all debits, withdrawals, charges, and fees.
If no income transactions found, return [].
Return ONLY the JSON array, no explanation.

BANK STATEMENT TEXT:
${pdfText.substring(0, 15000)}`
      }]
    });

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Extract JSON array from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.json({ success: true, transactions: [] });
    }

    let transactions = [];
    try {
      transactions = JSON.parse(jsonMatch[0]);
      transactions = transactions
        .filter(t => t.amount > 0 && t.type === 'credit')
        .map(t => {
          const desc = String(t.description || '').substring(0, 200);
          const classification = classifyTransaction(desc);
          return {
            date: t.date || new Date().toISOString().split('T')[0],
            amount: parseFloat(t.amount) || 0,
            description: desc,
            bank: String(t.bank || ''),
            taxCategory: classification.tax_category,
            incomeType: classification.income_type,
          };
        });
    } catch {
      transactions = [];
    }

    // Detect statement date range
    const dates = transactions.map(t => t.date).filter(Boolean).sort();
    const periodStart = dates[0] || null;
    const periodEnd = dates[dates.length - 1] || null;

    // Check for duplicate transactions already in DB
    const existingRows = await pool.query(
      'SELECT date, amount, description FROM transactions WHERE user_id = $1',
      [req.user.id]
    );
    const existingSet = new Set(
      existingRows.rows.map(t =>
        `${t.date}|${parseFloat(t.amount).toFixed(2)}|${(t.description || '').toLowerCase().trim()}`
      )
    );
    const transactionsWithFlags = transactions.map(t => ({
      ...t,
      isDuplicate: existingSet.has(
        `${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().trim()}`
      ),
    }));

    // Check for overlapping previously uploaded statements
    const overlapping = periodStart && periodEnd
      ? await pool.query(
          `SELECT filename, period_start, period_end, uploaded_at
           FROM bank_statements
           WHERE user_id = $1 AND period_start <= $2 AND period_end >= $3
           ORDER BY uploaded_at DESC`,
          [req.user.id, periodEnd, periodStart]
        )
      : { rows: [] };

    res.json({
      success: true,
      transactions: transactionsWithFlags,
      statementPeriod: { start: periodStart, end: periodEnd },
      overlappingStatements: overlapping.rows,
    });
  } catch (error) {
    console.error('PDF extract error:', error?.message || error);
    res.status(500).json({ error: 'Failed to process PDF', detail: error?.message || String(error) });
  }
});

// Save a bank statement record after user confirms transactions
app.post('/api/bank-statements', authenticateToken, async (req, res) => {
  try {
    const { filename, periodStart, periodEnd, transactionCount } = req.body;
    const result = await pool.query(
      `INSERT INTO bank_statements (user_id, filename, period_start, period_end, transaction_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, filename || 'bank-statement.pdf', periodStart, periodEnd, transactionCount || 0]
    );
    res.json({ success: true, statement: result.rows[0] });
  } catch (error) {
    console.error('Save statement error:', error?.message);
    res.status(500).json({ error: 'Failed to save statement record' });
  }
});

// List all uploaded bank statements for the user
app.get('/api/bank-statements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, period_start, period_end, transaction_count, uploaded_at
       FROM bank_statements WHERE user_id = $1 ORDER BY uploaded_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, statements: result.rows });
  } catch (error) {
    console.error('List statements error:', error?.message);
    res.status(500).json({ error: 'Failed to load statement history' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});