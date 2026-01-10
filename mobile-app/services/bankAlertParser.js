// Bank Alert Parser for Nigerian Banks
// Based on the web app's parsing logic

export function parseBankAlert(text) {
  if (!text) return null;

  // Clean the text
  const cleanedText = cleanForDetection(text);

  // Check if it's a debit transaction
  const isDebit = isDebitTransaction(cleanedText);

  // Extract amount
  const amount = extractAmount(cleanedText);
  if (!amount || amount <= 0) return null;

  // Extract bank name
  const bank = extractBankName(cleanedText);

  // Extract description
  const description = extractDescription(cleanedText, bank);

  return {
    amount,
    type: isDebit ? 'expense' : 'income',
    description: description || (isDebit ? 'Bank debit' : 'Bank credit'),
    bank: bank || 'Unknown Bank',
    date: new Date().toISOString().split('T')[0], // Today's date
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

function isDebitTransaction(text) {
  const lowerText = text.toLowerCase();

  // Check for OPay/Transfer receipts pattern
  // If "Sender Details" appears BEFORE "Recipient Details", user is sending money (debit)
  const senderIndex = lowerText.indexOf('sender details');
  const recipientIndex = lowerText.indexOf('recipient details');

  if (senderIndex !== -1 && recipientIndex !== -1) {
    // In OPay receipts, Sender Details comes AFTER Recipient Details for credits
    // and BEFORE Recipient Details for debits (in the visual layout)
    // But in the extracted text, we need to check which appears first

    // Better approach: Check if user is mentioned in "Sender" section
    // If recipient is a business/different person, it's a debit
    const lines = text.split('\n');
    let inRecipientSection = false;
    let inSenderSection = false;
    let recipientInfo = '';
    let senderInfo = '';

    for (const line of lines) {
      if (/recipient\s+details/i.test(line)) {
        inRecipientSection = true;
        inSenderSection = false;
        continue;
      }
      if (/sender\s+details/i.test(line)) {
        inSenderSection = true;
        inRecipientSection = false;
        continue;
      }
      if (/transaction\s+no/i.test(line)) {
        inRecipientSection = false;
        inSenderSection = false;
      }

      if (inRecipientSection && line.trim()) {
        recipientInfo += line + ' ';
      }
      if (inSenderSection && line.trim()) {
        senderInfo += line + ' ';
      }
    }

    // If sender info contains common user patterns and recipient contains business/organization
    // This is a transfer OUT (debit)
    const businessPatterns = /\b(ltd|limited|intl|international|partnership|company|enterprise|ventures|group|inc|corporation|ac|account)\b/i;
    if (businessPatterns.test(recipientInfo)) {
      return true; // Sending to a business = debit
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
