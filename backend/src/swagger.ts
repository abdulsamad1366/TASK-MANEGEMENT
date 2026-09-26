import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Task Management REST API',
      version: '1.0.0',
      description:
        'RESTful API for internal team task management platform (Jira/Linear/Asana clone) with Supabase PostgreSQL, Prisma ORM, JWT authentication, and Socket.io live updates.',
    },
    servers: [
      {
        url: 'http://localhost:5001/api',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide JWT Access Token obtained from /api/auth/login or /api/auth/register',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
