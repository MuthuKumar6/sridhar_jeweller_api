import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

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
// import logger from './utils/logger';   // Uncomment when you add Winston

const app = express();

// ==================== SECURITY CONFIG ====================

// Allowed Origins
const allowedOrigins = [
  'https://sridhar.moiaccount.in',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:5000',
];

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Security Headers
app.use(helmet());

// Body Parser
app.use(express.json({ limit: '1mb' }));

// ==================== RATE LIMITING ====================

// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,   // 15 minutes
//   max: 100,
//   message: { ok: false, error: 'Too many requests, please try again later.' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: { ok: false, error: 'Too many  login attempts. Please try again later.' },
// });

// app.use(generalLimiter);                    // Apply to all routes
// app.use('/api/auth', authLimiter);          // Stricter for auth

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-types', productTypeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/restrictions', restrictionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/shop', shopRoutes);

// ==================== SWAGGER DOCUMENTATION ====================

app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    message: 'Sridhar Jewellers ERP Backend API is Running',
    docs: '/api/api-docs'
  });
});

// ==================== GLOBAL ERROR HANDLER ====================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  // logger.error('Unhandled Error', { error: err.message }); // if using winston

  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    const dbConnected = await checkDBConnection();

    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📄 Swagger Docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();