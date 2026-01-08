// Transaction parser utility (adapted from web app)

const NIGERIAN_BANKS = [
  'GTBank', 'GTB', 'Guaranty Trust Bank',
  'Access Bank', 'Access',
  'Zenith Bank', 'Zenith',
  'First Bank', 'FirstBank',
  'UBA', 'United Bank for Africa',
  'Stanbic IBTC', 'Stanbic',
  'Kuda Bank', 'Kuda',
  'OPay',
  'Moniepoint',
  'PalmPay',
];

// Extract amount from text
export function extractAmount(text) {
  // Try Nigerian Naira format: NGN 1,234.56 or N1,234.56
  const ngnMatch = text.match(/(?:NGN|N)\s?([\d,]+(?:\.\d{2})?)/i);
  if (ngnMatch) {
    return parseFloat(ngnMatch[1].replace(/,/g, ''));
  }

  // Try USD format: $1,234.56
  const usdMatch = text.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
  if (usdMatch) {
    return parseFloat(usdMatch[1].replace(/,/g, ''));
  }

  // Try plain number with commas: 1,234.56
  const plainMatch = text.match(/([\d,]+\.\d{2})/);
  if (plainMatch) {
    return parseFloat(plainMatch[1].replace(/,/g, ''));
  }

  return null;
}

// Detect bank name from text
export function detectBank(text) {
  const lowerText = text.toLowerCase();

  for (const bank of NIGERIAN_BANKS) {
    if (lowerText.includes(bank.toLowerCase())) {
      // Return standardized bank name
      if (bank.includes('GTB') || bank.includes('GTBank')) return 'GTBank';
      if (bank.includes('Access')) return 'Access Bank';
      if (bank.includes('Zenith')) return 'Zenith Bank';
      if (bank.includes('First')) return 'First Bank';
      if (bank.includes('UBA')) return 'UBA';
      if (bank.includes('Stanbic')) return 'Stanbic IBTC';
      if (bank.includes('Kuda')) return 'Kuda Bank';
      if (bank.includes('OPay')) return 'OPay';
      if (bank.includes('Moniepoint')) return 'Moniepoint';
      if (bank.includes('PalmPay')) return 'PalmPay';
      return bank;
    }
  }

  return 'Unknown Bank';
}

// Check if transaction is a credit
export function isCredit(text, userBankName = '') {
  const lowerText = text.toLowerCase();

  // Credit indicators
  const creditKeywords = [
    'credit', 'credited', 'received', 'deposit', 'incoming',
    'transfer from', 'payment from', 'refund', 'cashback'
  ];

  // Debit indicators
  const debitKeywords = [
    'debit', 'debited', 'withdrawal', 'sent', 'outgoing',
    'transfer to', 'payment to', 'purchase', 'pos', 'atm'
  ];

  // Check for explicit credit indicators
  const hasCredit = creditKeywords.some(keyword => lowerText.includes(keyword));
  const hasDebit = debitKeywords.some(keyword => lowerText.includes(keyword));

  if (hasCredit && !hasDebit) return true;
  if (hasDebit && !hasCredit) return false;

  // If user's name is mentioned with "from", it's likely a credit
  if (userBankName && lowerText.includes(userBankName.toLowerCase())) {
    if (lowerText.includes('from') || lowerText.includes('received')) {
      return true;
    }
  }

  // Default to false if unclear
  return false;
}

// Extract description from SMS
export function extractDescription(text) {
  // Remove common footer text
  let cleanText = text
    .replace(/Dial \*\d+#.*/gi, '')
    .replace(/For.*enquir.*/gi, '')
    .replace(/Call.*customer.*/gi, '')
    .replace(/Charges may apply.*/gi, '')
    .replace(/Thank you.*/gi, '')
    .trim();

  // Try to extract description after "Desc:" or "Narration:" or "Details:"
  const descMatch = cleanText.match(/(?:Desc|Description|Narration|Details|Remark):\s*(.+?)(?:\.|Bal|Account|$)/i);
  if (descMatch) {
    return descMatch[1].trim();
  }

  // Try to extract text between "from" and "to"
  const fromToMatch = cleanText.match(/from\s+(.+?)\s+to/i);
  if (fromToMatch) {
    return fromToMatch[1].trim();
  }

  // Extract first meaningful sentence (up to 100 chars)
  const firstSentence = cleanText.split(/[.\n]/)[0].substring(0, 100);
  return firstSentence.trim();
}

// Main parser function
export function parseTransactionFromText(text, userBankName = '') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const amount = extractAmount(text);
  if (!amount || amount <= 0) {
    return null;
  }

  const bank = detectBank(text);
  const creditStatus = isCredit(text, userBankName);
  const description = extractDescription(text);

  return {
    amount,
    bank,
    isCredit: creditStatus,
    description,
    rawText: text,
  };
}
