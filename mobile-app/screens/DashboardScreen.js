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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { parseBankAlert } from '../services/bankAlertParser';
import api from '../services/api';
import {
  calculateTax,
  calculateNetIncome,
  formatCurrency,
  getTaxBracket,
} from '../services/taxCalculator';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);

      const transactionsData = await api.getTransactions();
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
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

      // Parse the bank alert text
      const transactionData = parseBankAlert(response.text);

      if (!transactionData) {
        Alert.alert(
          'Could Not Parse',
          'Could not parse transaction details from the image. Please add it manually via the web app.'
        );
        setLoading(false);
        return;
      }

      // Create the transaction automatically
      await api.createTransaction(transactionData);

      // Reload transactions
      await loadData();

      Alert.alert(
        'Success!',
        `${transactionData.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(transactionData.amount)} added successfully!`,
        [{ text: 'OK' }]
      );

      setLoading(false);
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to process image: ' + error.message);
      setLoading(false);
    }
  };

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const annualIncome = totalIncome;
  const taxAmount = calculateTax(annualIncome);
  const netIncome = calculateNetIncome(annualIncome);
  const taxRate = getTaxBracket(annualIncome);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                    transaction.type === 'income'
                      ? styles.incomeAmount
                      : styles.expenseAmount,
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
    paddingTop: 40,
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  largeAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  taxBracket: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taxCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  netCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  recentTransactions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
});
