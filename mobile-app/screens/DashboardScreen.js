import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  ToastAndroid,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseBankAlert } from '../services/bankAlertParser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  calculateTax,
  calculateNetIncome,
  formatCurrency,
  getEffectiveRate,
} from '../services/taxCalculator';
import {
  startSMSListener,
  stopSMSListener,
  requestSMSPermission,
  checkSMSPermission,
  createTransactionFromSMS,
} from '../services/smsListener';
import { colors, spacing, typography, borderRadius } from '../theme';

export default function DashboardScreen({ navigation }) {
  const { user: authUser, logout: authLogout, updateUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState('');
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false);
  const [smsListenerActive, setSmsListenerActive] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  // Sync local user state with auth context
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        console.log('[Dashboard] Starting loadData...');

        // Fetch fresh user data
        console.log('[Dashboard] Fetching user data...');
        const userData = await api.getCurrentUser();

        if (!userData) {
          console.log('[Dashboard] No user data returned');
          throw new Error('Unable to load user data');
        }

        console.log('[Dashboard] User data loaded successfully:', userData.email);
        if (isMounted) {
          setUser(userData);
          updateUser(userData); // Update auth context
        }

        // Fetch transactions
        console.log('[Dashboard] Fetching transactions...');
        const response = await api.getTransactions();
        if (__DEV__) console.log('[Dashboard] API Response:', response);

        const transactionsData = response.transactions || response;
        if (__DEV__) {
          console.log('[Dashboard] Transactions data:', transactionsData);
          console.log('[Dashboard] Number of transactions:', transactionsData?.length);
        }

        const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
        if (isMounted) {
          setTransactions(transactionsArray);
        }

        console.log('[Dashboard] Data loaded successfully. Transactions:', transactionsArray.length);
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error.message);
        console.error('[Dashboard] Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          isTimeout: error.code === 'ECONNABORTED',
          isNetworkError: !error.response,
        });

        // If authentication error, logout via context (which will trigger navigation)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.log('[Dashboard] Authentication error, logging out');
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please login again.',
            [{ text: 'OK', onPress: () => authLogout() }]
          );
          return;
        }

        // For other errors, try to use cached data
        console.warn('[Dashboard] Non-auth error, attempting to load cached data...');
        try {
          const cachedUserStr = await AsyncStorage.getItem('userData');
          if (cachedUserStr && isMounted) {
            const cachedUser = JSON.parse(cachedUserStr);
            console.log('[Dashboard] Loaded cached user data:', cachedUser.email);
            setUser(cachedUser);
          }
        } catch (cacheError) {
          console.error('[Dashboard] Failed to load cached user data:', cacheError);
        }

        // Set empty transactions on error
        if (isMounted) {
          setTransactions([]);
        }

        // Show error alert
        Alert.alert(
          'Connection Error',
          'Unable to load your data. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => loadData() },
            { text: 'Logout', style: 'destructive', onPress: () => authLogout() }
          ]
        );
      } finally {
        console.log('[Dashboard] Setting loading to false');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize SMS listener
  useEffect(() => {
    const initializeSMSListener = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      // Check if permissions are granted
      const hasPermission = await checkSMSPermission();
      setSmsPermissionGranted(hasPermission);

      if (hasPermission && user?.bankAlertName) {
        // Start SMS listener
        const started = await startSMSListener(
          user.bankAlertName,
          handleTransactionDetected
        );
        setSmsListenerActive(started);
      }
    };

    if (user) {
      initializeSMSListener();
    }

    // Cleanup: Stop SMS listener when component unmounts
    return () => {
      stopSMSListener();
      setSmsListenerActive(false);
    };
  }, [user?.bankAlertName]);

  // Handle detected transaction from SMS
  const handleTransactionDetected = async (transactionData, message) => {
    try {
      console.log('[SMS] Transaction detected from bank alert:', transactionData);

      // Show toast notification
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Income detected: ${formatCurrency(transactionData.amount)}`,
          ToastAndroid.LONG
        );
      }

      // Create transaction automatically
      console.log('[SMS] Creating transaction from SMS...');
      await createTransactionFromSMS(transactionData);
      console.log('[SMS] Transaction created successfully');

      // Reload transactions to show the new one
      console.log('[SMS] Reloading transactions from server...');
      const response = await api.getTransactions();
      const transactionsData = response.transactions || response;
      const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
      console.log('[SMS] Transactions reloaded, count:', transactionsArray.length);
      setTransactions(transactionsArray);

      // Show success alert
      Alert.alert(
        'Income Added!',
        `${formatCurrency(transactionData.amount)} from ${transactionData.bank} has been automatically added to your income tracker.`,
        [{ text: 'OK' }]
      );
      console.log('[SMS] Transaction successfully added via SMS');
    } catch (error) {
      console.error('[SMS] Failed to handle detected transaction:', error);
      console.error('[SMS] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      Alert.alert(
        'Error',
        `Failed to automatically add transaction: ${errorMsg}`
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[Dashboard] Refreshing data...');

      const userData = await api.getCurrentUser();
      if (userData) {
        setUser(userData);
        updateUser(userData); // Update auth context
      }

      const response = await api.getTransactions();
      const transactionsData = response.transactions || response;
      const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
      setTransactions(transactionsArray);

      console.log('[Dashboard] Refresh complete');
    } catch (error) {
      console.error('[Dashboard] Error during refresh:', error.message);

      // If auth error, logout via context
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => authLogout() }]
        );
      } else {
        // For other errors, just show a brief alert
        Alert.alert('Error', 'Failed to refresh data. Please try again.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setIsNavigatingAway(true);
          await authLogout();
          // Navigation will happen automatically via AuthContext
        },
      },
    ]);
  };

  const handleSaveBankAlertName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Please enter your name as it appears on bank alerts');
      return;
    }

    try {
      await api.updateBankAlertName(tempName);
      const updatedUser = await api.getCurrentUser();
      setUser(updatedUser);
      updateUser(updatedUser); // Update auth context
      setShowNameInput(false);
      Alert.alert('Success', 'Bank alert name saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save name: ' + error.message);
    }
  };

  const handleClassify = async (id, taxCategory, incomeType) => {
    try {
      if (!id) {
        console.error('[Classify] Transaction ID is missing');
        Alert.alert('Error', 'Transaction ID is missing. Please refresh and try again.');
        return;
      }

      console.log('[Classify] Classifying transaction:', { id, taxCategory, incomeType });
      const result = await api.classifyTransaction(id, taxCategory, incomeType);
      console.log('[Classify] API response:', result);

      if (result.success) {
        // Update local state
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, taxCategory: result.transaction.taxCategory, incomeType: result.transaction.incomeType }
              : t
          )
        );

        // Show success feedback
        const categoryLabel = taxCategory === 'taxable' ? 'Taxable' : 'Non-Taxable';
        const typeLabel = incomeType === 'gift' ? 'Gift' : incomeType === 'loan' ? 'Loan' : incomeType === 'salary' ? 'Salary' : incomeType;

        if (Platform.OS === 'android') {
          ToastAndroid.show(`✓ Classified as ${categoryLabel} (${typeLabel})`, ToastAndroid.SHORT);
        } else {
          Alert.alert('Success', `Transaction classified as ${categoryLabel} (${typeLabel})`);
        }

        console.log('[Classify] Transaction classified successfully');
      } else {
        console.error('[Classify] API returned success: false');
        Alert.alert('Error', 'Failed to classify transaction. Please try again.');
      }
    } catch (error) {
      console.error('[Classify] Error:', error);
      console.error('[Classify] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMsg = error.response?.data?.error || error.message || 'Failed to classify transaction';
      Alert.alert('Error', errorMsg);
    }
  };

  const handleExportCSV = async () => {
    try {
      if (transactions.length === 0) {
        Alert.alert('No Data', 'There are no transactions to export.');
        return;
      }

      // Generate CSV content
      let csv = 'Date,Amount,Description,Type,Bank\n';
      transactions.forEach((t) => {
        const desc = (t.description || '').replace(/"/g, '""');
        const type = t.type || 'income';
        const bank = t.bank || '';
        csv += `${t.date},${t.amount},"${desc}",${type},${bank}\n`;
      });

      // Save to file
      const fileUri = `${FileSystem.documentDirectory}income-tax-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Alert.alert('Success', 'CSV file exported successfully!');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export CSV: ' + error.message);
    }
  };

  const handleUploadImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload bank alerts.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      setLoading(true);

      // Extract text from image
      const image = result.assets[0];
      const response = await api.extractTextFromImage(
        image.base64,
        image.mimeType || 'image/jpeg'
      );

      if (!response.text) {
        Alert.alert('No Text Found', 'Could not extract text from the image.');
        setLoading(false);
        return;
      }

      // Parse the bank alert text with user's bank alert name
      const userName = user?.bankAlertName || null;
      if (__DEV__) console.log('Using bank alert name:', userName);

      const transactionData = parseBankAlert(response.text, userName);

      if (__DEV__) {
        console.log('Extracted text:', response.text);
        console.log('Parsed transaction:', transactionData);
      }

      if (!transactionData) {
        Alert.alert(
          'Could Not Parse',
          'Could not parse transaction details from the image. Please add it manually via the web app.'
        );
        setLoading(false);
        return;
      }

      // Reject debit/expense transactions - this is an income tax calculator!
      if (transactionData.type === 'expense') {
        Alert.alert(
          'Debit Transaction Detected',
          `This appears to be a debit/withdrawal of ${formatCurrency(transactionData.amount)}.\n\nThis is an income tax calculator, so only income/credit transactions can be added.`,
          [{ text: 'OK', onPress: () => setLoading(false) }]
        );
        return;
      }

      // Show what was detected and ask for confirmation
      Alert.alert(
        'Income Detected',
        `Amount: ${formatCurrency(transactionData.amount)}\nBank: ${transactionData.bank}\nDescription: ${transactionData.description}\n\nAdd this income?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Add',
            onPress: async () => {
              try {
                // Create the transaction
                console.log('[AddTransaction] Creating transaction from image:', transactionData);
                const createdTransaction = await api.createTransaction(transactionData);
                console.log('[AddTransaction] Transaction created successfully:', createdTransaction);

                if (!createdTransaction || !createdTransaction.transaction) {
                  throw new Error('Invalid response from server');
                }

                // Reload transactions from server
                console.log('[AddTransaction] Reloading transactions from server...');
                const response = await api.getTransactions();
                console.log('[AddTransaction] Transactions response:', response);

                const transactionsData = response.transactions || response;
                const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
                console.log('[AddTransaction] Setting transactions, count:', transactionsArray.length);
                setTransactions(transactionsArray);

                Alert.alert(
                  'Success!',
                  `Income of ${formatCurrency(transactionData.amount)} added successfully!`,
                  [{ text: 'OK' }]
                );
                console.log('[AddTransaction] Transaction added and list updated successfully');
              } catch (error) {
                console.error('[AddTransaction] Error:', error);
                console.error('[AddTransaction] Error details:', {
                  message: error.message,
                  response: error.response?.data,
                  status: error.response?.status
                });

                const errorMsg = error.response?.data?.error || error.message || 'Failed to create transaction';
                Alert.alert('Error', `Failed to create transaction: ${errorMsg}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to process image: ' + error.message);
      setLoading(false);
    }
  };

  const handleUploadPDF = async () => {
    try {
      // Pick PDF document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const document = result.assets[0];

      if (!document.uri) {
        Alert.alert('Error', 'Could not access the selected file.');
        return;
      }

      setLoading(true);

      // Read the PDF file as base64
      const base64Data = await FileSystem.readAsStringAsync(document.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Extract transactions from PDF
      const response = await api.extractTextFromPDF(base64Data);

      if (!response.success || !response.transactions || response.transactions.length === 0) {
        Alert.alert(
          'No Income Found',
          'Could not find any income transactions in this bank statement. Please make sure it\'s a valid bank statement PDF with credit/income transactions.'
        );
        setLoading(false);
        return;
      }

      const extractedTransactions = response.transactions;
      const newTransactionsCount = extractedTransactions.filter(t => !t.isDuplicate).length;
      const duplicatesCount = extractedTransactions.filter(t => t.isDuplicate).length;

      // Show summary and ask for confirmation
      let message = `Found ${extractedTransactions.length} income transaction${extractedTransactions.length !== 1 ? 's' : ''} in the PDF.`;
      if (duplicatesCount > 0) {
        message += `\n\n${duplicatesCount} duplicate${duplicatesCount !== 1 ? 's' : ''} detected (already in your records).`;
      }
      if (newTransactionsCount > 0) {
        message += `\n\n${newTransactionsCount} new transaction${newTransactionsCount !== 1 ? 's' : ''} will be added.`;
      }
      message += '\n\nProceed with adding the new transactions?';

      Alert.alert(
        'PDF Processed Successfully',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Add New Transactions',
            onPress: async () => {
              try {
                // Filter out duplicates and add only new transactions
                const newTransactions = extractedTransactions.filter(t => !t.isDuplicate);

                if (newTransactions.length === 0) {
                  Alert.alert('All Duplicates', 'All transactions from this PDF are already in your records.');
                  setLoading(false);
                  return;
                }

                // Add all new transactions
                let successCount = 0;
                let failCount = 0;

                console.log('[PDFUpload] Adding', newTransactions.length, 'new transactions...');

                for (const transaction of newTransactions) {
                  try {
                    console.log('[PDFUpload] Creating transaction:', transaction);
                    const result = await api.createTransaction(transaction);
                    console.log('[PDFUpload] Transaction created:', result);
                    successCount++;
                  } catch (err) {
                    console.error('[PDFUpload] Failed to create transaction:', err);
                    console.error('[PDFUpload] Transaction data:', transaction);
                    failCount++;
                  }
                }

                console.log('[PDFUpload] Import complete. Success:', successCount, 'Failed:', failCount);

                // Reload transactions from server
                console.log('[PDFUpload] Reloading transactions from server...');
                const transactionsResponse = await api.getTransactions();
                const transactionsData = transactionsResponse.transactions || transactionsResponse;
                const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
                console.log('[PDFUpload] Transactions reloaded, count:', transactionsArray.length);
                setTransactions(transactionsArray);

                // Show result
                let resultMessage = `Successfully added ${successCount} transaction${successCount !== 1 ? 's' : ''}!`;
                if (failCount > 0) {
                  resultMessage += `\n\n${failCount} transaction${failCount !== 1 ? 's' : ''} failed to add.`;
                }

                Alert.alert('Import Complete', resultMessage);
              } catch (error) {
                console.error('Batch create error:', error);
                Alert.alert('Error', 'Failed to add transactions: ' + error.message);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('PDF upload error:', error);

      let errorMessage = 'Failed to process PDF.';
      if (error.message) {
        errorMessage += '\n\n' + error.message;
      }
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  // Calculate totals with tax classification
  const totalIncome = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const taxableIncome = transactions
    .filter((t) => t.taxCategory === 'taxable')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const nonTaxableIncome = transactions
    .filter((t) => t.taxCategory === 'non_taxable')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const unclassifiedCount = transactions.filter(
    (t) => !t.taxCategory || t.taxCategory === 'unclassified'
  ).length;

  const taxAmount = calculateTax(taxableIncome);
  const netIncome = totalIncome - taxAmount;
  const taxRate = getEffectiveRate(taxableIncome);

  if (loading || isNavigatingAway) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        {isNavigatingAway && (
          <Text style={styles.loadingText}>Redirecting to login...</Text>
        )}
      </LinearGradient>
    );
  }

  // If loading is done but we still don't have user data, show error state
  if (!loading && !user) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={styles.loadingContainer}
      >
        <Text style={styles.errorTitle}>Unable to Load Profile</Text>
        <Text style={styles.errorText}>
          Could not load your account information. Please check your internet connection.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            // Force re-mount by navigating away and back
            setTimeout(() => {
              navigation.replace('Dashboard');
            }, 100);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutLinkButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutLinkText}>Logout</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>📊 Executive Dashboard</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.cardTitle}>Annual Income</Text>
          <Text style={styles.largeAmount}>{formatCurrency(totalIncome)}</Text>
          <View style={styles.taxBracketBadge}>
            <Text style={styles.taxBracket}>Tax Bracket: {taxRate.toFixed(2)}%</Text>
          </View>
        </LinearGradient>

        {!user?.bankAlertName && (
          <TouchableOpacity
            style={styles.setBankNameButton}
            onPress={() => {
              setTempName('');
              setShowNameInput(true);
            }}
          >
            <Text style={styles.setBankNameText}>
              ⚠️ Set Your Bank Alert Name for Better Detection
            </Text>
          </TouchableOpacity>
        )}

        {user?.bankAlertName && (
          <View style={styles.bankNameDisplay}>
            <Text style={styles.bankNameLabel}>Bank Alert Name: {user.bankAlertName}</Text>
            <TouchableOpacity
              onPress={() => {
                setTempName(user.bankAlertName);
                setShowNameInput(true);
              }}
            >
              <Text style={styles.editNameText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.taxCard]}>
            <Text style={styles.statLabel}>Tax Owed</Text>
            <Text style={styles.statAmount}>{formatCurrency(taxAmount)}</Text>
          </View>

          <View style={[styles.statCard, styles.netCard]}>
            <Text style={styles.statIcon}>💵</Text>
            <Text style={styles.statLabel}>Net Income</Text>
            <Text style={styles.statAmount}>{formatCurrency(netIncome)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.incomeCard]}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statLabel}>Total Income</Text>
            <Text style={styles.statAmount}>{formatCurrency(totalIncome)}</Text>
          </View>

          <View style={[styles.statCard, styles.nonTaxableCard]}>
            <Text style={styles.statIcon}>🛡️</Text>
            <Text style={styles.statLabel}>Non-Taxable</Text>
            <Text style={styles.statAmount}>{formatCurrency(nonTaxableIncome)}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUploadImage}
          >
            <Text style={styles.actionButtonIcon}>📸</Text>
            <Text style={styles.actionButtonText}>Upload Bank Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUploadPDF}
          >
            <Text style={styles.actionButtonIcon}>📄</Text>
            <Text style={styles.actionButtonText}>Upload PDF Statement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportCSV}
          >
            <Text style={styles.actionButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'android' && (
          <View style={[
            styles.infoCard,
            smsListenerActive ? styles.infoCardSuccess : styles.infoCardWarning
          ]}>
            <Text style={styles.infoTitle}>
              {smsListenerActive ? 'SMS Auto-Detection Active' : '📱 SMS Bank Alert Feature'}
            </Text>
            {smsListenerActive ? (
              <Text style={styles.infoTextSuccess}>
                Your app is now automatically monitoring for bank transaction alerts!
                When you receive an income SMS, it will be automatically added to your tracker.
              </Text>
            ) : !smsPermissionGranted ? (
              <>
                <Text style={styles.infoText}>
                  Grant SMS permissions to automatically detect bank alerts and add income transactions.
                </Text>
                <TouchableOpacity
                  style={styles.enableSmsButton}
                  onPress={async () => {
                    const granted = await requestSMSPermission();
                    if (granted) {
                      setSmsPermissionGranted(true);
                      if (user?.bankAlertName) {
                        const started = await startSMSListener(
                          user.bankAlertName,
                          handleTransactionDetected
                        );
                        setSmsListenerActive(started);
                      }
                      Alert.alert(
                        'Success!',
                        'SMS permissions granted. The app will now automatically detect bank alerts.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Text style={styles.enableSmsButtonText}>Enable SMS Auto-Detection</Text>
                </TouchableOpacity>
              </>
            ) : !user?.bankAlertName ? (
              <Text style={styles.infoText}>
                Please set your bank alert name above to activate automatic SMS detection.
              </Text>
            ) : (
              <Text style={styles.infoText}>
                SMS permissions granted. Listener will start automatically.
              </Text>
            )}
          </View>
        )}

        <View style={styles.recentTransactions}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {unclassifiedCount > 0 && (
            <View style={styles.classifyBanner}>
              <Text style={styles.classifyBannerText}>
                ⚠️ {unclassifiedCount} transaction{unclassifiedCount !== 1 ? 's' : ''} need classification
              </Text>
            </View>
          )}
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Use the web app to add income and expenses
              </Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((transaction, index) => (
              <View key={transaction.id || transaction._id || index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionIcon}>
                    {transaction.taxCategory === 'non_taxable' ? '🛡️' : transaction.taxCategory === 'taxable' ? '💵' : '❓'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transactionDescription} numberOfLines={1}>
                      {transaction.description || '—'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={styles.transactionDate}>
                        {transaction.date && !isNaN(new Date(transaction.date).getTime())
                          ? new Date(transaction.date).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                      {transaction.taxCategory === 'taxable' && (
                        <View style={styles.badgeTaxable}><Text style={styles.badgeTextGreen}>Taxable</Text></View>
                      )}
                      {transaction.taxCategory === 'non_taxable' && (
                        <View style={styles.badgeNonTaxable}><Text style={styles.badgeTextBlue}>Non-Taxable</Text></View>
                      )}
                    </View>
                    {(!transaction.taxCategory || transaction.taxCategory === 'unclassified') && (
                      <View style={styles.classifyButtons}>
                        <TouchableOpacity style={styles.classifyBtn} onPress={() => handleClassify(transaction.id || transaction._id, 'non_taxable', 'gift')}>
                          <Text style={styles.classifyBtnText}>Gift</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.classifyBtn} onPress={() => handleClassify(transaction.id || transaction._id, 'non_taxable', 'loan')}>
                          <Text style={styles.classifyBtnText}>Loan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.classifyBtn} onPress={() => handleClassify(transaction.id || transaction._id, 'taxable', 'salary')}>
                          <Text style={styles.classifyBtnText}>💼 Pay</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.transactionAmount, styles.incomeAmount]}>
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showNameInput}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNameInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Bank Alert Name</Text>
            <Text style={styles.modalSubtitle}>
              Enter your name exactly as it appears on your bank alerts (e.g., PATRICK CHIDOZIE)
            </Text>
            <TextInput
              style={styles.modalInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="YOUR NAME"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowNameInput(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveBankAlertName}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutLinkButton: {
    paddingVertical: spacing.sm,
  },
  logoutLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecoration: 'underline',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    paddingTop: 50,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    margin: spacing.md,
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: '600',
    opacity: 0.9,
  },
  largeAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  taxBracketBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  taxBracket: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taxCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  netCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  nonTaxableCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.exempt,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.info,
  },
  infoCardSuccess: {
    borderColor: colors.success,
  },
  infoCardWarning: {
    borderColor: colors.warning,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoTextSuccess: {
    fontSize: 14,
    color: colors.success,
    lineHeight: 22,
  },
  enableSmsButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  enableSmsButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  recentTransactions: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.cardBackground,
    padding: spacing.xxl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: colors.success,
  },
  expenseAmount: {
    color: colors.error,
  },
  setBankNameButton: {
    backgroundColor: colors.cardBackground,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  setBankNameText: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '700',
    textAlign: 'center',
  },
  bankNameDisplay: {
    backgroundColor: colors.cardBackground,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  bankNameLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editNameText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 16,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  classifyBanner: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  classifyBannerText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  badgeTaxable: {
    backgroundColor: 'rgba(0, 214, 111, 0.1)',
    borderWidth: 1,
    borderColor: colors.taxable,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeTextGreen: {
    fontSize: 10,
    color: colors.taxable,
    fontWeight: '600',
  },
  badgeNonTaxable: {
    backgroundColor: 'rgba(76, 110, 245, 0.1)',
    borderWidth: 1,
    borderColor: colors.exempt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeTextBlue: {
    fontSize: 10,
    color: colors.exempt,
    fontWeight: '600',
  },
  classifyButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  classifyBtn: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  classifyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
