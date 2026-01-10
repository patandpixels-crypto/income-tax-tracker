// Nigerian Tax Brackets for 2024
const TAX_BRACKETS = [
  { min: 0, max: 300000, rate: 0.07, deduction: 0 },
  { min: 300000, max: 600000, rate: 0.11, deduction: 12000 },
  { min: 600000, max: 1100000, rate: 0.15, deduction: 36000 },
  { min: 1100000, max: 1600000, rate: 0.19, deduction: 80000 },
  { min: 1600000, max: 3200000, rate: 0.21, deduction: 112000 },
  { min: 3200000, max: Infinity, rate: 0.24, deduction: 208000 },
];

export function calculateTax(grossIncome) {
  if (grossIncome <= 0) return 0;

  // Find the applicable tax bracket
  const bracket = TAX_BRACKETS.find(
    (b) => grossIncome > b.min && grossIncome <= b.max
  );

  if (!bracket) return 0;

  // Calculate tax: (Income × Rate) - Deduction
  const tax = grossIncome * bracket.rate - bracket.deduction;
  return Math.max(0, tax);
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

export function getTaxBracket(income) {
  const bracket = TAX_BRACKETS.find(
    (b) => income > b.min && income <= b.max
  );
  return bracket ? bracket.rate * 100 : 0;
}
