// import { Request, Response } from 'express';
// import { query, execute } from '../utils/db';
// import { genId, genBillNumber } from '../utils/generateId';

// export const billController = {
//   getAll: async (req: Request, res: Response) => {
//     const shopId = (req as any).shopId;
//     const data = await query('SELECT * FROM bills WHERE shop_id = ? ORDER BY created_at DESC', [shopId]);
//     res.json({ ok: true, data });
//   },

//   create: async (req: Request, res: Response) => {
//     const shopId = (req as any).shopId;
//     const { orderId, customerId, items, subtotal, gstAmount, discount = 0, 
//             paidAmount, paymentMethod } = req.body;

//     const countRes = await query('SELECT COUNT(*) as cnt FROM bills WHERE shop_id = ?', [shopId]);
//     const billNumber = genBillNumber((countRes as any)[0].cnt);

//     const id = genId();
//     const totalAmount = subtotal + gstAmount - discount;
//     const balanceAmount = totalAmount - paidAmount;

//     await execute(
//       `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal, 
//         gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [id, shopId, billNumber, orderId, customerId, subtotal, gstAmount, discount,
//        totalAmount, paidAmount, balanceAmount, paymentMethod, balanceAmount > 0 ? 'partial' : 'paid']
//     );

//     res.status(201).json({ ok: true, billNumber, id });
//   }
// };



import { Request, Response } from 'express';
import { genId, genBillNumber } from '../utils/generateId';
import pool from '../config/db';

