import { Platform, PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-sms-android';
import { parseTransactionFromText } from '../utils/parser';
import { transactionAPI } from './api';

// Nigerian bank SMS sender IDs
const BANK_SENDERS = [
  'GTBank',
  'GTBANK',
  'AccessBank',
  'ACCESSBANK',
  'ZenithBank',
  'ZENITHBANK',
  'FirstBank',
  'FIRSTBANK',
  'UBA',
  'StanbicIBTC',
  'STANBICIBTC',
  'Kuda',
  'KUDA',
  'KudaBank',
  'OPAY',
  'OPay',
  'Moniepoint',
  'MONIEPOINT',
  'PalmPay',
  'PALMPAY',
];

class SMSReader {
  constructor() {
    this.listeners = [];
    this.isMonitoring = false;
  }

  // Request SMS permissions for Android
  async requestPermissions() {
    if (Platform.OS !== 'android') {
      console.log('SMS reading is only available on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      return (
        granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.error('Error requesting SMS permissions:', err);
      return false;
    }
  }

  // Check if a sender is a known bank
  isBankSender(sender) {
    if (!sender) return false;
    const normalizedSender = sender.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return BANK_SENDERS.some(bank =>
      normalizedSender.includes(bank.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    );
  }

  // Read recent SMS messages
  async readRecentSMS(maxCount = 50) {
    if (Platform.OS !== 'android') {
      return [];
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('SMS permissions not granted');
    }

    return new Promise((resolve, reject) => {
      const filter = {
        box: 'inbox',
        maxCount,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.error('Failed to read SMS:', fail);
          reject(fail);
        },
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          const bankMessages = messages.filter(sms => this.isBankSender(sms.address));
          resolve(bankMessages);
        }
      );
    });
  }

  // Process a bank SMS and create transaction if it's a credit
  async processBankSMS(sms, userBankName = '') {
    const { body, address, date } = sms;

    console.log('Processing SMS from:', address);
    console.log('Body:', body);

    // Parse the transaction
    const parsed = parseTransactionFromText(body, userBankName);

    if (!parsed) {
      console.log('Could not parse transaction from SMS');
      return null;
    }

    // Only process credit transactions
    if (!parsed.isCredit) {
      console.log('Skipping debit transaction');
      return null;
    }

    // Create transaction object
    const transaction = {
      date: new Date(parseInt(date)).toISOString().split('T')[0],
      amount: parsed.amount,
      description: parsed.description,
      bank: parsed.bank,
      raw_sms: body,
    };

    console.log('Parsed transaction:', transaction);

    try {
      // Send to backend
      const response = await transactionAPI.create(transaction);
      console.log('Transaction created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Scan all recent SMS and import credit transactions
  async scanAndImportTransactions(userBankName = '', onProgress = null) {
    try {
      const messages = await this.readRecentSMS(100);
      console.log(`Found ${messages.length} bank SMS messages`);

      const results = {
        total: messages.length,
        processed: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
      };

      for (let i = 0; i < messages.length; i++) {
        const sms = messages[i];

        try {
          const transaction = await this.processBankSMS(sms, userBankName);

          if (transaction) {
            results.imported++;
          } else {
            results.skipped++;
          }

          results.processed++;

          if (onProgress) {
            onProgress(results);
          }
        } catch (error) {
          console.error('Error processing SMS:', error);
          results.errors++;
          results.processed++;

          if (onProgress) {
            onProgress(results);
          }
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;
    } catch (error) {
      console.error('Error scanning SMS:', error);
      throw error;
    }
  }

  // Start monitoring for new SMS (would require background task)
  async startMonitoring(userBankName = '', onNewTransaction = null) {
    // Note: Real-time SMS monitoring requires native module setup
    // This is a placeholder for future implementation
    console.log('SMS monitoring started');
    this.isMonitoring = true;

    // In a production app, you would set up a broadcast receiver
    // to listen for incoming SMS messages
  }

  // Stop monitoring
  stopMonitoring() {
    console.log('SMS monitoring stopped');
    this.isMonitoring = false;
  }
}

export default new SMSReader();
