import { Platform, PermissionsAndroid, Alert } from 'react-native';
import SmsAndroid from 'react-native-android-sms-listener';
import { parseBankAlert } from './bankAlertParser';
import api from './api';

let smsListener = null;

/**
 * Request SMS permissions on Android
 */
export const requestSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission Required',
        message:
          'This app needs access to your SMS messages to automatically detect bank transaction alerts and add them to your income tracker.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    const receiveGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'Receive SMS Permission Required',
        message:
          'This app needs permission to receive SMS messages in real-time to automatically track your income.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return (
      granted === PermissionsAndroid.RESULTS.GRANTED &&
      receiveGranted === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn('SMS permission error:', err);
    return false;
  }
};

/**
 * Check if SMS permissions are granted
 */
export const checkSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const readGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    const receiveGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
    );

    return readGranted && receiveGranted;
  } catch (err) {
    console.warn('SMS permission check error:', err);
    return false;
  }
};

/**
 * Start listening for incoming SMS messages
 * @param {string} userName - User's bank alert name for better parsing
 * @param {function} onTransactionDetected - Callback when a transaction is detected
 */
export const startSMSListener = async (userName, onTransactionDetected) => {
  if (Platform.OS !== 'android') {
    console.log('SMS listener only works on Android');
    return false;
  }

  // Check if already listening
  if (smsListener) {
    console.log('SMS listener already active');
    return true;
  }

  // Request permission if not granted
  const hasPermission = await checkSMSPermission();
  if (!hasPermission) {
    const granted = await requestSMSPermission();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'SMS permissions are required to automatically detect bank alerts. Please grant permissions in app settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  try {
    // Start listening for SMS
    smsListener = SmsAndroid.addListener((message) => {
      if (__DEV__) {
        console.log('SMS received:', {
          originatingAddress: message.originatingAddress,
          body: message.body,
        });
      }

      // Parse the SMS message for bank alert
      const transactionData = parseBankAlert(message.body, userName);

      if (transactionData) {
        if (__DEV__) {
          console.log('Bank alert detected:', transactionData);
        }

        // Only process income transactions (reject debits/expenses)
        if (transactionData.type === 'expense') {
          if (__DEV__) {
            console.log('Debit transaction detected, skipping:', transactionData.amount);
          }
          return;
        }

        // Notify the app about the detected transaction
        if (onTransactionDetected) {
          onTransactionDetected(transactionData, message);
        }
      }
    });

    console.log('SMS listener started successfully');
    return true;
  } catch (error) {
    console.error('Failed to start SMS listener:', error);
    Alert.alert('Error', 'Failed to start SMS listener: ' + error.message);
    return false;
  }
};

/**
 * Stop listening for SMS messages
 */
export const stopSMSListener = () => {
  if (smsListener) {
    smsListener.remove();
    smsListener = null;
    console.log('SMS listener stopped');
  }
};

/**
 * Automatically create transaction from detected bank alert
 * @param {object} transactionData - Parsed transaction data
 */
export const createTransactionFromSMS = async (transactionData) => {
  try {
    if (__DEV__) {
      console.log('Creating transaction from SMS:', transactionData);
    }

    const createdTransaction = await api.createTransaction(transactionData);

    if (__DEV__) {
      console.log('Transaction created successfully:', createdTransaction);
    }

    return createdTransaction;
  } catch (error) {
    console.error('Failed to create transaction from SMS:', error);
    throw error;
  }
};
