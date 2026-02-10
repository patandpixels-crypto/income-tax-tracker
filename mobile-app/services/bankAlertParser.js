// Bank Alert Parser for Nigerian Banks
// Based on the web app's parsing logic

function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseBankAlert(text, userName = null) {
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

    console.log('Recipient match:', recipientMatch);

    if (recipientMatch) {
      const recipientName = recipientMatch[1].trim();
      console.log('Recipient name extracted:', recipientName);

      // Check if recipient has business keywords or all-caps business name patterns
      const businessPatterns = /\b(ltd|limited|intl|international|partnership|company|enterprise|ventures|group|inc|corporation|church|ministry|foundation|ngo|association)\b/i;

      // Check if it's an all-caps business name (usually 4+ words all caps)
      const isAllCapsBusinessName = /^[A-Z\s]{10,}$/.test(recipientName) && recipientName.split(/\s+/).length >= 3;

      console.log('Business pattern test:', businessPatterns.test(recipientName));
      console.log('All caps business name test:', isAllCapsBusinessName);

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
