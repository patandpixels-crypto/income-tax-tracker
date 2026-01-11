// Nigerian Tax Brackets - Progressive Taxation
const TAX_BRACKETS = [
  { limit: 800000, rate: 0 },
  { limit: 3000000, rate: 0.15 },
  { limit: 12000000, rate: 0.18 },
  { limit: 25000000, rate: 0.21 },
  { limit: 50000000, rate: 0.23 },
  { limit: Infinity, rate: 0.25 },
];

export function calculateTax(income) {
  if (income <= 0) return 0;

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    if (income <= bracket.limit) {
      tax += Math.max(0, income - previousLimit) * bracket.rate;
      break;
    } else {
      tax += (bracket.limit - previousLimit) * bracket.rate;
      previousLimit = bracket.limit;
    }
  }
  return tax;
}

export function calculateNetIncome(grossIncome) {
  const tax = calculateTax(grossIncome);
  return grossIncome - tax;
}

export function formatCurrency(amount) {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateMonthlyTax(annualIncome) {
  const annualTax = calculateTax(annualIncome);
  return annualTax / 12;
}

export function getEffectiveRate(income) {
  if (income <= 0) return 0;
  const tax = calculateTax(income);
  return (tax / income) * 100;
}
