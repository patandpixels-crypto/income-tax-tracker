// Nigerian tax calculation utility

const TAX_BRACKETS = [
  { min: 0, max: 300000, rate: 0.07 },
  { min: 300000, max: 600000, rate: 0.11 },
  { min: 600000, max: 1100000, rate: 0.15 },
  { min: 1100000, max: 1600000, rate: 0.19 },
  { min: 1600000, max: 3200000, rate: 0.21 },
  { min: 3200000, max: Infinity, rate: 0.24 },
];

export function calculateTax(income) {
  if (income <= 0) return 0;

  let tax = 0;
  let remainingIncome = income;

  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break;

    const bracketSize = bracket.max - bracket.min;
    const taxableInThisBracket = Math.min(remainingIncome, bracketSize);

    tax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }

  return tax;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function calculateTaxSummary(transactions) {
  const totalIncome = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const annualIncome = totalIncome; // Already annual based on tracking
  const estimatedTax = calculateTax(annualIncome);
  const netIncome = annualIncome - estimatedTax;
  const effectiveRate = annualIncome > 0 ? (estimatedTax / annualIncome) * 100 : 0;

  return {
    totalIncome,
    annualIncome,
    estimatedTax,
    netIncome,
    effectiveRate,
  };
}
