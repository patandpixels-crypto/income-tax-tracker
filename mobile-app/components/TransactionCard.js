import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/taxCalculator';

export default function TransactionCard({ transaction, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{transaction.date}</Text>
        <Text style={styles.amount}>{formatCurrency(transaction.amount)}</Text>
      </View>

      <Text style={styles.description}>{transaction.description}</Text>

      <View style={styles.footer}>
        <Text style={styles.bank}>{transaction.bank}</Text>
        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(transaction.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bank: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  deleteButton: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
  },
});
