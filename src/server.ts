import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import productTypeRoutes from './routes/productTypeRoutes';
import customerRoutes from './routes/customerRoutes';
import orderRoutes from './routes/orderRoutes';
import billRoutes from './routes/billRoutes';
import restrictionRoutes from './routes/restrictionRoutes';
import alertRoutes from './routes/alertRoutes';
import shopRoutes from './routes/shopRoutes';

import { checkDBConnection } from './config/db';

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-types', productTypeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/restrictions', restrictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/shop', shopRoutes);

// Health check / root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    ok: true,
    message: 'Welcome to Sridhar Jewellers ERP Backend API',
  });
});

// Global error handler
app.use(
  (err: any, req: Request, res: Response, next: NextFunction): void => {
    console.error('Unhandled error:', err);

    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    const dbConnected = await checkDBConnection();

    if (!dbConnected) {
      console.error('❌ Server stopped due to database issue');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(
        `🚀 Sridhar Jewellers ERP running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();