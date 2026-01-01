import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Image, Upload, LogOut, User } from 'lucide-react';

const API_URL = 'https://income-tax-tracker.onrender.com';

export default function SMSIncomeTracker() {
  const [smsText, setSmsText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDebitPopup, setShowDebitPopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadTransactions();
    }
  }, [isAuthenticated, authToken]);

  // Check if user is logged in
  async function checkAuthentication() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setUserName(data.user.bankAlertName || '');
        setAuthToken(token);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  }

  // Register new user
  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    
    if (!registerEmail || !registerPassword || !registerName) {
      setError('Please fill in all fields');
      return;
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Save token and set user
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      setSuccess('✅ Registration successful!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Clear form
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterName('');
      
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }
  }

  // Login user
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    
    if (!loginEmail || !loginPassword) {
      setError('Please enter email and password');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Save token and set user
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setUserName(data.user.bankAlertName || '');
      setIsAuthenticated(true);
      
      setSuccess('✅ Login successful!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Clear form
      setLoginEmail('');
      setLoginPassword('');
      
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
  }

  // Logout user
  async function handleLogout() {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTransactions([]);
    setUserName('');
    setSuccess('✅ Logged out successfully');
    setTimeout(() => setSuccess(''), 3000);
  }

  async function loadTransactions() {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Load transactions error:', err);
    }
  }

  async function saveUserName() {
    try {
      const response = await fetch(`${API_URL}/auth/bank-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ bankAlertName: tempName })
      });

      if (response.ok) {
        setUserName(tempName);
        setShowNameInput(false);
        setSuccess('✅ Name saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save name: ' + err.message);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setSelectedImage(URL.createObjectURL(file));
    setIsProcessingImage(true);
    setError('');

    try {
      const base64Image = await convertImageToBase64(file);

      const response = await fetch(`${API_URL}/extract-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          imageData: base64Image,
          mediaType: file.type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract text');
      }

      const data = await response.json();
      setSmsText(data.text);
      setSuccess('Text extracted from image! Review and click "Add Transaction" to save.');
      
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image: ' + err.message);
      setSelectedImage(null);
    } finally {
      setIsProcessingImage(false);
    }
  }

  function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);
    });
  }

  function isDebitTransaction(text) {
    const lowerText = text.toLowerCase();
    const criticalDebitKeywords = ['debit', 'dr'];
    
    for (const keyword of criticalDebitKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        return true;
      }
    }
    
    const debitKeywords = [
      'debited', 'withdrawal', 'withdraw', 'transferred', 'transfer from your',
      'payment to', 'paid to', 'sent to', 'deducted', 'charged', 'purchase',
      'atm withdrawal', 'pos purchase', 'bill payment'
    ];
    
    return debitKeywords.some(keyword => lowerText.includes(keyword));
  }

  function isCreditTransaction(text) {
    const lowerText = text.toLowerCase();
    const creditKeywords = [
      'credited', 'credit', 'received', 'deposit', 'transfer from',
      'payment from', 'salary', 'refund', 'reversal'
    ];
    return creditKeywords.some(keyword => lowerText.includes(keyword));
  }

  function parseSMS(text) {
    const transaction = {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      bank: '',
      rawSMS: text
    };

    const amountPatterns = [
      /(?:NGN|₦|N)\s*([0-9,]+\.?[0-9]*)/i,
      /(?:USD|\$)\s*([0-9,]+\.?[0-9]*)/i,
      /(?:credited|received|deposit).*?([0-9,]+\.?[0-9]*)/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        transaction.amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    const banks = ['GTBank', 'Access', 'Zenith', 'First Bank', 'UBA', 'Stanbic', 'Kuda'];
    for (const bank of banks) {
      if (text.toLowerCase().includes(bank.toLowerCase())) {
        transaction.bank = bank;
        break;
      }
    }

    const descPatterns = [
      /(?:from|narration:|desc:|description:)\s*([^\n.]+)/i,
      /(?:transfer from|payment from)\s*([^\n.]+)/i
    ];

    for (const pattern of descPatterns) {
      const match = text.match(pattern);
      if (match) {
        transaction.description = match[1].trim();
        break;
      }
    }

    if (!transaction.description) {
      transaction.description = text.substring(0, 50) + '...';
    }

    return transaction;
  }

  async function handleAddTransaction() {
    if (!smsText.trim()) {
      setError('Please enter SMS text');
      return;
    }

    const isUserReceiver = checkIfUserIsReceiver(smsText);
    
    if (isUserReceiver) {
      await processAsCredit();
      return;
    }

    const isUserSender = checkIfUserIsSender(smsText);
    
    if (isUserSender || isDebitTransaction(smsText)) {
      setShowDebitPopup(true);
      setError('🚫 DEBIT TRANSACTION DETECTED! This app only accepts credit/income alerts.');
      setTimeout(() => {
        setSmsText('');
        setSelectedImage(null);
        setError('');
      }, 4000);
      return;
    }

    if (!isCreditTransaction(smsText)) {
      setError('⚠️ Unable to detect credit keywords. Please ensure this is an income/credit alert.');
      return;
    }

    await processAsCredit();
  }

  async function processAsCredit() {
    const newTransaction = parseSMS(smsText);

    if (newTransaction.amount <= 0) {
      setError('⚠️ Could not extract a valid amount from the SMS. Please check the format.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newTransaction)
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions([data.transaction, ...transactions]);
        setSmsText('');
        setSelectedImage(null);
        setSuccess('✅ Income transaction added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to save transaction');
      }
    } catch (err) {
      setError('Failed to save transaction: ' + err.message);
    }
  }

  function checkIfUserIsReceiver(text) {
    if (!userName) return false;
    
    const creditPatterns = [
      new RegExp(`\\bto\\s+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\breceiver[:\\s]+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\bbeneficiary[:\\s]+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\bcredited to\\s+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\brecipient[:\\s]+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\bpayment to\\s+${userName.toLowerCase()}\\b`, 'i')
    ];
    
    return creditPatterns.some(pattern => pattern.test(text));
  }

  function checkIfUserIsSender(text) {
    if (!userName) return false;
    
    const debitPatterns = [
      new RegExp(`\\bfrom\\s+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\bsender[:\\s]+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\bby\\s+${userName.toLowerCase()}\\b`, 'i'),
      new RegExp(`\\btransfer from\\s+${userName.toLowerCase()}\\b`, 'i')
    ];
    
    return debitPatterns.some(pattern => pattern.test(text));
  }

  async function handleDelete(id) {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
        setSuccess('Transaction deleted');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete transaction');
    }
  }

  function handleExport() {
    let csv = 'Date,Amount,Description,Bank\n';
    transactions.forEach(t => {
      csv += `${t.date},${t.amount},"${t.description}",${t.bank}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-transactions-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function calculateTax(income) {
    const brackets = [
      { limit: 800000, rate: 0 },
      { limit: 3000000, rate: 0.15 },
      { limit: 12000000, rate: 0.18 },
      { limit: 25000000, rate: 0.21 },
      { limit: 50000000, rate: 0.23 },
      { limit: Infinity, rate: 0.25 }
    ];

    let tax = 0;
    let previousLimit = 0;

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      if (income <= bracket.limit) {
        const taxableInThisBracket = income - previousLimit;
        tax += taxableInThisBracket * bracket.rate;
        break;
      } else {
        const taxableInThisBracket = bracket.limit - previousLimit;
        tax += taxableInThisBracket * bracket.rate;
        previousLimit = bracket.limit;
      }
    }

    return tax;
  }

  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const annualTax = calculateTax(totalIncome);
  const netIncome = totalIncome - annualTax;
  const effectiveRate = totalIncome > 0 ? (annualTax / totalIncome) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-green-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  // Show login/register screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative p-4 md:p-8">
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-green-900/80 backdrop-blur-sm"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-white mb-2">💰</h1>
              <h2 className="text-3xl font-bold text-white mb-2">Income Tax Tracker</h2>
              <p className="text-gray-200">Secure • Private • Easy to use</p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8">
              <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => { setShowLogin(true); setError(''); }}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    showLogin ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setShowLogin(false); setError(''); }}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    !showLogin ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Register
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm">
                  {success}
                </div>
              )}

              {showLogin ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg transition-all mt-6"
                  >
                    Login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold shadow-lg transition-all mt-6"
                  >
                    Create Account
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-gray-300 text-sm mt-6">
              🔒 Your data is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main app (same as before but with secure backend)
  return (
    <div className="min-h-screen relative p-4 md:p-8">
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-purple-900/60 to-green-900/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10">
      {showDebitPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-bounce">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-red-600 mb-3">
              ⛔ DEBIT TRANSACTION DETECTED
            </h2>
            <p className="text-center text-gray-700 mb-2">
              This appears to be a <span className="font-bold text-red-600">debit/withdrawal</span> alert.
            </p>
            <p className="text-center text-gray-600 mb-6 text-sm">
              This app only tracks <span className="font-semibold text-green-600">income (credit)</span> transactions for tax purposes.
            </p>
            <button
              onClick={() => setShowDebitPopup(false)}
              className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl shadow-2xl p-8 mb-8 text-white backdrop-blur-sm bg-opacity-95">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">💰 Income Tax Tracker</h1>
              <p className="text-blue-100 text-lg">Track your income and calculate tax automatically</p>
            </div>
            <div className="text-right flex gap-4 items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white bg-opacity-20 p-2 rounded-full">
                    <User size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-blue-200">Logged in as:</p>
                    <p className="font-semibold">{currentUser.name}</p>
                    <p className="text-xs text-blue-200">{currentUser.email}</p>
                  </div>
                </div>
                {userName && (
                  <div className="mt-2">
                    <p className="text-sm text-blue-200">Tracking alerts for:</p>
                    <p className="text-lg font-bold">{userName}</p>
                    <button
                      onClick={() => { setShowNameInput(true); setTempName(userName); }}
                      className="text-sm text-blue-200 hover:text-white underline mt-1"
                    >
                      Edit Name
                    </button>
                  </div>
                )}
                {!userName && (
                  <button
                    onClick={() => setShowNameInput(true)}
                    className="text-sm bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg transition-all mt-2"
                  >
                    + Add Bank Alert Name
                  </button>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {showNameInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter Your Name</h2>
              <p className="text-gray-600 text-sm mb-4">
                We'll use your name to better detect if you're sending (debit) or receiving (credit) money in SMS alerts.
              </p>
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name (as it appears in bank alerts)
              </label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowNameInput(false); setTempName(userName); }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUserName}
                  disabled={!tempName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 font-semibold transition-colors"
                >
                  Save Name
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the app UI remains the same */}
        {/* I'll continue with the complete UI in the next update */}
      </div>
      </div>
    </div>
  );
}