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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { parseBankAlert } from '../services/bankAlertParser';
import api from '../services/api';
import {
  calculateTax,
  calculateNetIncome,
  formatCurrency,
  getEffectiveRate,
} from '../services/taxCalculator';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);

      const response = await api.getTransactions();
      console.log('API Response:', response);

      // Handle response format: {success: true, transactions: [...]}
      const transactionsData = response.transactions || response;
      console.log('Transactions data:', transactionsData);
      console.log('Number of transactions:', transactionsData?.length);

      const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
      setTransactions(transactionsArray);

      console.log('Transactions set to state:', transactionsArray.length);
    } catch (error) {
      console.error('Error loading data:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          navigation.replace('Welcome');
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
      setShowNameInput(false);
      Alert.alert('Success', 'Bank alert name saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save name: ' + error.message);
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
        mediaTypes: ['images'],
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
      console.log('Using bank alert name:', userName);

      const transactionData = parseBankAlert(response.text, userName);

      console.log('Extracted text:', response.text);
      console.log('Parsed transaction:', transactionData);

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
                console.log('Creating transaction:', transactionData);
                const createdTransaction = await api.createTransaction(transactionData);
                console.log('Transaction created:', createdTransaction);

                // Reload transactions
                console.log('Reloading transactions...');
                await loadData();
                console.log('Transactions reloaded');

                Alert.alert(
                  'Success!',
                  `Income of ${formatCurrency(transactionData.amount)} added successfully!`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Create transaction error:', error);
                Alert.alert('Error', 'Failed to create transaction: ' + error.message);
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

  // Calculate totals
  // Treat transactions without type as income (default behavior)
  const incomeTransactions = transactions.filter((t) => !t.type || t.type === 'income');
  console.log('Income transactions:', incomeTransactions);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  console.log('Total income calculated:', totalIncome);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const annualIncome = totalIncome;
  const taxAmount = calculateTax(annualIncome);
  const netIncome = calculateNetIncome(annualIncome);
  const taxRate = getEffectiveRate(annualIncome);

  if (loading) {
    return (
      <LinearGradient
        colors={['#4338CA', '#2D1B69']}
        style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4338CA', '#2D1B69']}
      style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Annual Income</Text>
          <Text style={styles.largeAmount}>{formatCurrency(annualIncome)}</Text>
          <Text style={styles.taxBracket}>Tax Bracket: {taxRate}%</Text>
        </View>

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
            <Text style={styles.statIcon}>💰</Text>
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

          <View style={[styles.statCard, styles.expenseCard]}>
            <Text style={styles.statIcon}>📉</Text>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statAmount}>{formatCurrency(totalExpenses)}</Text>
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
            onPress={handleExportCSV}
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📱 SMS Bank Alert Feature</Text>
          <Text style={styles.infoText}>
            The automatic SMS detection feature will be available in the production
            app. It will automatically detect bank transaction alerts and add them to
            your income tracker.
          </Text>
        </View>

        <View style={styles.recentTransactions}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Use the web app to add income and expenses
              </Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionIcon}>
                    {transaction.type === 'income' ? '💵' : '💳'}
                  </Text>
                  <View>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    styles.incomeAmount,
                  ]}
                >
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
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
    </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4338CA',
    paddingTop: 50,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: 'rgba(91, 33, 182, 0.3)',
    margin: 16,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 12,
    fontWeight: '600',
  },
  largeAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  taxBracket: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  taxCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  netCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  incomeCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  expenseCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 6,
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FBBF24',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    lineHeight: 22,
  },
  recentTransactions: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  setBankNameButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  setBankNameText: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: '700',
    textAlign: 'center',
  },
  bankNameDisplay: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    margin: 16,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankNameLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  editNameText: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(91, 33, 182, 0.95)',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalSaveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
