import React, { useEffect, useState } from "react";
import logo from "./assets/logo.png";
import { Plus, Trash2, Download, Image, Upload, LogOut, User, FileText, Briefcase, Gift, DollarSign } from "lucide-react";

const API_URL = "https://income-tax-tracker.onrender.com/api";

function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Nigerian Tax Brackets - Progressive Taxation
const TAX_BRACKETS = [
  { limit: 800000, rate: 0 },
  { limit: 3000000, rate: 0.15 },
  { limit: 12000000, rate: 0.18 },
  { limit: 25000000, rate: 0.21 },
  { limit: 50000000, rate: 0.23 },
  { limit: Infinity, rate: 0.25 },
];

function calculateTax(income) {
  if (income <= 0) return 0;

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.limit) {
      tax += Math.max(0, income - previousLimit) * bracket.rate;
      break;
    } else {
      tax += (bracket.limit - previousLimit) * bracket.rate;
      previousLimit = bracket.limit;
    }
  }
  return tax;
}

// Filter function to identify expense/debit transactions
// Returns true if transaction is INCOME, false if it's expense/debit
function isIncomeTransaction(description) {
  if (!description) return true; // Keep transactions without description

  const lowerDesc = description.toLowerCase();

  // First check for explicit income/credit indicators
  const incomeKeywords = [
    'credit',
    'credited',
    'received',
    'deposit',
    'payment received',
    'transfer to you',
    'salary',
    'income',
  ];

  // If any income keyword is found, likely income unless contradicted
  const hasIncomeKeyword = incomeKeywords.some(keyword => lowerDesc.includes(keyword));

  // Keywords that indicate expense/debit transactions
  const expenseKeywords = [
    'withdrawal',
    'withdraw',
    'debited',
    'debit',
    'dr ',
    ' dr',
    'dr.',
    'transfer from your',
    'transfer from you',
    'payment to',
    'paid to',
    'sent to',
    'deducted',
    'charged',
    'purchase',
    'bill payment',
    'airtime',
    'data bundle',
    'pos',
    'atm',
    'web payment',
    'online payment',
    'subscription',
  ];

  // Check if description contains any expense keywords
  const hasExpenseKeyword = expenseKeywords.some(keyword => lowerDesc.includes(keyword));

  // If both are present, expense keywords take precedence (safer to filter out)
  if (hasExpenseKeyword) {
    return false; // This is an expense transaction
  }

  return true; // This is an income transaction (or unknown, which we keep)
}

// Parse bank alert SMS to extract transaction details
function parseBankAlert(text, userName = null) {
  if (!text) return null;

  // Clean the text
  const cleanedText = cleanForDetection(text);

  // Check if it's a debit transaction
  const isDebit = isDebitTransaction(cleanedText, userName);

  // Extract amount
  const amount = extractAmount(cleanedText);
  if (!amount || amount <= 0) return null;

  // Extract bank name
  const bank = extractBankName(cleanedText);

  // Extract description
  const description = extractDescription(cleanedText, bank);
  const finalDescription = description || (isDebit ? 'Bank debit' : 'Bank credit');

  // Auto-classify for tax purposes
  const classification = classifyForTax(finalDescription);

  return {
    amount,
    type: isDebit ? 'expense' : 'income',
    description: finalDescription,
    bank: bank || 'Unknown Bank',
    date: new Date().toISOString().split('T')[0], // Today's date
    taxCategory: classification.taxCategory,
    incomeType: classification.incomeType,
  };
}

function cleanForDetection(text) {
  if (!text) return '';

  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Remove common receipt footers that contain misleading words
  const junkLineRegex =
    /(enjoy a better life|get free transfers|withdrawals|bill payments|instant loans|annual interest|licensed by|central bank|insured by|ndic)/i;

  const cleaned = lines.filter((l) => !junkLineRegex.test(l));
  return cleaned.join('\n');
}

