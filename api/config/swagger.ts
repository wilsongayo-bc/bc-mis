import swaggerJSDoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Benedict College MIS API',
    version: '1.0.0',
    description: 'Comprehensive Management Information System API for Benedict College - College of Liberal Arts, Development, Education and Arts. This API provides endpoints for student management, library system, course management, user authentication, and administrative functions.',
    contact: {
      name: 'Benedict College Development Team',
      email: 'dev@benedictcollege.edu'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.benedictcollege.edu',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
      }
    },
    schemas: {
      // Common response schemas
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'An error occurred'
          },
          error: {
            type: 'string',
            description: 'Detailed error message'
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Validation failed'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email'
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format'
                }
              }
            }
          }
        }
      },
      // Authentication schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@benedictcollege.edu'
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password123'
          }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Login successful'
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User'
              },
              token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
              }
            }
          }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName', 'role'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'newuser@benedictcollege.edu'
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password123'
          },
          firstName: {
            type: 'string',
            example: 'John'
          },
          lastName: {
            type: 'string',
            example: 'Doe'
          },
          role: {
            type: 'string',
            enum: ['STUDENT', 'FACULTY', 'STAFF', 'LIBRARIAN', 'REGISTRAR', 'ADMIN', 'SUPERADMIN'],
            example: 'STUDENT'
          }
        }
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@benedictcollege.edu'
          },
          firstName: {
            type: 'string',
            example: 'John'
          },
          lastName: {
            type: 'string',
            example: 'Doe'
          },
          role: {
            type: 'string',
            enum: ['STUDENT', 'FACULTY', 'STAFF', 'LIBRARIAN', 'REGISTRAR', 'ADMIN', 'SUPERADMIN'],
            example: 'STUDENT'
          },
          isActive: {
            type: 'boolean',
            example: true
          },
          avatarUrl: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/avatar.jpg'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Student schemas
      Student: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          studentId: {
            type: 'string',
            example: 'STU-2024-001'
          },
          firstName: {
            type: 'string',
            example: 'John'
          },
          lastName: {
            type: 'string',
            example: 'Doe'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@student.benedictcollege.edu'
          },
          phone: {
            type: 'string',
            example: '+1234567890'
          },
          address: {
            type: 'string',
            example: '123 Main St, City, State'
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            example: '2000-01-01'
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'GRADUATED', 'DROPPED'],
            example: 'ACTIVE'
          },
          enrollmentDate: {
            type: 'string',
            format: 'date',
            example: '2024-01-01'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Book schemas
      Book: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          title: {
            type: 'string',
            example: 'Introduction to Computer Science'
          },
          author: {
            type: 'string',
            example: 'John Smith'
          },
          isbn: {
            type: 'string',
            example: '978-0123456789'
          },
          publisher: {
            type: 'string',
            example: 'Academic Press'
          },
          publicationYear: {
            type: 'integer',
            example: 2023
          },
          category: {
            type: 'string',
            example: 'Computer Science'
          },
          totalCopies: {
            type: 'integer',
            example: 10
          },
          availableCopies: {
            type: 'integer',
            example: 8
          },
          location: {
            type: 'string',
            example: 'Section A, Shelf 1'
          },
          coverImageUrl: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/book-cover.jpg'
          },
          externalLink: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/ebook'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      // Dashboard schemas
      DashboardStats: {
        type: 'object',
        properties: {
          totalStudents: {
            type: 'integer',
            example: 1250
          },
          totalBooks: {
            type: 'integer',
            example: 5000
          },
          totalBorrowedBooks: {
            type: 'integer',
            example: 150
          },
          totalUsers: {
            type: 'integer',
            example: 75
          },
          recentActivities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  example: 1
                },
                type: {
                  type: 'string',
                  example: 'BOOK_BORROWED'
                },
                description: {
                  type: 'string',
                  example: 'John Doe borrowed "Introduction to Computer Science"'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-01T00:00:00.000Z'
                }
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Unauthorized access',
              error: 'Invalid or missing authentication token'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Access forbidden - insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Access forbidden',
              error: 'Insufficient permissions to access this resource'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Resource not found',
              error: 'The requested resource could not be found'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              message: 'Internal server error',
              error: 'An unexpected error occurred'
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './routes/*.ts',
    './controllers/*.ts',
    './entities/*.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;