export const billController = {
  getAll: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;

    try {
      const [data] = await pool.execute(
        'SELECT * FROM bills WHERE shop_id = ? ORDER BY created_at DESC',
        [shopId]
      );

      res.json({ ok: true, data });
    } catch (error: any) {
      console.error('Failed to fetch bills:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch bills' });
    }
  },

  // create: async (req: Request, res: Response) => {
  //   const shopId = (req as any).shopId;
  //   const { 
  //     orderId, 
  //     customerId, 
  //     items, 
  //     subtotal, 
  //     gstAmount, 
  //     discount = 0, 
  //     paidAmount, 
  //     paymentMethod 
  //   } = req.body;

  //   if (!customerId || !subtotal || paidAmount === undefined || !paymentMethod) {
  //     return res.status(400).json({ 
  //       ok: false, 
  //       error: 'Missing required fields (customerId, subtotal, paidAmount, paymentMethod)' 
  //     });
  //   }

  //   const connection = await pool.getConnection();

  //   try {
  //     await connection.beginTransaction();

  //     // Generate Bill Number
  //     const [countRes] = await connection.execute(
  //       'SELECT COUNT(*) as cnt FROM bills WHERE shop_id = ?',
  //       [shopId]
  //     );
  //     const billNumber = genBillNumber((countRes as any)[0].cnt);

  //     const id = genId();
  //     const totalAmount = subtotal + gstAmount - discount;
  //     const balanceAmount = totalAmount - paidAmount;

  //     // Create Bill
  //     await connection.execute(
  //       `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal, 
  //         gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
  //        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  //       [
  //         id, 
  //         shopId, 
  //         billNumber, 
  //         orderId || null, 
  //         customerId, 
  //         subtotal, 
  //         gstAmount, 
  //         discount,
  //         totalAmount, 
  //         paidAmount, 
  //         balanceAmount, 
  //         paymentMethod, 
  //         balanceAmount > 0 ? 'partial' : 'paid'
  //       ]
  //     );

  //     await connection.commit();

  //     res.status(201).json({ 
  //       ok: true, 
  //       billNumber, 
  //       id,
  //       totalAmount,
  //       balanceAmount 
  //     });
  //   } catch (error: any) {
  //     await connection.rollback();
  //     console.error('Bill creation failed:', error);
  //     res.status(500).json({ 
  //       ok: false, 
  //       error: 'Failed to create bill' 
  //     });
  //   } finally {
  //     connection.release();
  //   }
  // }

  // create: async (req: Request, res: Response) => {
  //   const shopId = (req as any).shopId;
  //   const {
  //     orderId,
  //     customerId,
  //     items,
  //     subtotal,
  //     gstAmount,
  //     discount = 0,
  //     paidAmount,
  //     paymentMethod
  //   } = req.body;

  //   // ==================== VALIDATIONS ====================

  //   if (!customerId) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'customerId is required'
  //     });
  //   }

  //   if (typeof subtotal !== 'number' || subtotal < 0) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'subtotal must be a valid positive number'
  //     });
  //   }

  //   if (typeof gstAmount !== 'number' || gstAmount < 0) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'gstAmount must be a valid non-negative number'
  //     });
  //   }

  //   if (typeof discount !== 'number' || discount < 0) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'discount cannot be negative'
  //     });
  //   }

  //   if (typeof paidAmount !== 'number' || paidAmount < 0) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'paidAmount must be a valid non-negative number'
  //     });
  //   }

  //   if (!paymentMethod || !['cash', 'online', 'card', 'upi', 'cheque'].includes(paymentMethod)) {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'Valid paymentMethod is required (cash, online, card, upi, cheque)'
  //     });
  //   }

  //   // Optional: orderId validation
  //   if (orderId && typeof orderId !== 'string') {
  //     return res.status(400).json({
  //       ok: false,
  //       error: 'orderId must be a valid string if provided'
  //     });
  //   }

  //   const connection = await pool.getConnection();

  //   try {
  //     await connection.beginTransaction();

  //     // === DUPLICATE BILL GUARD ===
  //     if (orderId) {
  //       const [existingBill] = await connection.execute(
  //         'SELECT id, bill_number FROM bills WHERE shop_id = ? AND order_id = ?',
  //         [shopId, orderId]
  //       );

  //       if ((existingBill as any[]).length > 0) {
  //         await connection.rollback();
  //         return res.status(409).json({
  //           ok: false,
  //           error: 'A bill has already been created for this order',
  //           existingBill: (existingBill as any[])[0]
  //         });
  //       }
  //     }

  //     // Verify customer belongs to this shop
  //     const [customer] = await connection.execute(
  //       'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
  //       [customerId, shopId]
  //     );

  //     if ((customer as any[]).length === 0) {
  //       await connection.rollback();
  //       return res.status(400).json({
  //         ok: false,
  //         error: 'Customer not found or does not belong to this shop'
  //       });
  //     }

  //     // Optional: If orderId is provided, verify it exists and belongs to shop
  //     if (orderId) {
  //       const [order] = await connection.execute(
  //         'SELECT id FROM orders WHERE id = ? AND shop_id = ?',
  //         [orderId, shopId]
  //       );

  //       if ((order as any[]).length === 0) {
  //         await connection.rollback();
  //         return res.status(400).json({
  //           ok: false,
  //           error: 'Order not found or does not belong to this shop'
  //         });
  //       }
  //     }

  //     // ==================== BUSINESS LOGIC ====================

  //     // Generate Bill Number
  //     const [countRes] = await connection.execute(
  //       'SELECT COUNT(*) as cnt FROM bills WHERE shop_id = ?',
  //       [shopId]
  //     );

  //     const billNumber = genBillNumber((countRes as any)[0].cnt);
  //     const id = genId();

  //     const totalAmount = subtotal + gstAmount - discount;
  //     const balanceAmount = totalAmount - paidAmount;

  //     if (balanceAmount < 0) {
  //       await connection.rollback();
  //       return res.status(400).json({
  //         ok: false,
  //         error: 'paidAmount cannot be greater than totalAmount'
  //       });
  //     }

  //     // Create Bill
  //     await connection.execute(
  //       `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal, 
  //       gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
  //      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  //       [
  //         id,
  //         shopId,
  //         billNumber,
  //         orderId || null,
  //         customerId,
  //         subtotal,
  //         gstAmount,
  //         discount,
  //         totalAmount,
  //         paidAmount,
  //         balanceAmount,
  //         paymentMethod,
  //         balanceAmount > 0 ? 'partial' : 'paid'
  //       ]
  //     );

  //     await connection.commit();

  //     res.status(201).json({
  //       ok: true,
  //       billNumber,
  //       id,
  //       totalAmount,
  //       balanceAmount
  //     });

  //   } catch (error: any) {
  //     await connection.rollback();
  //     console.error('Bill creation failed:', error);
  //     res.status(500).json({
  //       ok: false,
  //       error: 'Failed to create bill'
  //     });
  //   } finally {
  //     connection.release();
  //   }
  // }

  create: async (req: Request, res: Response) => {
    const shopId = (req as any).shopId;
    const {
      orderId,
      customerId,
      items,           // optional - if you want to validate later
      subtotal,
      gstAmount,
      discount = 0,
      paidAmount,
      paymentMethod
    } = req.body;

    // ==================== VALIDATIONS ====================
    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Valid customerId is required' });
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      return res.status(400).json({ ok: false, error: 'subtotal must be a valid positive number' });
    }

    if (typeof gstAmount !== 'number' || gstAmount < 0) {
      return res.status(400).json({ ok: false, error: 'gstAmount must be a valid non-negative number' });
    }

    if (typeof discount !== 'number' || discount < 0) {
      return res.status(400).json({ ok: false, error: 'discount cannot be negative' });
    }

    if (typeof paidAmount !== 'number' || paidAmount < 0) {
      return res.status(400).json({ ok: false, error: 'paidAmount must be a valid non-negative number' });
    }

    if (!paymentMethod || !['cash', 'online', 'card', 'upi', 'cheque'].includes(paymentMethod)) {
      return res.status(400).json({
        ok: false,
        error: 'Valid paymentMethod is required (cash, online, card, upi, cheque)'
      });
    }

    if (orderId && typeof orderId !== 'string') {
      return res.status(400).json({ ok: false, error: 'orderId must be a string if provided' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // === DUPLICATE BILL GUARD ===
      if (orderId) {
        const [existingBill] = await connection.execute(
          'SELECT id, bill_number FROM bills WHERE shop_id = ? AND order_id = ?',
          [shopId, orderId]
        ) as any[];

        if (existingBill.length > 0) {
          await connection.rollback();
          return res.status(409).json({
            ok: false,
            error: 'A bill has already been created for this order',
            existingBill: existingBill[0]
          });
        }
      }

      // Verify customer
      const [customer] = await connection.execute(
        'SELECT id FROM customers WHERE id = ? AND shop_id = ?',
        [customerId, shopId]
      ) as any[];

      if (customer.length === 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: 'Customer not found or does not belong to this shop' });
      }

      // Verify order (if provided)
      if (orderId) {
        const [order] = await connection.execute(
          'SELECT id FROM orders WHERE id = ? AND shop_id = ?',
          [orderId, shopId]
        ) as any[];

        if (order.length === 0) {
          await connection.rollback();
          return res.status(400).json({ ok: false, error: 'Order not found or does not belong to this shop' });
        }
      }

      // ==================== Generate Unique Bill Number ====================
      const billId = genId();
      let billNumber: string;
      let attempts = 0;
      const maxAttempts = 10;
      let generated = false;

      while (attempts < maxAttempts) {
        const [countRes] = await connection.execute(
          'SELECT COUNT(*) as cnt FROM bills WHERE shop_id = ?',
          [shopId]
        );

        const count = (countRes as any)[0].cnt;
        billNumber = genBillNumber(count + attempts);

        try {
          const totalAmount = subtotal + gstAmount - discount;
          const balanceAmount = totalAmount - paidAmount;

          if (balanceAmount < 0) {
            throw new Error('paidAmount cannot be greater than totalAmount');
          }

          await connection.execute(
            `INSERT INTO bills (id, shop_id, bill_number, order_id, customer_id, subtotal, 
                    gst_amount, discount, total_amount, paid_amount, balance_amount, payment_method, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              billId,
              shopId,
              billNumber,
              orderId || null,
              customerId,
              subtotal,
              gstAmount,
              discount,
              totalAmount,
              paidAmount,
              balanceAmount,
              paymentMethod,
              balanceAmount > 0 ? 'partial' : 'paid'
            ]
          );

          generated = true;
          break;
        } catch (err: any) {
          if (err.code === 'ER_DUP_ENTRY' && err.message.includes('bill_number')) {
            attempts++;
            continue;
          }
          throw err;
        }
      }

      if (!generated) {
        throw new Error('Failed to generate unique bill number after multiple attempts');
      }

      await connection.commit();

      res.status(201).json({
        ok: true,
        billId,
        totalAmount: subtotal + gstAmount - discount,
        balanceAmount: (subtotal + gstAmount - discount) - paidAmount
      });

    } catch (error: any) {
      await connection.rollback();
      console.error('Bill creation failed:', error);

      const errorMessage = error.message.includes('paidAmount cannot')
        ? error.message
        : 'Failed to create bill';

      res.status(400).json({ ok: false, error: errorMessage });
    } finally {
      connection.release();
    }
  }
};