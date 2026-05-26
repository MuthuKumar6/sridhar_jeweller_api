// export const genId = (): string => {
//   return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// };

// //`BILL-${customerCode}-${shopCode}-${financialYear}-${sequence}`

// // export const genOrderNumber = (count: number): string => `ORD-${String(count + 1).padStart(4, '0')}`;
// export const genOrderNumber = async (
//   connection: any,
//   shopId: string,
//   customerId: string
// ): Promise<string> => {

//   const currentYear = new Date().getFullYear();
//   const financialYear = (currentYear % 100).toString().padStart(2, '0'); // e.g., 26 for 2026

//   // Generate short codes
//   const customerCode = customerId.substring(0, 3).toUpperCase();
//   const shopCode = shopId.substring(0, 2).toUpperCase(); // e.g., SJ

//   // Get next sequence number for this combination (shop + customer code + financial year)
//   const [result] = await connection.execute(
//     `SELECT COUNT(*) as cnt 
//      FROM orders 
//      WHERE shop_id = ? 
//        AND order_number LIKE ?`,
//     [shopId, `ORD-${customerCode}-${shopCode}-${financialYear}-%`]
//   );

//   const count = (result as any)[0].cnt;
//   const sequence = (count + 1).toString().padStart(6, '0');

//   return `ORD-${customerCode}-${shopCode}-${financialYear}-${sequence}`;
// };

// // export const genBillNumber = (count: number): string => `BILL-${String(count + 1).padStart(4, '0')}`;

// // ==================== NEW BILL NUMBER GENERATOR ====================
// export const genBillNumber = async (
//   connection: any,
//   shopId: string,
//   customerId: string
// ): Promise<string> => {

//   const currentYear = new Date().getFullYear();
//   const financialYear = (currentYear % 100).toString().padStart(2, '0');

//   const customerCode = customerId.substring(0, 3).toUpperCase();
//   const shopCode = shopId.substring(0, 2).toUpperCase();

//   const [result] = await connection.execute(
//     `SELECT COUNT(*) as cnt 
//      FROM bills 
//      WHERE shop_id = ? 
//        AND bill_number LIKE ?`,
//     [shopId, `BILL-${customerCode}-${shopCode}-${financialYear}-%`]
//   );

//   const count = (result as any)[0].cnt;
//   const sequence = (count + 1).toString().padStart(6, '0');

//   return `BILL-${customerCode}-${shopCode}-${financialYear}-${sequence}`;
// };


export const genId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

// ==================== ORDER NUMBER GENERATOR (Multi-Tenant Safe) ====================
export const genOrderNumber = async (
  connection: any,
  shopId: string,
  customerId: string
): Promise<string> => {

  const currentYear = new Date().getFullYear();
  const financialYear = (currentYear % 100).toString().padStart(2, '0');

  // Fetch Customer Name
  const [customerRes] = await connection.execute(
    'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
    [customerId, shopId]
  ) as any[];

  let customerCode = 'CUS';
  if (customerRes.length > 0 && customerRes[0].name) {
    customerCode = customerRes[0].name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);
  }

  // Fetch Shop Name (for readability)
  const [shopRes] = await connection.execute(
    'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
    [shopId]
  ) as any[];

  let shopCode = 'SHP';
  if (shopRes.length > 0 && shopRes[0].shop_name) {
    shopCode = shopRes[0].shop_name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 3);
  }

  // Get next sequence **PER SHOP** (Most Important for Multi-Tenant)
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

// ==================== BILL NUMBER GENERATOR (Multi-Tenant Safe) ====================
export const genBillNumber = async (
  connection: any,
  shopId: string,
  customerId: string
): Promise<string> => {

  const currentYear = new Date().getFullYear();
  const financialYear = (currentYear % 100).toString().padStart(2, '0');

  // Fetch Customer Name
  const [customerRes] = await connection.execute(
    'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
    [customerId, shopId]
  ) as any[];

  let customerCode = 'CUS';
  if (customerRes.length > 0 && customerRes[0].name) {
    customerCode = customerRes[0].name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);
  }

  // Fetch Shop Name
  const [shopRes] = await connection.execute(
    'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
    [shopId]
  ) as any[];

  let shopCode = 'SHP';
  if (shopRes.length > 0 && shopRes[0].shop_name) {
    shopCode = shopRes[0].shop_name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 3);
  }

  // Get next sequence PER SHOP
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