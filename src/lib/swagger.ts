import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InternCompass API',
      version: '1.0.0',
      description: 'InternCompass Backend Service with Gemini RAG',
      contact: {
        name: 'InternCompass Team',
        email: 'support@interncompass.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Document ID',
            },
            title: {
              type: 'string',
              description: 'Document title',
            },
            s3_key: {
              type: 'string',
              description: 'S3 object key',
            },
            mime: {
              type: 'string',
              description: 'MIME type',
            },
            uploaded_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who uploaded the document',
            },
            status: {
              type: 'string',
              enum: ['pending_review', 'approved', 'rejected'],
              description: 'Document status',
            },
            role_tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Role tags',
            },
            team_ids: {
              type: 'array',
              items: {
                type: 'integer',
              },
              description: 'Team IDs',
            },
            sensitivity_tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Sensitivity tags',
            },
            hash: {
              type: 'string',
              description: 'File hash',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            reviewed_by: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who reviewed the document',
            },
            reviewed_at: {
              type: 'string',
              format: 'date-time',
              description: 'Review timestamp',
            },
          },
        },
        Citation: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              format: 'uuid',
              description: 'Document ID',
            },
            title: {
              type: 'string',
              description: 'Document title',
            },
            pages: {
              type: 'string',
              description: 'Page range (e.g., "2-3")',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
              description: 'Validation error details',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints for document management',
      },
      {
        name: 'Outline',
        description: 'Onboarding outline generation',
      },
      {
        name: 'Chat',
        description: 'RAG-powered chat system',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'InternCompass API Documentation',
  }));
}
