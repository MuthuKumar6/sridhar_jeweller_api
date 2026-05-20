export const genId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

export const genOrderNumber = (count: number): string => `ORD-${String(count + 1).padStart(4, '0')}`;
export const genBillNumber = (count: number): string => `BILL-${String(count + 1).padStart(4, '0')}`;