function isDebitTransaction(text, userName = null) {
  const lowerText = text.toLowerCase();

  // If user has saved their bank alert name, check if they are the sender
  if (userName) {
    const namePattern = new RegExp(escapeRegExp(userName), 'i');

    // Check if user's name appears in Sender Details section
    const senderMatch = text.match(/sender\s+details[\s\S]{0,200}/i);
    if (senderMatch && namePattern.test(senderMatch[0])) {
      console.log('DETECTED AS DEBIT: User is the sender');
      return true; // User is sending money = debit
    }

    // Check if user's name appears in Recipient Details section
    const recipientMatch = text.match(/recipient\s+details[\s\S]{0,200}/i);
    if (recipientMatch && namePattern.test(recipientMatch[0])) {
      console.log('DETECTED AS CREDIT: User is the recipient');
      return false; // User is receiving money = credit
    }
  }

  // Fallback: Check for OPay/Transfer receipts pattern
  const senderIndex = lowerText.indexOf('sender details');
  const recipientIndex = lowerText.indexOf('recipient details');

  if (senderIndex !== -1 && recipientIndex !== -1) {
    // Extract recipient name for business detection
    const recipientMatch = text.match(/recipient\s+details[\s\S]{0,100}?([A-Z][A-Z\s]{5,})/i);

    if (recipientMatch) {
      const recipientName = recipientMatch[1].trim();
      console.log('Recipient name extracted:', recipientName);

      // Check if recipient has business keywords or all-caps business name patterns
      const businessPatterns = /\b(ltd|limited|intl|international|partnership|company|enterprise|ventures|group|inc|corporation|church|ministry|foundation|ngo|association)\b/i;

      // Check if it's an all-caps business name (usually 4+ words all caps)
      const isAllCapsBusinessName = /^[A-Z\s]{10,}$/.test(recipientName) && recipientName.split(/\s+/).length >= 3;

      if (businessPatterns.test(recipientName) || isAllCapsBusinessName) {
        console.log('DETECTED AS DEBIT: Sending to business/organization');
        return true; // Sending to a business = debit
      }
    }
  }

  // Critical keywords for debit
  const criticalKeywords = ['debit', 'dr'];
  for (const keyword of criticalKeywords) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) return true;
  }

  // Other debit keywords
  const debitKeywords = [
    'debited',
    'withdrawal',
    'withdraw',
    'transferred',
    'transfer from your',
    'payment to',
    'paid to',
    'sent to',
    'deducted',
    'charged',
  ];

  for (const keyword of debitKeywords) {
    if (lowerText.includes(keyword)) return true;
  }

  return false;
}

