import React, { useEffect, useState } from "react";
import logo from "./assets/logo.png";
import { Plus, Trash2, Download, Image, Upload, LogOut, User } from "lucide-react";

const API_URL = "https://income-tax-tracker.onrender.com/api";

function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      if (!token) return;
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setUserName(data.user?.bankAlertName || "");
        setAuthToken(token);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("authToken");
      }
    } catch (err) {
      console.error("Auth check error:", err);
      localStorage.removeItem("authToken");
    } finally {
      setIsLoading(false);
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

      localStorage.setItem("authToken", data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setIsAuthenticated(true);

      setSuccess("✅ Registration successful!");
      setTimeout(() => setSuccess(""), 3000);

      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterName("");
    } catch (err) {
      setError("Registration failed: " + err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginEmail || !loginPassword) {
      setError("Please enter email and password");
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
      setUserName(data.user?.bankAlertName || "");
      setIsAuthenticated(true);

      setSuccess("✅ Login successful!");
      setTimeout(() => setSuccess(""), 3000);

      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setError("Login failed: " + err.message);
    }
  }

  async function handleLogout() {
    localStorage.removeItem("authToken");
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTransactions([]);
    setUserName("");
    setSmsText("");
    setSelectedImage(null);

    setSuccess("✅ Logged out successfully");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function loadTransactions() {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      }
    } catch (err) {
      console.error("Load transactions error:", err);
    }
  }

  async function saveUserName() {
    try {
      const response = await fetch(`${API_URL}/auth/bank-name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ bankAlertName: tempName }),
      });

      if (response.ok) {
        setUserName(tempName);
        setShowNameInput(false);
        setSuccess("✅ Name saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Failed to save name");
      }
    } catch (err) {
      setError("Failed to save name: " + err.message);
    }
  }

  function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    setSelectedImage(URL.createObjectURL(file));
    setIsProcessingImage(true);
    setError("");
    setSuccess("");

    try {
      const base64Image = await convertImageToBase64(file);

      const response = await fetch(`${API_URL}/extract-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ imageData: base64Image, mediaType: file.type }),
      });

      if (!response.ok) throw new Error("Failed to extract text");

      const data = await response.json();
      setSmsText(data.text || "");
      setSuccess('✅ Text extracted! Review and click "Add Transaction".');
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error("Image error:", err);
      setError("Failed to process image: " + err.message);
      setSelectedImage(null);
    } finally {
      setIsProcessingImage(false);
    }
  }

  function isDebitTransaction(text) {
    const lowerText = text.toLowerCase();
    const criticalKeywords = ["debit", "dr"];
    for (const keyword of criticalKeywords) {
      if (new RegExp(`\\b${keyword}\\b`, "i").test(text)) return true;
    }

    const debitKeywords = [
      "debited",
      "withdrawal",
      "withdraw",
      "transferred",
      "transfer from your",
      "payment to",
      "paid to",
      "sent to",
      "deducted",
      "charged",
      "purchase",
      "atm withdrawal",
      "pos purchase",
      "bill payment",
    ];
    return debitKeywords.some((k) => lowerText.includes(k));
  }

  function isCreditTransaction(text) {
    const lowerText = text.toLowerCase();
    const creditKeywords = [
      "credited",
      "credit",
      "received",
      "deposit",
      "transfer from",
      "payment from",
      "salary",
      "refund",
      "reversal",
    ];
    return creditKeywords.some((k) => lowerText.includes(k));
  }

  function parseSMS(text) {
    const transaction = {
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      description: "",
      bank: "",
      rawSMS: text,
    };

    const amountPatterns = [
      /(?:NGN|₦|N)\s*([0-9,]+\.?[0-9]*)/i,
      /(?:USD|\$)\s*([0-9,]+\.?[0-9]*)/i,
      /(?:credited|received|deposit).*?([0-9,]+\.?[0-9]*)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        transaction.amount = parseFloat(match[1].replace(/,/g, ""));
        break;
      }
    }

    const banks = ["GTBank", "Access", "Zenith", "First Bank", "UBA", "Stanbic", "Kuda"];
    for (const bank of banks) {
      if (text.toLowerCase().includes(bank.toLowerCase())) {
        transaction.bank = bank;
        break;
      }
    }

    const descPatterns = [
      /(?:from|narration:|desc:|description:)\s*([^\n.]+)/i,
      /(?:transfer from|payment from)\s*([^\n.]+)/i,
    ];

    for (const pattern of descPatterns) {
      const match = text.match(pattern);
      if (match) {
        transaction.description = match[1].trim();
        break;
      }
    }

    if (!transaction.description) transaction.description = text.substring(0, 60) + "...";
    return transaction;
  }

  function checkIfUserIsReceiver(text) {
    if (!userName) return false;
    const name = escapeRegExp(userName.trim());
    const patterns = [
      new RegExp(`\\bto\\s+${name}\\b`, "i"),
      new RegExp(`\\breceiver[:\\s]+${name}\\b`, "i"),
      new RegExp(`\\bbeneficiary[:\\s]+${name}\\b`, "i"),
      new RegExp(`\\bcredited to\\s+${name}\\b`, "i"),
      new RegExp(`\\brecipient[:\\s]+${name}\\b`, "i"),
    ];
    return patterns.some((p) => p.test(text));
  }

  function checkIfUserIsSender(text) {
    if (!userName) return false;
    const name = escapeRegExp(userName.trim());
    const patterns = [
      new RegExp(`\\bfrom\\s+${name}\\b`, "i"),
      new RegExp(`\\bsender[:\\s]+${name}\\b`, "i"),
      new RegExp(`\\bby\\s+${name}\\b`, "i"),
      new RegExp(`\\btransfer from\\s+${name}\\b`, "i"),
    ];
    return patterns.some((p) => p.test(text));
  }

  async function processAsCredit() {
    const newTransaction = parseSMS(smsText);
    if (newTransaction.amount <= 0) {
      setError("⚠️ Could not extract valid amount.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newTransaction),
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions((prev) => [data.transaction, ...prev]);
        setSmsText("");
        setSelectedImage(null);
        setSuccess("✅ Transaction added!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Failed to save transaction");
      }
    } catch (err) {
      setError("Failed to save: " + err.message);
    }
  }

  async function handleAddTransaction() {
    setError("");
    setSuccess("");

    if (!smsText.trim()) {
      setError("Please enter SMS text");
      return;
    }

    if (checkIfUserIsReceiver(smsText)) {
      await processAsCredit();
      return;
    }

    if (checkIfUserIsSender(smsText) || isDebitTransaction(smsText)) {
      setShowDebitPopup(true);
      setError("🚫 DEBIT DETECTED! Only credit/income alerts accepted.");
      setTimeout(() => {
        setSmsText("");
        setSelectedImage(null);
        setError("");
      }, 4000);
      return;
    }

    if (!isCreditTransaction(smsText)) {
      setError("⚠️ Unable to detect credit keywords.");
      return;
    }

    await processAsCredit();
  }

  async function handleDelete(id) {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setSuccess("✅ Deleted");
        setTimeout(() => setSuccess(""), 2500);
      } else {
        setError("Delete failed");
      }
    } catch {
      setError("Delete failed");
    }
  }

  function handleExport() {
    let csv = "Date,Amount,Description,Bank\n";
    transactions.forEach((t) => {
      const desc = (t.description || "").replace(/"/g, '""');
      csv += `${t.date},${t.amount},"${desc}",${t.bank || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-${Date.now()}.csv`;
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
      { limit: Infinity, rate: 0.25 },
    ];

    let tax = 0;
    let previousLimit = 0;

    for (const bracket of brackets) {
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

  const totalIncome = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const annualTax = calculateTax(totalIncome);
  const netIncome = totalIncome - annualTax;
  const effectiveRate = totalIncome > 0 ? (annualTax / totalIncome) * 100 : 0;

  const formatNGN = (n) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(n || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-green-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-green-900">
        <div className="text-lg text-white">Loading profile...</div>
      </div>
    );
  }

  // AUTH SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(59,130,246,.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,.20), transparent 45%), radial-gradient(circle at 80% 80%, rgba(34,197,94,.20), transparent 45%), linear-gradient(135deg, #050B1A 0%, #0B1025 50%, #071021 100%)',
          }}
        />

        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 p-3 shadow-lg ring-1 ring-white/20 backdrop-blur">
              <img src={logo} alt="Income Tax Tracker logo" className="h-full w-full object-contain" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">Income Tax Tracker</h2>
            <p className="text-white/80">Secure • Private • Easy to use</p>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8">
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowLogin(true);
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                  showLogin ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLogin(false);
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
                  !showLogin ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-2xl border border-green-200 text-sm">
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
                    autoComplete="email"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    autoComplete="current-password"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-2xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all"
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
                    autoComplete="name"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    autoComplete="email"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    autoComplete="new-password"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    autoComplete="new-password"
                    className="w-full p-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-2xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition-all"
                >
                  Create Account
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-white/70 text-sm mt-5">🔒 Your data is encrypted and secure</p>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen relative p-4 md:p-8">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-purple-900/60 to-green-900/70 backdrop-blur-sm" />
      </div>

      <div className="relative z-10">
        {showDebitPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold text-center text-red-600 mb-3">⛔ DEBIT DETECTED</h2>
              <p className="text-center text-gray-700 mb-2">
                This is a <span className="font-bold text-red-600">debit/withdrawal</span> alert.
              </p>
              <p className="text-center text-gray-600 mb-6 text-sm">
                Only <span className="font-semibold text-green-600">income (credit)</span> transactions allowed.
              </p>
              <button
                onClick={() => setShowDebitPopup(false)}
                className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl shadow-2xl p-8 mb-8 text-white">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
                  <h1 className="text-3xl md:text-4xl font-bold">Income Tax Tracker</h1>
                </div>
                <p className="text-blue-100 text-lg">Track income • Calculate tax</p>
              </div>

              <div className="flex gap-4 items-start">
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={20} className="opacity-80" />
                    <div className="text-left">
                      <p className="text-xs text-blue-200">Logged in</p>
                      <p className="font-semibold">{currentUser?.name || "User"}</p>
                      <p className="text-xs text-blue-200">{currentUser?.email || ""}</p>
                    </div>
                  </div>

                  {userName ? (
                    <div className="mt-2">
                      <p className="text-xs text-blue-200">Tracking: {userName}</p>
                      <button
                        onClick={() => {
                          setShowNameInput(true);
                          setTempName(userName);
                        }}
                        className="text-xs text-blue-200 hover:text-white underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNameInput(true)}
                      className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg mt-2"
                    >
                      + Add Name
                    </button>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {showNameInput && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-8">
                <h2 className="text-2xl font-bold mb-2">Enter Your Name</h2>
                <p className="text-gray-600 text-sm mb-4">For detecting sender/receiver in alerts</p>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3 border-2 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowNameInput(false);
                      setTempName(userName);
                    }}
                    className="flex-1 bg-gray-200 px-4 py-3 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUserName}
                    disabled={!tempName.trim()}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {(error || success) && (
            <div className="mb-6 space-y-3">
              {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">{error}</div>}
              {success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-2xl border border-green-200">{success}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/95 rounded-3xl p-5 shadow-xl">
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">{formatNGN(totalIncome)}</p>
            </div>
            <div className="bg-white/95 rounded-3xl p-5 shadow-xl">
              <p className="text-sm text-gray-500">Estimated Tax</p>
              <p className="text-2xl font-bold text-gray-900">{formatNGN(annualTax)}</p>
            </div>
            <div className="bg-white/95 rounded-3xl p-5 shadow-xl">
              <p className="text-sm text-gray-500">Net (After Tax)</p>
              <p className="text-2xl font-bold text-gray-900">{formatNGN(netIncome)}</p>
            </div>
            <div className="bg-white/95 rounded-3xl p-5 shadow-xl">
              <p className="text-sm text-gray-500">Effective Rate</p>
              <p className="text-2xl font-bold text-gray-900">{effectiveRate.toFixed(2)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">📝 Add Transaction</h2>

                <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
                  <div className="flex flex-col items-center">
                    <Upload className="text-blue-600 mb-3" size={32} />
                    <label className="cursor-pointer">
                      <span className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 inline-flex items-center gap-2 font-semibold">
                        <Image size={20} />
                        Upload Screenshot
                      </span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <p className="text-sm text-gray-600 mt-3">Or paste SMS text below</p>
                  </div>

                  {selectedImage && (
                    <div className="mt-4">
                      <img
                        src={selectedImage}
                        alt="SMS"
                        className="max-w-full h-auto max-h-64 mx-auto rounded-xl border-2 border-blue-200"
                      />
                    </div>
                  )}

                  {isProcessingImage && (
                    <div className="mt-4 text-center text-sm text-blue-700 font-semibold">
                      Processing image… please wait
                    </div>
                  )}
                </div>

                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  placeholder="Paste bank alert text here..."
                  className="w-full min-h-[170px] p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={handleAddTransaction}
                    disabled={!smsText.trim()}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-2xl hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Transaction
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={transactions.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSmsText("");
                    setSelectedImage(null);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-2xl font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">📌 Transactions</h2>

              {transactions.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 text-gray-600 border border-gray-200">No transactions yet.</div>
              ) : (
                <div className="overflow-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="p-3">Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Bank</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-t border-gray-200">
                          <td className="p-3 whitespace-nowrap">{t.date}</td>
                          <td className="p-3 whitespace-nowrap font-semibold">{formatNGN(t.amount)}</td>
                          <td className="p-3 whitespace-nowrap">{t.bank || "-"}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {transactions.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600">
                    Latest: <span className="font-semibold">{transactions[0]?.description || "—"}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
