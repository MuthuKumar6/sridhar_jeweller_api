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


/* version 2 */
// export const genId = (): string => {
//   return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// };

// // ==================== ORDER NUMBER GENERATOR (Multi-Tenant Safe) ====================
// export const genOrderNumber = async (
//   connection: any,
//   shopId: string,
//   customerId: string
// ): Promise<string> => {

//   const currentYear = new Date().getFullYear();
//   const financialYear = (currentYear % 100).toString().padStart(2, '0');

//   // Fetch Customer Name
//   const [customerRes] = await connection.execute(
//     'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
//     [customerId, shopId]
//   ) as any[];

//   let customerCode = 'CUS';
//   if (customerRes.length > 0 && customerRes[0].name) {
//     customerCode = customerRes[0].name
//       .trim()
//       .toUpperCase()
//       .replace(/[^A-Z0-9]/g, '')
//       .substring(0, 5);
//   }

//   // Fetch Shop Name (for readability)
//   const [shopRes] = await connection.execute(
//     'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
//     [shopId]
//   ) as any[];

//   let shopCode = 'SHP';
//   if (shopRes.length > 0 && shopRes[0].shop_name) {
//     shopCode = shopRes[0].shop_name
//       .trim()
//       .toUpperCase()
//       .replace(/[^A-Z0-9]/g, '')
//       .substring(0, 3);
//   }

//   // Get next sequence **PER SHOP** (Most Important for Multi-Tenant)
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

// // ==================== BILL NUMBER GENERATOR (Multi-Tenant Safe) ====================
// export const genBillNumber = async (
//   connection: any,
//   shopId: string,
//   customerId: string
// ): Promise<string> => {

//   const currentYear = new Date().getFullYear();
//   const financialYear = (currentYear % 100).toString().padStart(2, '0');

//   // Fetch Customer Name
//   const [customerRes] = await connection.execute(
//     'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
//     [customerId, shopId]
//   ) as any[];

//   let customerCode = 'CUS';
//   if (customerRes.length > 0 && customerRes[0].name) {
//     customerCode = customerRes[0].name
//       .trim()
//       .toUpperCase()
//       .replace(/[^A-Z0-9]/g, '')
//       .substring(0, 5);
//   }

//   // Fetch Shop Name
//   const [shopRes] = await connection.execute(
//     'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
//     [shopId]
//   ) as any[];

//   let shopCode = 'SHP';
//   if (shopRes.length > 0 && shopRes[0].shop_name) {
//     shopCode = shopRes[0].shop_name
//       .trim()
//       .toUpperCase()
//       .replace(/[^A-Z0-9]/g, '')
//       .substring(0, 3);
//   }

//   // Get next sequence PER SHOP
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

/*** version 3 */

import { randomUUID } from 'crypto';
import { PoolConnection } from 'mysql2/promise';

// ─── genId ───────────────────────────────────────────────────────────────────
// Uses crypto.randomUUID() — collision-proof, built into Node 18+
export const genId = (): string => randomUUID().replace(/-/g, '').toUpperCase();

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Indian financial year string: April 2025–March 2026 → "2526" */
function getFinancialYear(): string {
  const now   = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year  = now.getFullYear();
  const fyStart = month >= 4 ? year     : year - 1;
  const fyEnd   = month >= 4 ? year + 1 : year;
  return `${(fyStart % 100).toString().padStart(2, '0')}${(fyEnd % 100).toString().padStart(2, '0')}`;
}

/**
 * Build a short customer code that is unique even when names are similar.
 * Uses up to 5 chars of the cleaned name + last 3 chars of customerId.
 * e.g.  "Ramu Gopal", id "XYZ9ABC" → "RAMUGABC"
 */
function buildCustomerCode(name: string, customerId: string): string {
  const nameCode = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 5);
  const idSuffix = customerId.replace(/[^A-Z0-9]/gi, '').slice(-3).toUpperCase();
  return nameCode || 'CUS' + idSuffix;
}

function buildShopCode(shopName: string): string {
  return shopName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3) || 'SHP';
}

/**
 * Atomically fetch-and-increment the sequence for a given shop+prefix+year.
 * Uses SELECT … FOR UPDATE so concurrent transactions queue up safely.
 */
async function nextSequence(
  connection: PoolConnection,
  table: 'order_sequences' | 'bill_sequences',
  shopId: string,
  prefix: string,
  finYear: string,
): Promise<number> {
  await connection.execute(
    `INSERT IGNORE INTO ${table} (shop_id, prefix, fin_year, last_seq)
     VALUES (?, ?, ?, 0)`,
    [shopId, prefix, finYear],
  );

  const [rows] = await connection.execute(
    `SELECT last_seq FROM ${table}
     WHERE shop_id = ? AND prefix = ? AND fin_year = ?
     FOR UPDATE`,
    [shopId, prefix, finYear],
  ) as any[];

  const next = (rows[0].last_seq as number) + 1;

  await connection.execute(
    `UPDATE ${table} SET last_seq = ?
     WHERE shop_id = ? AND prefix = ? AND fin_year = ?`,
    [next, shopId, prefix, finYear],
  );

  return next;
}

// ─── genOrderNumber ───────────────────────────────────────────────────────────
export const genOrderNumber = async (
  connection: PoolConnection,
  shopId: string,
  customerId: string,
): Promise<string> => {
  const finYear = getFinancialYear();

  const [customerRows] = await connection.execute(
    'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
    [customerId, shopId],
  ) as any[];

  const [shopRows] = await connection.execute(
    'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
    [shopId],
  ) as any[];

  const customerCode = customerRows.length
    ? buildCustomerCode(customerRows[0].name, customerId)
    : 'CUS' + customerId.slice(-3).toUpperCase();

  const shopCode = shopRows.length
    ? buildShopCode(shopRows[0].shop_name)
    : 'SHP';

  const prefix = `ORD-${customerCode}-${shopCode}-${finYear}`;
  const seq = await nextSequence(connection, 'order_sequences', shopId, prefix, finYear);

  return `${prefix}-${seq.toString().padStart(6, '0')}`;
};

// ─── genBillNumber ────────────────────────────────────────────────────────────
export const genBillNumber = async (
  connection: PoolConnection,
  shopId: string,
  customerId: string,
): Promise<string> => {
  const finYear = getFinancialYear();

  const [customerRows] = await connection.execute(
    'SELECT name FROM customers WHERE id = ? AND shop_id = ? LIMIT 1',
    [customerId, shopId],
  ) as any[];

  const [shopRows] = await connection.execute(
    'SELECT shop_name FROM shops WHERE id = ? LIMIT 1',
    [shopId],
  ) as any[];

  const customerCode = customerRows.length
    ? buildCustomerCode(customerRows[0].name, customerId)
    : 'CUS' + customerId.slice(-3).toUpperCase();

  const shopCode = shopRows.length
    ? buildShopCode(shopRows[0].shop_name)
    : 'SHP';

  const prefix = `BILL-${customerCode}-${shopCode}-${finYear}`;
  const seq = await nextSequence(connection, 'bill_sequences', shopId, prefix, finYear);

  return `${prefix}-${seq.toString().padStart(6, '0')}`;
};

// ─── genItemId ────────────────────────────────────────────────────────────────
export const genItemId = (): string => {
  return `ITEM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};