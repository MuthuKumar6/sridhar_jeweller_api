// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sridhar Jewellers ERP API',
      version: '2.0.1',
      description: 'Backend API for Sridhar Jewellers - Gold & Silver Jewellery Management System',
      contact: {
        name: 'Sridhar Jewellers',
        email: 'support@sridharjewellers.com',
      },
    },
    servers: [
      {
        url: 'https://sridhar.moiaccount.in/',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:5000/',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'], // Path to your route files
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;