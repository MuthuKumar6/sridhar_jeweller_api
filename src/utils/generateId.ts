export const genId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

// export const genOrderNumber = (count: number): string => `ORD-${String(count + 1).padStart(4, '0')}`;
export const genOrderNumber = async (
  connection: any,
  shopId: string,
  customerId: string
): Promise<string> => {

  const currentYear = new Date().getFullYear();
  const financialYear = (currentYear % 100).toString().padStart(2, '0'); // e.g., 26 for 2026

  // Generate short codes
  const customerCode = customerId.substring(0, 3).toUpperCase();
  const shopCode = shopId.substring(0, 2).toUpperCase(); // e.g., SJ

  // Get next sequence number for this combination (shop + customer code + financial year)
  const [result] = await connection.execute(
    `SELECT COUNT(*) as cnt 
     FROM orders 
     WHERE shop_id = ? 
       AND order_number LIKE ?`,
    [shopId, `ORD-${customerCode}-${shopCode}-${financialYear}-%`]
  );

  const count = (result as any)[0].cnt;
  const sequence = (count + 1).toString().padStart(6, '0');

  return `ORD-${customerCode}-${shopCode}-${financialYear}-${sequence}`;
};

// export const genBillNumber = (count: number): string => `BILL-${String(count + 1).padStart(4, '0')}`;

// ==================== NEW BILL NUMBER GENERATOR ====================
export const genBillNumber = async (
  connection: any,
  shopId: string,
  customerId: string
): Promise<string> => {

  const currentYear = new Date().getFullYear();
  const financialYear = (currentYear % 100).toString().padStart(2, '0');

  const customerCode = customerId.substring(0, 3).toUpperCase();
  const shopCode = shopId.substring(0, 2).toUpperCase();

  const [result] = await connection.execute(
    `SELECT COUNT(*) as cnt 
     FROM bills 
     WHERE shop_id = ? 
       AND bill_number LIKE ?`,
    [shopId, `BILL-${customerCode}-${shopCode}-${financialYear}-%`]
  );

  const count = (result as any)[0].cnt;
  const sequence = (count + 1).toString().padStart(6, '0');

  return `BILL-${customerCode}-${shopCode}-${financialYear}-${sequence}`;
};