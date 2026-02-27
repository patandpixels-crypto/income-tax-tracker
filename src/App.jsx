import React, { useEffect, useState } from "react";
import logo from "./assets/logo.png";
import { Plus, Trash2, Download, Image, Upload, LogOut, User, FileText } from "lucide-react";

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
        setIsLoading(false);
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

  async function handlePdfUpload(event) {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setError("Please select a valid PDF file");
      return;
    }

    setIsPdfProcessing(true);
    setError("");
    setSuccess("");

    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${API_URL}/extract-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pdfData: base64 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || "Failed to process PDF");
      }

      const data = await response.json();

      if (!data.transactions || data.transactions.length === 0) {
        setError("⚠️ No income transactions found in this PDF. Make sure it's a bank statement.");
        return;
      }

      // Pre-select only non-duplicates
      const selected = {};
      data.transactions.forEach((txn, i) => { selected[i] = !txn.isDuplicate; });

      setPdfFilename(file.name);
      setPdfTransactions(data.transactions);
      setSelectedPdfTxns(selected);
      setPdfStatementPeriod(data.statementPeriod || null);
      setPdfOverlappingStatements(data.overlappingStatements || []);
      setShowPdfModal(true);
    } catch (err) {
      setError("Failed to process PDF: " + err.message);
    } finally {
      setIsPdfProcessing(false);
      // Reset file input
      event.target.value = "";
    }
  }

  async function handleAddPdfTransactions() {
    const toAdd = pdfTransactions.filter((_, i) => selectedPdfTxns[i]);

    if (toAdd.length === 0) {
      setError("Please select at least one transaction to add.");
      return;
    }

    try {
      const added = [];
      for (const txn of toAdd) {
        const response = await fetch(`${API_URL}/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            date: txn.date,
            amount: txn.amount,
            description: txn.description,
            bank: txn.bank,
            rawSMS: null,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          added.push(data.transaction);
        }
      }

      // Save statement record
      await fetch(`${API_URL}/bank-statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          filename: pdfFilename,
          periodStart: pdfStatementPeriod?.start,
          periodEnd: pdfStatementPeriod?.end,
          transactionCount: added.length,
        }),
      }).catch(() => {});

      setTransactions((prev) => [...added.reverse(), ...prev]);
      setShowPdfModal(false);
      setPdfTransactions([]);
      setSelectedPdfTxns({});
      setPdfStatementPeriod(null);
      setPdfOverlappingStatements([]);
      setPdfFilename("");
      setSuccess(`✅ ${added.length} transaction${added.length !== 1 ? "s" : ""} added from bank statement!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError("Failed to add transactions: " + err.message);
    }
  }

  function cleanForDetection(text) {
  if (!text) return "";

  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Remove common receipt footers / marketing lines that contain misleading words like "withdrawals"
  const junkLineRegex =
    /(enjoy a better life|get free transfers|withdrawals|bill payments|instant loans|annual interest|licensed by|central bank|insured by|ndic)/i;

  const cleaned = lines.filter((l) => !junkLineRegex.test(l));

  return cleaned.join("\n");
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

 async function processAsCredit(textToProcess = smsText) {
  const newTransaction = parseSMS(textToProcess);

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
      setTransactions([data.transaction, ...transactions]);
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

  // ✅ Clean text first (removes footer words like “withdrawals”)
  const cleanedText = cleanForDetection(smsText);

  const isUserReceiver = checkIfUserIsReceiver(cleanedText);
  if (isUserReceiver) {
    await processAsCredit(cleanedText);
    return;
  }

  const isUserSender = checkIfUserIsSender(cleanedText);
  if (isUserSender || isDebitTransaction(cleanedText)) {
    setShowDebitPopup(true);
    setError("🚫 DEBIT DETECTED! Only credit/income alerts accepted.");
    setTimeout(() => {
      setSmsText("");
      setSelectedImage(null);
      setError("");
    }, 4000);
    return;
  }

  if (!isCreditTransaction(cleanedText)) {
    setError("⚠️ Unable to detect credit keywords.");
    return;
  }

  await processAsCredit(cleanedText);
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

  async function handleClassify(id, taxCategory, incomeType) {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}/classify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ taxCategory, incomeType }),
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, taxCategory: data.transaction.taxCategory, incomeType: data.transaction.incomeType } : t))
        );
        setShowClassifyModal(false);
        setSelectedTransaction(null);
        setSuccess("✅ Transaction classified!");
        setTimeout(() => setSuccess(""), 2500);
      }
    } catch {
      setError("Classification failed");
    }
  }

  function handleTransactionClick(transaction) {
    // Only show classification popup for unclassified transactions
    if (!transaction.taxCategory || transaction.taxCategory === "unclassified") {
      setSelectedTransaction(transaction);
      setShowClassifyModal(true);
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
  const taxableIncome = transactions
    .filter((t) => t.taxCategory === "taxable")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const nonTaxableIncome = transactions
    .filter((t) => t.taxCategory === "non_taxable")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const unclassifiedIncome = transactions
    .filter((t) => !t.taxCategory || t.taxCategory === "unclassified")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const annualTax = calculateTax(taxableIncome);
  const netIncome = totalIncome - annualTax;

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

        {showClassifyModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg transform transition-all">
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-3xl">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>🏷️</span>
                  <span>Classify Transaction</span>
                </h2>
                <p className="text-white/90 text-sm mt-2">
                  Help us understand this transaction for accurate tax calculation
                </p>
              </div>

              {/* Transaction Details */}
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Transaction Details</p>
                  <p className="font-semibold text-gray-900 mb-2">{selectedTransaction.description || "No description"}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">📅 {selectedTransaction.date}</span>
                    <span className="font-bold text-green-600 text-lg">{formatNGN(selectedTransaction.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Classification Options */}
              <div className="p-6">
                <p className="text-sm font-semibold text-gray-700 mb-4">Select transaction type:</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleClassify(selectedTransaction.id, "taxable", "salary")}
                    className="w-full p-4 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 hover:border-green-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💼</span>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 group-hover:text-green-700">Pay for Work</p>
                        <p className="text-xs text-green-700">Salary, freelance income, or business revenue</p>
                      </div>
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-semibold">Taxable</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleClassify(selectedTransaction.id, "non_taxable", "gift")}
                    className="w-full p-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎁</span>
                      <div className="flex-1">
                        <p className="font-semibold text-purple-900 group-hover:text-purple-700">Gift</p>
                        <p className="text-xs text-purple-700">Money received as a gift from family or friends</p>
                      </div>
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-semibold">Non-Taxable</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleClassify(selectedTransaction.id, "non_taxable", "loan")}
                    className="w-full p-4 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 hover:border-yellow-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">💰</span>
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 group-hover:text-yellow-700">Loan</p>
                        <p className="text-xs text-yellow-700">Borrowed money that needs to be repaid</p>
                      </div>
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-semibold">Non-Taxable</span>
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
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showPdfModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">📄 Bank Statement Transactions</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We found <span className="font-semibold text-purple-600">{pdfTransactions.length} income transaction{pdfTransactions.length !== 1 ? "s" : ""}</span> in your statement.
                  Select the ones you want to add to your tax calculation.
                </p>
                {pdfStatementPeriod?.start && (
                  <p className="text-xs text-gray-400 mt-1">
                    📅 Statement period: <span className="font-semibold text-gray-600">{pdfStatementPeriod.start}</span> → <span className="font-semibold text-gray-600">{pdfStatementPeriod.end}</span>
                  </p>
                )}
                {pdfOverlappingStatements.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-xs text-yellow-800">
                    ⚠️ <span className="font-semibold">Overlapping statement detected.</span> You previously uploaded a statement covering this period:
                    <ul className="mt-1 space-y-0.5">
                      {pdfOverlappingStatements.map((s, i) => (
                        <li key={i} className="ml-2">• <span className="font-medium">{s.filename}</span> ({s.period_start} → {s.period_end}, {s.transaction_count} txns added on {new Date(s.uploaded_at).toLocaleDateString()})</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pdfTransactions.some(t => t.isDuplicate) && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
                    🔁 <span className="font-semibold">{pdfTransactions.filter(t => t.isDuplicate).length} transaction{pdfTransactions.filter(t => t.isDuplicate).length !== 1 ? "s" : ""} already exist</span> in your records and have been deselected.
                  </div>
                )}
              </div>

              {/* Select all toggle */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="select-all-pdf"
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                  checked={pdfTransactions.length > 0 && pdfTransactions.every((_, i) => selectedPdfTxns[i])}
                  onChange={(e) => {
                    const next = {};
                    pdfTransactions.forEach((_, i) => { next[i] = e.target.checked; });
                    setSelectedPdfTxns(next);
                  }}
                />
                <label htmlFor="select-all-pdf" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Select all ({Object.values(selectedPdfTxns).filter(Boolean).length} of {pdfTransactions.length} selected)
                </label>
              </div>

              {/* Transaction list */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
                {pdfTransactions.map((txn, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      txn.isDuplicate
                        ? "border-orange-200 bg-orange-50 opacity-70"
                        : selectedPdfTxns[i]
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 accent-purple-600 cursor-pointer"
                      checked={!!selectedPdfTxns[i]}
                      onChange={(e) => setSelectedPdfTxns((prev) => ({ ...prev, [i]: e.target.checked }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{txn.description || "—"}</p>
                          {txn.isDuplicate && (
                            <span className="shrink-0 text-xs bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">Already added</span>
                          )}
                        </div>
                        <p className="font-bold text-green-600 whitespace-nowrap">{formatNGN(txn.amount)}</p>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>📅 {txn.date}</span>
                        {txn.bank && <span>🏦 {txn.bank}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-600 text-sm">⚠️</span>
                  <p className="text-xs text-amber-700">
                    Only selected transactions will be added to your income tax calculation. You can delete any transaction later.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPdfModal(false);
                      setPdfTransactions([]);
                      setSelectedPdfTxns({});
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPdfTransactions}
                    disabled={Object.values(selectedPdfTxns).filter(Boolean).length === 0}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add {Object.values(selectedPdfTxns).filter(Boolean).length} Transaction{Object.values(selectedPdfTxns).filter(Boolean).length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
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
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-600">Total Income</p>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatNGN(totalIncome)}</p>
              <p className="text-xs text-gray-500">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-6 shadow-xl border border-red-100 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-red-700">Estimated Tax</p>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mb-1">{formatNGN(annualTax)}</p>
              <p className="text-xs text-red-600">{((annualTax / totalIncome) * 100 || 0).toFixed(1)}% of total</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 shadow-xl border border-green-100 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-green-700">Net Income</p>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mb-1">{formatNGN(netIncome)}</p>
              <p className="text-xs text-green-600">After tax deduction</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-xl border border-blue-100 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-700">Non-Taxable</p>
                <span className="text-2xl">🎁</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-1">{formatNGN(nonTaxableIncome)}</p>
              <p className="text-xs text-blue-600">Gifts & loans</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">➕</span>
                  <span>Add Transaction</span>
                </h2>

                <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="text-blue-600" size={32} />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="cursor-pointer">
                        <span className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 inline-flex items-center gap-2 font-semibold">
                          <Image size={20} />
                          Upload Screenshot
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>

                      <label className="cursor-pointer">
                        <span className={`px-6 py-3 rounded-xl inline-flex items-center gap-2 font-semibold transition-all ${
                          isPdfProcessing
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}>
                          <FileText size={20} />
                          {isPdfProcessing ? "Processing PDF…" : "Upload Bank Statement"}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfUpload}
                          disabled={isPdfProcessing}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">Or paste SMS text below</p>
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">💳</span>
                <span>Transactions</span>
              </h2>

              {transactions.length === 0 ? (
                <div className="p-8 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border border-gray-200 text-center">
                  <p className="text-lg mb-2">No transactions yet</p>
                  <p className="text-sm text-gray-500">Add your first transaction to get started</p>
                </div>
              ) : (
                <>
                  {transactions.some((t) => !t.taxCategory || t.taxCategory === "unclassified") && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-400 rounded-xl flex items-start gap-3 shadow-sm">
                      <span className="text-orange-500 text-xl">⚠️</span>
                      <div>
                        <p className="text-sm font-semibold text-orange-900 mb-1">
                          {transactions.filter((t) => !t.taxCategory || t.taxCategory === "unclassified").length} transaction{transactions.filter((t) => !t.taxCategory || t.taxCategory === "unclassified").length !== 1 ? "s" : ""} need{transactions.filter((t) => !t.taxCategory || t.taxCategory === "unclassified").length === 1 ? "s" : ""} classification
                        </p>
                        <p className="text-xs text-orange-700">
                          Click on unclassified transactions to categorize them as Gift, Loan, or Pay for Work
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {transactions.map((t) => {
                      const isUnclassified = !t.taxCategory || t.taxCategory === "unclassified";
                      const isTaxable = t.taxCategory === "taxable";
                      const isNonTaxable = t.taxCategory === "non_taxable";

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTransactionClick(t)}
                          className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                            isUnclassified
                              ? "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 hover:border-orange-400 hover:shadow-lg cursor-pointer transform hover:scale-[1.02]"
                              : isTaxable
                              ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300 hover:shadow-md"
                              : "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md"
                          }`}
                        >
                          {/* Status stripe */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                            isUnclassified ? "bg-orange-400" : isTaxable ? "bg-green-500" : "bg-blue-500"
                          }`} />

                          <div className="p-4 pl-5">
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                  {t.description || "No description"}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <span className="flex items-center gap-1">
                                    📅 {t.date}
                                  </span>
                                  {t.bank && (
                                    <span className="flex items-center gap-1">
                                      🏦 {t.bank}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="font-bold text-lg text-green-600 mb-1">
                                  {formatNGN(t.amount)}
                                </p>
                                {isTaxable && (
                                  <span className="inline-block text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                                    Taxable
                                  </span>
                                )}
                                {isNonTaxable && (
                                  <span className="inline-block text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">
                                    Non-Taxable
                                  </span>
                                )}
                                {isUnclassified && (
                                  <span className="inline-block text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold animate-pulse">
                                    Classify Me
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Income type badge */}
                            {t.incomeType && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] bg-white/60 text-gray-700 px-2 py-0.5 rounded-full font-medium border border-gray-200">
                                  {t.incomeType === "gift" && "🎁 Gift"}
                                  {t.incomeType === "loan" && "💰 Loan"}
                                  {t.incomeType === "salary" && "💼 Salary"}
                                  {t.incomeType === "freelance" && "💻 Freelance"}
                                  {t.incomeType === "business" && "🏢 Business"}
                                </span>
                              </div>
                            )}

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(t.id);
                              }}
                              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors shadow-sm"
                              title="Delete transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {transactions.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold text-blue-600">{transactions.length}</span> total transaction{transactions.length !== 1 ? "s" : ""} tracked
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
