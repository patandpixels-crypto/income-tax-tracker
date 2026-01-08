import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, transactionAPI } from '../services/api';
import { calculateTaxSummary, formatCurrency } from '../utils/taxCalculator';
import smsReader from '../services/smsReader';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [taxSummary, setTaxSummary] = useState({
    totalIncome: 0,
    estimatedTax: 0,
    netIncome: 0,
    effectiveRate: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      const summary = calculateTaxSummary(transactions);
      setTaxSummary(summary);
    }
  }, [transactions]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }

      await loadTransactions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await transactionAPI.getAll();
      setTransactions(response.data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleScanSMS = async () => {
    try {
      // Request permissions first
      const hasPermission = await smsReader.requestPermissions();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'SMS permissions are required to scan bank alerts. Please grant permissions in Settings.'
        );
        return;
      }

      Alert.alert(
        'Scan Bank SMS',
        'This will scan your recent SMS messages for bank credit alerts and automatically add them. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Scan',
            onPress: async () => {
              setScanning(true);

              try {
                const results = await smsReader.scanAndImportTransactions(
                  user?.bank_alert_name || '',
                  (progress) => {
                    console.log('Progress:', progress);
                  }
                );

                Alert.alert(
                  'Scan Complete',
                  `Found ${results.total} bank SMS messages.\nImported: ${results.imported}\nSkipped: ${results.skipped}\nErrors: ${results.errors}`
                );

                // Reload transactions
                await loadTransactions();
              } catch (error) {
                console.error('Error scanning SMS:', error);
                Alert.alert('Error', 'Failed to scan SMS messages');
              } finally {
                setScanning(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionAPI.delete(id);
              await loadTransactions();
              Alert.alert('Success', 'Transaction deleted');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          router.replace('/');
        },
      },
    ]);
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDate}>{item.date}</Text>
        <Text style={styles.transactionAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      <Text style={styles.transactionDescription}>{item.description}</Text>
      <View style={styles.transactionFooter}>
        <Text style={styles.transactionBank}>{item.bank}</Text>
        <TouchableOpacity onPress={() => handleDeleteTransaction(item.id)}>
          <Text style={styles.deleteButton}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutButton}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* SMS Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={handleScanSMS}
          disabled={scanning}
        >
          <Text style={styles.scanButtonText}>
            {scanning ? '📱 Scanning SMS...' : '📱 Scan Bank SMS Alerts'}
          </Text>
          <Text style={styles.scanButtonSubtext}>
            Automatically import credit transactions
          </Text>
        </TouchableOpacity>

        {/* Tax Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.summaryValue}>{formatCurrency(taxSummary.totalIncome)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Estimated Tax</Text>
            <Text style={[styles.summaryValue, styles.taxValue]}>
              {formatCurrency(taxSummary.estimatedTax)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Net Income</Text>
            <Text style={[styles.summaryValue, styles.netValue]}>
              {formatCurrency(taxSummary.netIncome)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Effective Rate</Text>
            <Text style={styles.summaryValue}>{taxSummary.effectiveRate.toFixed(2)}%</Text>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Transactions ({transactions.length})</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Scan Bank SMS Alerts" to import your transactions
              </Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  logoutButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#8b5cf6',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#c4b5fd',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  scanButtonSubtext: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    margin: '1%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  taxValue: {
    color: '#ef4444',
  },
  netValue: {
    color: '#10b981',
  },
  transactionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionBank: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  deleteButton: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
