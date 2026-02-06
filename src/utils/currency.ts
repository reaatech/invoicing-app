// Currency formatting utility
export const formatCurrency = (amount: number | string | null | undefined): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numAmount);
};