function extractAmount(text) {
  // Common patterns for amounts in Nigerian bank alerts
  const patterns = [
    /(?:NGN|N|₦)\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:amount|amt|sum)[\s:]*(?:NGN|N|₦)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:debited|credited|received|sent|paid)[\s:]*(?:NGN|N|₦)?\s*([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:NGN|naira)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

function extractBankName(text) {
  const bankPatterns = {
    'GTBank': /gt\s*bank|guaranty trust|gtb/i,
    'Access Bank': /access\s*bank/i,
    'First Bank': /first\s*bank|fbn/i,
    'UBA': /uba|united bank for africa/i,
    'Zenith Bank': /zenith\s*bank/i,
    'Ecobank': /ecobank/i,
    'Stanbic IBTC': /stanbic|ibtc/i,
    'Fidelity Bank': /fidelity\s*bank/i,
    'Union Bank': /union\s*bank/i,
    'Sterling Bank': /sterling\s*bank/i,
    'Polaris Bank': /polaris\s*bank/i,
    'Wema Bank': /wema\s*bank/i,
    'Keystone Bank': /keystone\s*bank/i,
    'FCMB': /fcmb|first city monument/i,
    'Opay': /opay|owealth/i,
    'Kuda': /kuda\s*bank|kuda/i,
    'PalmPay': /palmpay/i,
    'Moniepoint': /moniepoint/i,
  };

  for (const [bankName, pattern] of Object.entries(bankPatterns)) {
    if (pattern.test(text)) {
      return bankName;
    }
  }

  return null;
}

function extractDescription(text, bank) {
  // Try to extract meaningful description
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Look for description patterns
  const descPatterns = [
    /(?:desc|description|narration|details)[\s:]+(.+)/i,
    /(?:to|from)[\s:]+(.+?)(?:acct|account|on|$)/i,
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no specific description found, use first meaningful line
  if (lines.length > 0) {
    return lines[0].substring(0, 100); // Limit to 100 chars
  }

  return null;
}

function classifyForTax(description) {
  if (!description || description.trim().length < 3) {
    return { taxCategory: 'unclassified', incomeType: 'other' };
  }
  const desc = description.toLowerCase().trim();

  // Non-taxable patterns (Nigerian PITA)
  const nonTaxablePatterns = [
    { pattern: /\b(gift|birthday|xmas|christmas|wedding|congrat|donation|charity)\b/, type: 'gift' },
    { pattern: /\b(loan|borrow|lending|repayment|payback)\b/, type: 'loan' },
    { pattern: /\b(refund|reversal|chargeback|returned|cashback)\b/, type: 'refund' },
    { pattern: /\b(dividend|div\b|share\s*profit)\b/, type: 'dividend' },
    { pattern: /\b(pension|gratuity|retirement|severance)\b/, type: 'pension' },
    { pattern: /\b(insurance|claim|indemnity)\b/, type: 'insurance' },
  ];

  for (const { pattern, type } of nonTaxablePatterns) {
    if (pattern.test(desc)) {
      return { taxCategory: 'non_taxable', incomeType: type };
    }
  }

  // Taxable patterns
  const taxablePatterns = [
    { pattern: /\b(salary|sal\b|wage|monthly\s*pay|payroll)\b/, type: 'salary' },
    { pattern: /\b(bonus|incentive|allowance|overtime)\b/, type: 'salary' },
    { pattern: /\b(commission|comm\b)\b/, type: 'commission' },
    { pattern: /\b(freelance|consulting|contract\s*pay|professional\s*fee)\b/, type: 'business' },
    { pattern: /\b(rent|rental|lease|tenant)\b/, type: 'rental' },
    { pattern: /\b(invoice|payment\s*for|service\s*charge)\b/, type: 'business' },
    { pattern: /\b(business|revenue|sales|profit|earning|income)\b/, type: 'business' },
  ];

  for (const { pattern, type } of taxablePatterns) {
    if (pattern.test(desc)) {
      return { taxCategory: 'taxable', incomeType: type };
    }
  }

  return { taxCategory: 'unclassified', incomeType: 'other' };
}

export default function SMSIncomeTracker() {
  const [smsText, setSmsText] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDebitPopup, setShowDebitPopup] = useState(false);

  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState("");

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [pdfTransactions, setPdfTransactions] = useState([]);
  const [selectedPdfTxns, setSelectedPdfTxns] = useState({});
  const [pdfStatementPeriod, setPdfStatementPeriod] = useState(null);
  const [pdfOverlappingStatements, setPdfOverlappingStatements] = useState([]);
  const [pdfFilename, setPdfFilename] = useState("");

  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && authToken) loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authToken]);

  async function checkAuthentication() {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
        setUserName(data.bankAlertName || "");
        setAuthToken(token);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("authToken");
      }
    } catch (err) {
      console.error("Auth check error:", err);
      localStorage.removeItem("authToken");
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!registerEmail || !registerPassword || !registerName) {
      setError("Please fill in all fields");
      return;
    }
    if (registerPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Please login.");
      setShowLogin(true);
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterName("");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginEmail || !loginPassword) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("authToken", data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setUserName(data.user.bankAlertName || "");
      setIsAuthenticated(true);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setTransactions([]);
    setUserName("");
  }

  async function loadTransactions() {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to show only income transactions (exclude expenses/debits)
        const allTransactions = data.transactions || [];
        const incomeTransactions = allTransactions.filter(txn =>
          isIncomeTransaction(txn.description)
        );
        setTransactions(incomeTransactions);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddSMS() {
    if (!smsText.trim() || !authToken) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Parse the SMS text first
      const parsedTransaction = parseBankAlert(smsText, userName);

      if (!parsedTransaction) {
        setError("Could not parse transaction from SMS. Please check the format.");
        setIsLoading(false);
        return;
      }

      // Check if it's a debit/expense transaction
      if (parsedTransaction.type === 'expense') {
        setShowDebitPopup(true);
        setIsLoading(false);
        return;
      }

      // Send parsed transaction data to backend
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          date: parsedTransaction.date,
          amount: parsedTransaction.amount,
          description: parsedTransaction.description,
          bank: parsedTransaction.bank,
          rawSMS: smsText,
          taxCategory: parsedTransaction.taxCategory,
          incomeType: parsedTransaction.incomeType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to add transaction");
        return;
      }

      setSuccess(`Transaction added successfully! Amount: ${formatNGN(parsedTransaction.amount)}`);
      setSmsText("");
      loadTransactions();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    setIsProcessingImage(true);
    setError("");
    setSuccess("");
    setSelectedImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);
    if (userName) formData.append("userName", userName);

    try {
      const response = await fetch(`${API_URL}/transactions/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.includes("debit")) {
          setShowDebitPopup(true);
        } else {
          setError(data.error || "Failed to process image");
        }
        return;
      }

      setSuccess(`Transaction added from image! Amount: ${formatNGN(data.amount)}`);
      loadTransactions();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessingImage(false);
      setSelectedImage(null);
      e.target.value = "";
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    setIsPdfProcessing(true);
    setError("");
    setPdfTransactions([]);
    setPdfOverlappingStatements([]);
    setPdfStatementPeriod(null);
    setSelectedPdfTxns({});
    setPdfFilename(file.name);

    try {
      // Convert PDF file to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const pdfData = await base64Promise;

      const response = await fetch(`${API_URL}/extract-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ pdfData }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to process PDF");
        return;
      }

      setPdfTransactions(data.transactions || []);
      setPdfStatementPeriod(data.statementPeriod || null);
      setPdfOverlappingStatements(data.overlappingStatements || []);

      const initialSelection = {};
      (data.transactions || []).forEach((txn, i) => {
        initialSelection[i] = !txn.isDuplicate;
      });
      setSelectedPdfTxns(initialSelection);
      setShowPdfModal(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsPdfProcessing(false);
      e.target.value = "";
    }
  }

  async function handleSavePdfTransactions() {
    if (!authToken) return;

    const selected = pdfTransactions.filter((_, i) => selectedPdfTxns[i]);
    if (selected.length === 0) {
      setError("Please select at least one transaction");
      return;
    }

    setIsPdfProcessing(true);
    try {
      const response = await fetch(`${API_URL}/transactions/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          transactions: selected,
          statementPeriod: pdfStatementPeriod,
          filename: pdfFilename,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to save transactions");
        return;
      }

      setSuccess(`${data.count} transaction${data.count !== 1 ? "s" : ""} added successfully!`);
      setShowPdfModal(false);
      loadTransactions();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsPdfProcessing(false);
    }
  }

  async function handleDeleteTransaction(id) {
    if (!authToken || !confirm("Delete this transaction?")) return;

    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        setSuccess("Transaction deleted");
        loadTransactions();
      } else {
        setError("Failed to delete transaction");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  async function handleClassify(id, taxStatus, category) {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/transactions/${id}/classify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ taxStatus, category }),
      });

      if (response.ok) {
        setSuccess("Transaction classified!");
        setShowClassifyModal(false);
        setSelectedTransaction(null);
        loadTransactions();
      } else {
        setError("Failed to classify transaction");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  async function handleDownloadCSV() {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/transactions/export`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `income-tax-tracker-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError("Failed to download CSV");
    }
  }

  async function handleSaveName() {
    if (!authToken || !tempName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/auth/bank-name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ bankAlertName: tempName.trim() }),
      });

      if (response.ok) {
        setUserName(tempName.trim());
        setShowNameInput(false);
        setSuccess("Name saved!");
      } else {
        setError("Failed to save name");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }

  function formatNGN(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  }

  function calculateStats() {
    // Ensure transactions is an array to prevent crashes
    const txns = Array.isArray(transactions) ? transactions : [];

    const taxable = txns.filter((t) => t.tax_status === "taxable");
    const nonTaxable = txns.filter((t) => t.tax_status === "non_taxable");
    const unclassified = txns.filter((t) => !t.tax_status || t.tax_status === "unclassified");

    const taxableTotal = taxable.reduce((sum, t) => sum + t.amount, 0);
    const nonTaxableTotal = nonTaxable.reduce((sum, t) => sum + t.amount, 0);
    const unclassifiedTotal = unclassified.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = txns.reduce((sum, t) => sum + t.amount, 0);
    const taxLiability = calculateTax(taxableTotal);

    return {
      taxableTotal,
      nonTaxableTotal,
      unclassifiedTotal,
      totalIncome,
      taxLiability,
      taxableCount: taxable.length,
      nonTaxableCount: nonTaxable.length,
      unclassifiedCount: unclassified.length,
      totalCount: txns.length,
    };
  }

  const stats = calculateStats();

  // LOADING STATE - Checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // LOGIN/REGISTER SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-purple p-3 shadow-dark-lg">
              <img src={logo} alt="Logo" className="h-full w-full object-contain brightness-0 invert" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Income Tax Tracker</h1>
            <p className="text-gray-400">Smart Income & Tax Tracking</p>
          </div>

          {/* Auth Card */}
          <div className="glass-card p-6 shadow-dark-lg">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-dark-600/50 p-1 rounded-xl">
              <button
                onClick={() => {
                  setShowLogin(true);
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                  showLogin ? "bg-gradient-purple text-white shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all ${
                  !showLogin ? "bg-gradient-purple text-white shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">
                {success}
              </div>
            )}

            {/* Login Form */}
            {showLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="input-dark w-full"
                    required
                  />
                </div>
                <button type="submit" className="gradient-button w-full py-3 mt-2">
                  Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    id="register-name"
                    name="name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="name"
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    id="register-email"
                    name="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="input-dark w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    id="register-password"
                    name="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input-dark w-full"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    id="register-confirm-password"
                    name="confirm-password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="input-dark w-full"
                    required
                  />
                </div>
                <button type="submit" className="gradient-button w-full py-3 mt-2">
                  Create Account
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">🔒 Your data is encrypted and secure</p>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8">
      {/* Debit Popup */}
      {showDebitPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 max-w-md w-full shadow-dark-lg border-red-500/30">
            <h2 className="text-2xl font-bold text-center text-red-400 mb-3">⛔ DEBIT DETECTED</h2>
            <p className="text-center text-gray-300 mb-2">
              This is a <span className="font-bold text-red-400">debit/withdrawal</span> alert.
            </p>
            <p className="text-center text-gray-400 mb-6 text-sm">
              Only <span className="font-semibold text-green-400">income (credit)</span> transactions allowed.
            </p>
            <button
              onClick={() => setShowDebitPopup(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Classification Modal */}
      {showClassifyModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg shadow-dark-lg">
            {/* Header */}
            <div className="p-6 bg-gradient-purple rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🏷️</span>
                <span>Classify Transaction</span>
              </h2>
              <p className="text-white/90 text-sm mt-2">
                Select how this income should be classified for tax purposes
              </p>
            </div>

            {/* Transaction Details */}
            <div className="p-6 bg-dark-600/30">
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">Transaction Details</p>
                <p className="font-semibold text-white mb-2">
                  {selectedTransaction.description || "No description"}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">📅 {selectedTransaction.date}</span>
                  <span className="font-bold text-green-400 text-lg">
                    {formatNGN(selectedTransaction.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Classification Options */}
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-300 mb-4">Select transaction type:</p>
              <div className="space-y-3">
                {/* Work/Salary */}
                <button
                  onClick={() => handleClassify(selectedTransaction.id, "taxable", "salary")}
                  className="w-full p-4 rounded-xl border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="icon-badge bg-green-500/20">
                      <Briefcase className="text-green-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-400">Pay for Work</p>
                      <p className="text-xs text-gray-400">Salary, freelance income, or business revenue</p>
                    </div>
                    <span className="category-badge bg-green-500/20 text-green-400">TAXABLE</span>
                  </div>
                </button>

                {/* Gift */}
                <button
                  onClick={() => handleClassify(selectedTransaction.id, "non_taxable", "gift")}
                  className="w-full p-4 rounded-xl border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="icon-badge bg-purple-500/20">
                      <Gift className="text-purple-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-purple-400">Gift</p>
                      <p className="text-xs text-gray-400">Money received as a gift from family or friends</p>
                    </div>
                    <span className="category-badge bg-blue-500/20 text-blue-400">EXEMPT</span>
                  </div>
                </button>

                {/* Loan */}
                <button
                  onClick={() => handleClassify(selectedTransaction.id, "non_taxable", "loan")}
                  className="w-full p-4 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="icon-badge bg-orange-500/20">
                      <DollarSign className="text-orange-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-orange-400">Loan</p>
                      <p className="text-xs text-gray-400">Borrowed money that needs to be repaid</p>
                    </div>
                    <span className="category-badge bg-orange-500/20 text-orange-400">REPAYABLE</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button
                onClick={() => {
                  setShowClassifyModal(false);
                  setSelectedTransaction(null);
                }}
                className="w-full bg-dark-600 hover:bg-dark-500 text-gray-300 py-3 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-dark-lg">
            {/* Header */}
            <div className="p-6 border-b border-dark-600">
              <h2 className="text-2xl font-bold text-white">📄 Bank Statement Transactions</h2>
              <p className="text-gray-400 text-sm mt-1">
                We found{" "}
                <span className="font-semibold text-purple-400">
                  {pdfTransactions.length} income transaction{pdfTransactions.length !== 1 ? "s" : ""}
                </span>{" "}
                in your statement. Select the ones you want to add.
              </p>
              {pdfStatementPeriod?.start && (
                <p className="text-xs text-gray-500 mt-1">
                  📅 Statement period:{" "}
                  <span className="font-semibold text-gray-400">{pdfStatementPeriod.start}</span> →{" "}
                  <span className="font-semibold text-gray-400">{pdfStatementPeriod.end}</span>
                </p>
              )}
              {pdfOverlappingStatements.length > 0 && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-400">
                  ⚠️ <span className="font-semibold">Overlapping statement detected.</span> You previously uploaded:
                  <ul className="mt-1 space-y-0.5">
                    {pdfOverlappingStatements.map((s, i) => (
                      <li key={i} className="ml-2">
                        • <span className="font-medium">{s.filename}</span> ({s.period_start} → {s.period_end},{" "}
                        {s.transaction_count} txns, {new Date(s.uploaded_at).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pdfTransactions.some((t) => t.isDuplicate) && (
                <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-400">
                  🔁{" "}
                  <span className="font-semibold">
                    {pdfTransactions.filter((t) => t.isDuplicate).length} transaction
                    {pdfTransactions.filter((t) => t.isDuplicate).length !== 1 ? "s" : ""} already exist
                  </span>{" "}
                  and have been deselected.
                </div>
              )}
            </div>

            {/* Select all */}
            <div className="px-6 py-3 bg-dark-600/30 border-b border-dark-600 flex items-center gap-3">
              <input
                type="checkbox"
                id="select-all-pdf"
                className="w-4 h-4 accent-purple-500 cursor-pointer"
                checked={pdfTransactions.length > 0 && pdfTransactions.every((_, i) => selectedPdfTxns[i])}
                onChange={(e) => {
                  const next = {};
                  pdfTransactions.forEach((_, i) => {
                    next[i] = e.target.checked;
                  });
                  setSelectedPdfTxns(next);
                }}
              />
              <label htmlFor="select-all-pdf" className="text-sm font-semibold text-gray-300 cursor-pointer">
                Select all ({Object.values(selectedPdfTxns).filter(Boolean).length} of {pdfTransactions.length}{" "}
                selected)
              </label>
            </div>

            {/* Transaction list */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {pdfTransactions.map((txn, i) => (
                <label
                  key={i}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    txn.isDuplicate
                      ? "border-orange-500/20 bg-orange-500/5 opacity-60"
                      : selectedPdfTxns[i]
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-dark-600 bg-dark-700/30 hover:border-dark-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`pdf-txn-${i}`}
                    name={`pdf-txn-${i}`}
                    checked={!!selectedPdfTxns[i]}
                    onChange={(e) => setSelectedPdfTxns({ ...selectedPdfTxns, [i]: e.target.checked })}
                    className="w-5 h-5 accent-purple-500 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium mb-1 truncate">
                      {txn.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">📅 {txn.date}</span>
                      <span className="font-bold text-green-400">{formatNGN(txn.amount)}</span>
                    </div>
                    {txn.isDuplicate && <p className="text-xs text-orange-400 mt-1">🔁 Already exists</p>}
                  </div>
                </label>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-dark-600 flex gap-3">
              <button
                onClick={() => setShowPdfModal(false)}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 py-3 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePdfTransactions}
                disabled={isPdfProcessing || Object.values(selectedPdfTxns).filter(Boolean).length === 0}
                className="flex-1 gradient-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPdfProcessing
                  ? "Saving..."
                  : `Add ${Object.values(selectedPdfTxns).filter(Boolean).length} Transaction${
                      Object.values(selectedPdfTxns).filter(Boolean).length !== 1 ? "s" : ""
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-purple p-2 shadow-dark">
              <img src={logo} alt="Logo" className="h-full w-full object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Income Tax Tracker</h1>
              <p className="text-sm text-gray-400">Smart Income & Tax Tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Name */}
            {showNameInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="user-name"
                  name="name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Your name"
                  className="input-dark py-2 px-3 text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowNameInput(true);
                  setTempName(userName);
                }}
                className="glass-card px-4 py-2 flex items-center gap-2 hover:border-primary-500 transition-all"
              >
                <User size={16} className="text-gray-400" />
                <span className="text-white text-sm">{userName || currentUser?.name || "Set Name"}</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="glass-card px-4 py-2 flex items-center gap-2 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={16} className="text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="glass-card p-6 shadow-dark">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Total Income</h3>
              <div className="icon-badge bg-blue-500/20">
                <DollarSign className="text-blue-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatNGN(stats.totalIncome)}</p>
            <p className="text-sm text-gray-400">{stats.totalCount} transactions</p>
          </div>

          {/* Taxable Income */}
          <div className="glass-card p-6 shadow-dark">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Taxable Income</h3>
              <div className="icon-badge bg-green-500/20">
                <Briefcase className="text-green-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-1">{formatNGN(stats.taxableTotal)}</p>
            <p className="text-sm text-gray-400">{stats.taxableCount} transactions</p>
          </div>

          {/* Non-Taxable */}
          <div className="glass-card p-6 shadow-dark">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Non-Taxable</h3>
              <div className="icon-badge bg-purple-500/20">
                <Gift className="text-purple-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-1">{formatNGN(stats.nonTaxableTotal)}</p>
            <p className="text-sm text-gray-400">{stats.nonTaxableCount} transactions</p>
          </div>

          {/* Tax Liability */}
          <div className="glass-card p-6 shadow-dark">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide">Tax Liability</h3>
              <div className="icon-badge bg-red-500/20">
                <FileText className="text-red-400" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-400 mb-1">{formatNGN(stats.taxLiability)}</p>
            <p className="text-sm text-gray-400">Tax to pay</p>
          </div>
        </div>

        {stats.unclassifiedCount > 0 && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-orange-400 text-sm">
              ⚠️ You have <span className="font-bold">{stats.unclassifiedCount} unclassified</span> transaction
              {stats.unclassifiedCount !== 1 ? "s" : ""} worth {formatNGN(stats.unclassifiedTotal)}. Please classify
              them for accurate tax calculation.
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Input Hub */}
        <div className="lg:col-span-1 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">
              {success}
            </div>
          )}

          {/* SMS Input */}
          <div className="glass-card p-6 shadow-dark">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-400" />
              Add Transaction
            </h2>
            <textarea
              id="sms-text"
              name="smsText"
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="Paste bank alert SMS here..."
              className="input-dark w-full h-32 resize-none"
            />
            <button
              onClick={handleAddSMS}
              disabled={isLoading || !smsText.trim()}
              className="gradient-button w-full py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Add SMS Alert"}
            </button>
          </div>

          {/* Upload Options */}
          <div className="glass-card p-6 shadow-dark">
            <h2 className="text-lg font-bold text-white mb-4">Quick Upload</h2>
            <div className="space-y-3">
              {/* Image Upload */}
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dark-600 bg-dark-700/30 hover:border-primary-500 hover:bg-dark-600/50 cursor-pointer transition-all">
                <div className="icon-badge bg-blue-500/20">
                  <Image className="text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Upload Screenshot</p>
                  <p className="text-xs text-gray-400">Bank alert image</p>
                </div>
                <input
                  type="file"
                  id="image-upload"
                  name="imageUpload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isProcessingImage}
                  className="hidden"
                />
                {isProcessingImage && <span className="text-xs text-primary-400">Processing...</span>}
              </label>

              {/* PDF Upload */}
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dark-600 bg-dark-700/30 hover:border-primary-500 hover:bg-dark-600/50 cursor-pointer transition-all">
                <div className="icon-badge bg-purple-500/20">
                  <FileText className="text-purple-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Upload PDF Statement</p>
                  <p className="text-xs text-gray-400">Bank statement PDF</p>
                </div>
                <input
                  type="file"
                  id="pdf-upload"
                  name="pdfUpload"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isPdfProcessing}
                  className="hidden"
                />
                {isPdfProcessing && <span className="text-xs text-primary-400">Processing...</span>}
              </label>

              {/* Download CSV */}
              <button
                onClick={handleDownloadCSV}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dark-600 bg-dark-700/30 hover:border-green-500 hover:bg-green-500/10 transition-all"
              >
                <div className="icon-badge bg-green-500/20">
                  <Download className="text-green-400" size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Export to CSV</p>
                  <p className="text-xs text-gray-400">Download all transactions</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Transaction List */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 shadow-dark">
            <h2 className="text-xl font-bold text-white mb-6">Transaction Chronicle</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading transactions...</p>
              </div>
            ) : !Array.isArray(transactions) || transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-dark-600/50 flex items-center justify-center">
                  <FileText className="text-gray-500" size={32} />
                </div>
                <p className="text-gray-400 mb-2">No transactions yet</p>
                <p className="text-gray-500 text-sm">Start by adding your first bank alert</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="glass-card p-4 hover:border-primary-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">
                          {txn.description || "No description"}
                        </p>
                        <p className="text-sm text-gray-400">📅 {txn.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-400">{formatNGN(txn.amount)}</p>
                        {txn.tax_status && (
                          <span
                            className={`category-badge inline-block mt-1 ${
                              txn.tax_status === "taxable"
                                ? "bg-green-500/20 text-green-400"
                                : txn.tax_status === "non_taxable"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {txn.tax_status === "taxable"
                              ? "TAXABLE"
                              : txn.tax_status === "non_taxable"
                              ? "EXEMPT"
                              : "UNCLASSIFIED"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {(!txn.tax_status || txn.tax_status === "unclassified") && (
                        <button
                          onClick={() => {
                            setSelectedTransaction(txn);
                            setShowClassifyModal(true);
                          }}
                          className="flex-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
                        >
                          Classify
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTransaction(txn.id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
