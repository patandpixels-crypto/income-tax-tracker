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

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initializeDatabase();

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
        rawSMS: t.raw_sms
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
    const { date, amount, description, bank, rawSMS } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ error: 'Date and amount required' });
    }

    const result = await pool.query(
      'INSERT INTO transactions (user_id, date, amount, description, bank, raw_sms) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, date, amount, description, bank, rawSMS]
    );

    res.status(201).json({
      success: true,
      transaction: {
        id: result.rows[0].id,
        date: result.rows[0].date,
        amount: result.rows[0].amount,
        description: result.rows[0].description,
        bank: result.rows[0].bank,
        rawSMS: result.rows[0].raw_sms
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
        .map(t => ({
          date: t.date || new Date().toISOString().split('T')[0],
          amount: parseFloat(t.amount) || 0,
          description: String(t.description || '').substring(0, 200),
          bank: String(t.bank || ''),
        }));
    } catch {
      transactions = [];
    }

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('PDF extract error:', error?.message || error);
    res.status(500).json({ error: 'Failed to process PDF', detail: error?.message || String(error) });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});