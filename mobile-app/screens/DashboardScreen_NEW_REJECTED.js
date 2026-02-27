import React, { useState, useEffect, useCallback } from 'react';
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
import {
  startSMSListener,
  stopSMSListener,
  requestSMSPermission,
} from '../services/smsListener';
import { colors, spacing, typography, shadows, borderRadius } from '../theme';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [bankAlertName, setBankAlertName] = useState('');
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(false);
  const [smsListenerActive, setSmsListenerActive] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  useEffect(() => {
    loadUser();
    loadTransactions();
    if (Platform.OS === 'android') {
      checkSMSPermission();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && smsPermissionGranted && user?.bankAlertName) {
      startSMSAutoDetection();
    }
    return () => {
      if (Platform.OS === 'android' && smsListenerActive) {
        stopSMSListener();
      }
    };
  }, [smsPermissionGranted, user]);

  const checkSMSPermission = async () => {
    try {
      const granted = await requestSMSPermission();
      setSmsPermissionGranted(granted);
    } catch (error) {
      console.error('SMS permission error:', error);
    }
  };

  const startSMSAutoDetection = async () => {
    try {
      await startSMSListener(user.bankAlertName, handleTransactionDetected);
      setSmsListenerActive(true);
    } catch (error) {
      console.error('SMS listener error:', error);
    }
  };

  const handleTransactionDetected = async (transactionData) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        `Detected: ${formatCurrency(transactionData.amount)}`,
        ToastAndroid.SHORT
      );
    }

    try {
      const result = await api.createTransaction(transactionData);
      if (result.success) {
        Alert.alert('Success', `Transaction of ${formatCurrency(transactionData.amount)} added!`);
        loadTransactions();
      }
    } catch (error) {
      console.error('Create transaction error:', error);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const result = await api.getTransactions();
      if (result.success) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      if (Platform.OS === 'android' && smsListenerActive) {
        stopSMSListener();
      }
      navigation.replace('Auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveBankName = async () => {
    try {
      const result = await api.updateBankAlertName(bankAlertName);
      if (result.success) {
        setUser(result.user);
        setShowNameInput(false);
        Alert.alert('Success', 'Bank alert name saved!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save name');
    }
  };

  const handleUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (result.canceled) return;

      setLoading(true);
      const imageUri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const extractResult = await api.extractTextFromImage(base64, 'image/jpeg');

      if (extractResult.success && extractResult.text) {
        const parsed = parseBankAlert(extractResult.text, user?.bankAlertName);

        if (parsed) {
          Alert.alert(
            'Transaction Detected',
            `Amount: ${formatCurrency(parsed.amount)}\nType: ${parsed.type}\n\nAdd this transaction?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Add',
                onPress: async () => {
                  try {
                    await api.createTransaction(parsed);
                    loadTransactions();
                    Alert.alert('Success', 'Transaction added!');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to create transaction');
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Could not extract transaction from image');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to process image');
      setLoading(false);
    }
  };

  const handleClassify = async (id, taxCategory, incomeType) => {
    try {
      const result = await api.classifyTransaction(id, taxCategory, incomeType);
      if (result.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, taxCategory: result.transaction.taxCategory, incomeType: result.transaction.incomeType }
              : t
          )
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to classify transaction');
    }
  };

  const handleExportCSV = async () => {
    try {
      if (transactions.length === 0) {
        Alert.alert('No Data', 'There are no transactions to export.');
        return;
      }

      let csv = 'Date,Amount,Description,Tax Category,Income Type,Bank\n';
      transactions.forEach((t) => {
        const desc = (t.description || '').replace(/"/g, '""');
        const taxCat = t.taxCategory || 'unclassified';
        const incType = t.incomeType || 'other';
        const bank = t.bank || '';
        csv += `${t.date},${t.amount},"${desc}",${taxCat},${incType},${bank}\n`;
      });

      const fileUri = `${FileSystem.documentDirectory}income-tax-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'CSV saved to ' + fileUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV');
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
  const unclassifiedIncome = transactions
    .filter((t) => !t.taxCategory || t.taxCategory === 'unclassified')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const unclassifiedCount = transactions.filter(
    (t) => !t.taxCategory || t.taxCategory === 'unclassified'
  ).length;

  const taxAmount = calculateTax(taxableIncome);
  const netIncome = totalIncome - taxAmount;
  const taxRate = getEffectiveRate(taxableIncome);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>TAX YEAR 2026</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Dark Income Card */}
        <View style={styles.darkIncomeCard}>
          <Text style={styles.darkCardLabel}>💵 GROSS TAXABLE INCOME</Text>
          <Text style={styles.darkCardAmount}>{formatCurrency(taxableIncome)}</Text>
          <View style={styles.complianceRow}>
            <Text style={styles.complianceText}>● Compliance status</Text>
            <TouchableOpacity style={styles.taxBreakdownButton} onPress={() => setShowTaxBreakdown(true)}>
              <Text style={styles.taxBreakdownText}>View Tax Breakdown →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Income Reconciliation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income Reconciliation</Text>

          <View style={styles.reconciliationCard}>
            <View style={styles.reconciliationRow}>
              <View style={styles.reconciliationIcon}>
                <Text style={styles.iconText}>💵</Text>
              </View>
              <View style={styles.reconciliationContent}>
                <Text style={styles.reconciliationLabel}>Total Credits Received</Text>
                <Text style={styles.reconciliationSubtext}>All incoming payments</Text>
              </View>
              <Text style={styles.reconciliationAmount}>{formatCurrency(totalIncome)}</Text>
            </View>
          </View>

          <View style={styles.reconciliationCard}>
            <View style={styles.reconciliationRow}>
              <View style={styles.reconciliationIcon}>
              </View>
              <View style={styles.reconciliationContent}>
                <Text style={styles.reconciliationLabel}>Less: Non-tax</Text>
                <Text style={styles.reconciliationSubtext}>Excluded from tax calc</Text>
              </View>
              <Text style={[styles.reconciliationAmount, { color: colors.error }]}>-{formatCurrency(nonTaxableIncome)}</Text>
            </View>
          </View>

          {unclassifiedIncome > 0 && (
            <View style={styles.reconciliationCard}>
              <View style={styles.reconciliationRow}>
                <View style={styles.reconciliationIcon}>
                  <Text style={styles.iconText}>❓</Text>
                </View>
                <View style={styles.reconciliationContent}>
                  <Text style={styles.reconciliationLabel}>Less: Unclassified</Text>
                  <Text style={styles.reconciliationSubtext}>Needs review ({unclassifiedCount} items)</Text>
                </View>
                <Text style={[styles.reconciliationAmount, { color: colors.warning }]}>-{formatCurrency(unclassifiedIncome)}</Text>
              </View>
            </View>
          )}

          <View style={[styles.reconciliationCard, styles.totalCard]}>
            <View style={styles.reconciliationRow}>
              <View style={styles.reconciliationContent}>
                <Text style={styles.totalLabel}>GROSS TAXABLE INCOME</Text>
              </View>
              <Text style={styles.totalAmount}>{formatCurrency(taxableIncome)}</Text>
            </View>
          </View>
        </View>

        {/* Unclassified Warning */}
        {unclassifiedCount > 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ {unclassifiedCount} transaction{unclassifiedCount !== 1 ? 's' : ''} need classification
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUploadImage}>
            <Text style={styles.actionButtonText}>📸 Upload Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleExportCSV}>
            <Text style={styles.actionButtonTextSecondary}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((transaction, index) => (
              <View key={transaction.id || index} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionIcon}>
                      {transaction.taxCategory === 'non_taxable' ? '🛡️' : transaction.taxCategory === 'taxable' ? '💵' : '❓'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transactionDesc} numberOfLines={1}>
                        {transaction.description || '—'}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {transaction.date && !isNaN(new Date(transaction.date).getTime())
                          ? new Date(transaction.date).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
                </View>

                {/* Tax Badge */}
                {transaction.taxCategory === 'taxable' && (
                  <View style={styles.badgeContainer}>
                    <View style={styles.badgeTaxable}>
                      <Text style={styles.badgeTextGreen}>✓ Taxable</Text>
                    </View>
                  </View>
                )}
                {transaction.taxCategory === 'non_taxable' && (
                  <View style={styles.badgeContainer}>
                    <View style={styles.badgeNonTaxable}>
                      <Text style={styles.badgeTextBlue}>✓ Non-Taxable</Text>
                    </View>
                  </View>
                )}

                {/* Classify Buttons */}
                {(!transaction.taxCategory || transaction.taxCategory === 'unclassified') && (
                  <View style={styles.classifyButtons}>
                    <TouchableOpacity
                      style={styles.classifyBtn}
                      onPress={() => handleClassify(transaction.id, 'non_taxable', 'gift')}
                    >
                      <Text style={styles.classifyBtnText}>Gift</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.classifyBtn}
                      onPress={() => handleClassify(transaction.id, 'non_taxable', 'loan')}
                    >
                      <Text style={styles.classifyBtnText}>Loan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.classifyBtn}
                      onPress={() => handleClassify(transaction.id, 'taxable', 'salary')}
                    >
                      <Text style={styles.classifyBtnText}>💼 Pay</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>💳</Text>
          <Text style={styles.navLabel}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navLabel}>Tax Tools</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Tax Breakdown Modal */}
      <Modal visible={showTaxBreakdown} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tax Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Taxable Income</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(taxableIncome)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tax Owed</Text>
              <Text style={[styles.breakdownValue, { color: colors.error }]}>{formatCurrency(taxAmount)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Net Income</Text>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>{formatCurrency(netIncome)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Effective Rate</Text>
              <Text style={styles.breakdownValue}>{taxRate.toFixed(2)}%</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTaxBreakdown(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Name Modal */}
      <Modal visible={showNameInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Bank Alert Name</Text>
            <Text style={styles.modalSubtitle}>
              Enter your name exactly as it appears on your bank alerts
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., PATRICK CHIDOZIE"
              value={bankAlertName}
              onChangeText={setBankAlertName}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowNameInput(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveBankName}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  greeting: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  logoutButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error,
  },
  logoutText: {
    ...typography.bodyBold,
    color: colors.textLight,
  },
  darkIncomeCard: {
    backgroundColor: colors.cardDark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  darkCardLabel: {
    ...typography.small,
    color: '#A0AEC0',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  darkCardAmount: {
    ...typography.h1,
    fontSize: 36,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceText: {
    ...typography.caption,
    color: '#A0AEC0',
  },
  taxBreakdownButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  taxBreakdownText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  reconciliationCard: {
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  reconciliationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reconciliationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  reconciliationContent: {
    flex: 1,
  },
  reconciliationLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  reconciliationSubtext: {
    ...typography.small,
    color: colors.textSecondary,
  },
  reconciliationAmount: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  totalCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  totalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  totalAmount: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  warningBanner: {
    backgroundColor: '#FFF7ED',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    ...typography.caption,
    color: '#C2410C',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  actionButtonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.bodyBold,
    color: colors.textLight,
  },
  actionButtonTextSecondary: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  transactionCard: {
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  transactionDesc: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  transactionDate: {
    ...typography.small,
    color: colors.textSecondary,
  },
  transactionAmount: {
    ...typography.h3,
    color: colors.primary,
  },
  badgeContainer: {
    marginTop: spacing.sm,
  },
  badgeTaxable: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeTextGreen: {
    ...typography.small,
    color: '#15803D',
    fontWeight: '600',
  },
  badgeNonTaxable: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeTextBlue: {
    ...typography.small,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  classifyButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  classifyBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classifyBtnText: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    ...shadows.lg,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    marginBottom: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  breakdownValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.border,
  },
  modalCancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    ...typography.bodyBold,
    color: colors.textLight,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalCloseText: {
    ...typography.bodyBold,
    color: colors.textLight,
  },
});
