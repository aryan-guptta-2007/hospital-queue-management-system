/**
 * OpenAPI description of the API, served by Swagger UI at /api/docs.
 *
 * Kept as one hand-written object rather than generated from JSDoc comments:
 * the routes are few enough to describe precisely, and a spec that is written
 * deliberately stays honest about what each endpoint really returns.
 */

const bearer = [{ bearerAuth: [] }];

const ok = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const envelope = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
});

const ERRORS = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  409: { $ref: '#/components/responses/Conflict' },
  429: { $ref: '#/components/responses/TooManyRequests' },
};

const dateRangeParams = [
  {
    name: 'from',
    in: 'query',
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    description: 'IST start date. Defaults to six days before `to`.',
    example: '2026-10-01',
  },
  {
    name: 'to',
    in: 'query',
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    description: 'IST end date. Defaults to today.',
    example: '2026-10-07',
  },
  {
    name: 'departmentId',
    in: 'query',
    schema: { type: 'string' },
    description: 'Narrow to a single department.',
  },
];

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Hospital Queue & Token Management API',
    version: '1.0.0',
    description: [
      'Queue and token management for a government hospital.',
      '',
      '**Priorities** Emergency (3) > Senior citizen, 60+ (2) > Normal (1).',
      '',
      '**Days** roll over at midnight Asia/Kolkata, not UTC. Token numbers restart',
      'each IST day, so `OPD-001` is only unique within one `serviceDate`.',
      '',
      '**Public endpoints** mask the patient name and never return age, phone or',
      'patient identifiers. A patient reads their own status with the unguessable',
      '`publicCode` printed on their token, not the token number.',
    ].join('\n'),
  },
  servers: [
    { url: '/', description: 'This server' },
    { url: 'http://localhost:5001', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth', description: 'Sign in and account management' },
    { name: 'Tokens', description: 'Patient-facing token issue and status' },
    { name: 'Queue', description: 'Staff queue management' },
    { name: 'Departments', description: 'Department list and configuration' },
    { name: 'Analytics', description: 'Reporting (admin only)' },
    { name: 'Audit', description: 'Staff action log (admin only)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Queue changed, please refresh' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
      Department: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Out Patient Department' },
          code: { type: 'string', example: 'OPD' },
          avgConsultationTime: { type: 'integer', example: 10 },
          activeCounters: { type: 'integer', example: 1 },
          isActive: { type: 'boolean' },
        },
      },
      WaitRange: {
        type: 'object',
        description: 'Estimate as a range, from this department’s measured variation.',
        properties: {
          min: { type: 'integer', example: 15 },
          max: { type: 'integer', example: 25 },
        },
      },
      Token: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          tokenNumber: { type: 'string', example: 'OPD-042' },
          sequenceNumber: { type: 'integer', example: 42 },
          serviceDate: { type: 'string', example: '2026-10-15' },
          publicCode: {
            type: 'string',
            example: 'P24QS90T',
            description: 'The patient’s own lookup key. Never shown publicly.',
          },
          status: { type: 'string', enum: ['waiting', 'serving', 'completed', 'skipped'] },
          priority: { type: 'integer', enum: [1, 2, 3] },
          position: { type: 'integer', nullable: true },
          estimatedWaitTime: { type: 'integer', nullable: true },
          estimatedWaitRange: { $ref: '#/components/schemas/WaitRange' },
        },
      },
      PublicToken: {
        type: 'object',
        description: 'What an unauthenticated caller sees. No age, phone or patient id.',
        properties: {
          tokenNumber: { type: 'string', example: 'OPD-042' },
          status: { type: 'string', enum: ['waiting', 'serving', 'completed', 'skipped'] },
          priority: { type: 'integer', enum: [1, 2, 3] },
          patient: {
            type: 'object',
            properties: { name: { type: 'string', example: 'Rahul S.' } },
          },
          department: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              code: { type: 'string' },
            },
          },
          position: { type: 'integer', nullable: true },
          estimatedWaitTime: { type: 'integer', nullable: true },
          estimatedWaitRange: { $ref: '#/components/schemas/WaitRange' },
        },
      },
      AuditEntry: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          action: {
            type: 'string',
            enum: [
              'call_next',
              'skip',
              'complete',
              'requeue',
              'recall',
              'emergency_insert',
              'department_create',
              'department_update',
            ],
          },
          user: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
            },
          },
          token: { type: 'object', nullable: true },
          department: { type: 'object', nullable: true },
          details: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      BadRequest: ok('Validation failed', { $ref: '#/components/schemas/Error' }),
      Unauthorized: ok('Missing, invalid or expired token', {
        $ref: '#/components/schemas/Error',
      }),
      Forbidden: ok('Authenticated, but not allowed to do this', {
        $ref: '#/components/schemas/Error',
      }),
      NotFound: ok('No such resource', { $ref: '#/components/schemas/Error' }),
      Conflict: ok('The queue moved on, or a uniqueness rule was broken', {
        $ref: '#/components/schemas/Error',
      }),
      Gone: ok('This endpoint has been retired', { $ref: '#/components/schemas/Error' }),
      TooManyRequests: ok('Rate limited', { $ref: '#/components/schemas/Error' }),
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Auth'],
        summary: 'Liveness check',
        security: [],
        responses: { 200: ok('The API is up', envelope({ type: 'object' })) },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        description: 'Rate limited to 10 attempts per IP per 15 minutes.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@hospital.com' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: ok('Signed in', {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              token: { type: 'string', description: 'JWT bearer token' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'staff'] },
                  mustChangePassword: { type: 'boolean' },
                },
              },
            },
          }),
          400: ERRORS[400],
          401: ERRORS[401],
          429: ERRORS[429],
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'The signed-in user',
        description:
          'Reads the user from the database, so a disabled or deleted account loses access immediately.',
        security: bearer,
        responses: {
          200: ok('The current user', envelope({ type: 'object' })),
          401: ERRORS[401],
          403: ERRORS[403],
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a staff or admin account',
        description: 'Administrators only. Without an explicit role the account is staff.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80 },
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 6 },
                  role: { type: 'string', enum: ['admin', 'staff'] },
                },
              },
            },
          },
        },
        responses: {
          200: ok('Created', envelope({ type: 'object' })),
          400: ERRORS[400],
          401: ERRORS[401],
          403: ERRORS[403],
        },
      },
    },

    '/api/auth/change-password': {
      patch: {
        tags: ['Auth'],
        summary: 'Rotate your own password',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: ok('Changed', envelope({ type: 'object' })),
          400: ERRORS[400],
          401: ERRORS[401],
        },
      },
    },

    '/api/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List active departments',
        description: 'Public: the patient registration form needs it.',
        security: [],
        responses: {
          200: ok(
            'Departments',
            envelope({ type: 'array', items: { $ref: '#/components/schemas/Department' } })
          ),
        },
      },
      post: {
        tags: ['Departments'],
        summary: 'Create a department',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'code'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80 },
                  code: { type: 'string', pattern: '^[A-Za-z]{2,10}$', example: 'DERM' },
                  avgConsultationTime: { type: 'integer', minimum: 1, maximum: 120 },
                  activeCounters: { type: 'integer', minimum: 1, maximum: 20 },
                },
              },
            },
          },
        },
        responses: {
          201: ok('Created', envelope({ $ref: '#/components/schemas/Department' })),
          400: ERRORS[400],
          403: ERRORS[403],
          409: ERRORS[409],
        },
      },
    },

    '/api/departments/{id}': {
      get: {
        tags: ['Departments'],
        summary: 'One department',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: ok('Department', envelope({ $ref: '#/components/schemas/Department' })),
          400: ERRORS[400],
          404: ERRORS[404],
        },
      },
      patch: {
        tags: ['Departments'],
        summary: 'Update a department',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } },
        },
        responses: {
          200: ok('Updated', envelope({ $ref: '#/components/schemas/Department' })),
          400: ERRORS[400],
          403: ERRORS[403],
          404: ERRORS[404],
        },
      },
    },

    '/api/tokens/generate': {
      post: {
        tags: ['Tokens'],
        summary: 'Take a token',
        description:
          'Public. Rate limited per IP (5 per 10 minutes by default). The patient record and the token are written together, so a failure leaves neither.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'departmentId'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80, example: 'Kamla Devi' },
                  departmentId: { type: 'string' },
                  age: { type: 'integer', minimum: 0, maximum: 120, nullable: true },
                  phone: {
                    type: 'string',
                    description: '10-digit Indian mobile; +91, 0 and spacing are stripped.',
                    example: '9876543210',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: ok('Token issued', envelope({ $ref: '#/components/schemas/Token' })),
          400: ERRORS[400],
          404: ERRORS[404],
          429: ERRORS[429],
        },
      },
    },

    '/api/tokens/status/{publicCode}': {
      get: {
        tags: ['Tokens'],
        summary: 'A patient’s own status',
        description: 'Public, keyed on the unguessable code printed on the token.',
        security: [],
        parameters: [
          {
            name: 'publicCode',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 8, maxLength: 8 },
            example: 'P24QS90T',
          },
        ],
        responses: {
          200: ok('Status', envelope({ $ref: '#/components/schemas/PublicToken' })),
          400: ERRORS[400],
          404: ERRORS[404],
        },
      },
    },

    '/api/tokens/{tokenNumber}/status': {
      get: {
        tags: ['Tokens'],
        summary: 'Retired',
        description:
          'Token numbers are guessable, so they can no longer read a patient record. Use `/api/tokens/status/{publicCode}`.',
        security: [],
        parameters: [
          { name: 'tokenNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 410: { $ref: '#/components/responses/Gone' } },
      },
    },

    '/api/tokens/current/{departmentId}': {
      get: {
        tags: ['Tokens'],
        summary: 'Who is being served',
        security: [],
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: ok(
            'The serving token, masked',
            envelope({ $ref: '#/components/schemas/PublicToken' })
          ),
          400: ERRORS[400],
        },
      },
    },

    '/api/queue/public-summary': {
      get: {
        tags: ['Queue'],
        summary: 'Public queue preview',
        description:
          'Public. Privacy-safe queue preview for all active departments (for landing pages and overviews). Contains no patient information.',
        security: [],
        responses: {
          200: ok(
            'Public summary',
            envelope({
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  department: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      code: { type: 'string' },
                    },
                  },
                  waitingCount: { type: 'integer' },
                  currentToken: { type: 'string', nullable: true },
                },
              },
            })
          ),
        },
      },
    },

    '/api/queue/public/{departmentId}': {
      get: {
        tags: ['Queue'],
        summary: 'Display board feed',
        description: 'Public. The serving token and the next five, with masked names.',
        security: [],
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: ok(
            'Board',
            envelope({
              type: 'object',
              properties: {
                serving: { $ref: '#/components/schemas/PublicToken' },
                next: { type: 'array', items: { $ref: '#/components/schemas/PublicToken' } },
              },
            })
          ),
          400: ERRORS[400],
        },
      },
    },

    '/api/queue/all': {
      get: {
        tags: ['Queue'],
        summary: 'Dashboard summary',
        description: 'Staff tied to a department see only that department.',
        security: bearer,
        responses: {
          200: ok('Per-department summary', envelope({ type: 'array', items: { type: 'object' } })),
          401: ERRORS[401],
        },
      },
    },

    '/api/queue/{departmentId}': {
      get: {
        tags: ['Queue'],
        summary: 'Full queue for a department',
        description: 'Serving token, the waiting queue with estimates, and today’s skipped tokens.',
        security: bearer,
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: ok('Queue', envelope({ type: 'object' })),
          400: ERRORS[400],
          401: ERRORS[401],
          403: ERRORS[403],
        },
      },
    },

    '/api/queue/{departmentId}/next': {
      post: {
        tags: ['Queue'],
        summary: 'Call the next patient',
        description:
          'Send the serving token the screen is showing as `currentServingId` (or null). If it no longer matches the queue, nothing is written and the call is refused with 409 — a stale screen must never end somebody else’s consultation.',
        security: bearer,
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { currentServingId: { type: 'string', nullable: true } },
              },
            },
          },
        },
        responses: {
          200: ok(
            'Next patient called, or the queue is empty',
            envelope({ $ref: '#/components/schemas/Token' })
          ),
          400: ERRORS[400],
          403: ERRORS[403],
          409: ERRORS[409],
        },
      },
    },

    '/api/queue/{departmentId}/emergency': {
      post: {
        tags: ['Queue'],
        summary: 'Insert an emergency patient',
        security: bearer,
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 80 },
                  phone: { type: 'string' },
                  age: { type: 'integer', minimum: 0, maximum: 120 },
                  note: { type: 'string', maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          201: ok('Inserted at the front', envelope({ $ref: '#/components/schemas/Token' })),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/queue/{departmentId}/recall': {
      post: {
        tags: ['Queue'],
        summary: 'Announce the serving token again',
        description: 'Changes no state; re-broadcasts to the display boards.',
        security: bearer,
        parameters: [
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: ok('Recalled', envelope({ $ref: '#/components/schemas/Token' })),
          403: ERRORS[403],
          409: ERRORS[409],
        },
      },
    },

    '/api/queue/token/{tokenId}/skip': {
      post: {
        tags: ['Queue'],
        summary: 'Skip a patient',
        description: 'Allowed from waiting or serving. Any other state is refused with 409.',
        security: bearer,
        parameters: [{ name: 'tokenId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: ok('Skipped', envelope({ $ref: '#/components/schemas/Token' })),
          400: ERRORS[400],
          403: ERRORS[403],
          404: ERRORS[404],
          409: ERRORS[409],
        },
      },
    },

    '/api/queue/token/{tokenId}/complete': {
      post: {
        tags: ['Queue'],
        summary: 'Complete a consultation',
        description: 'Only a serving token can be completed.',
        security: bearer,
        parameters: [{ name: 'tokenId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: ok('Completed', envelope({ $ref: '#/components/schemas/Token' })),
          403: ERRORS[403],
          404: ERRORS[404],
          409: ERRORS[409],
        },
      },
    },

    '/api/queue/token/{tokenId}/requeue': {
      post: {
        tags: ['Queue'],
        summary: 'Put a skipped patient back',
        description: 'They rejoin at the end of their priority group, not their old place.',
        security: bearer,
        parameters: [{ name: 'tokenId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: ok('Requeued', envelope({ $ref: '#/components/schemas/Token' })),
          403: ERRORS[403],
          404: ERRORS[404],
          409: ERRORS[409],
        },
      },
    },

    '/api/analytics/overview': {
      get: {
        tags: ['Analytics'],
        summary: 'Headline totals',
        description: 'Tokens, completions, skip rate, average wait and average consultation.',
        security: bearer,
        parameters: dateRangeParams,
        responses: {
          200: ok('Overview', envelope({ type: 'object' })),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/analytics/tokens-per-day': {
      get: {
        tags: ['Analytics'],
        summary: 'Tokens per department per day',
        security: bearer,
        parameters: dateRangeParams,
        responses: {
          200: ok('Trend rows', envelope({ type: 'object' })),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/analytics/peak-hours': {
      get: {
        tags: ['Analytics'],
        summary: 'Volume by IST weekday and hour',
        security: bearer,
        parameters: dateRangeParams,
        responses: {
          200: ok('Heatmap rows', envelope({ type: 'object' })),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/analytics/departments': {
      get: {
        tags: ['Analytics'],
        summary: 'Per-department breakdown',
        security: bearer,
        parameters: dateRangeParams,
        responses: {
          200: ok('Rows', envelope({ type: 'object' })),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/audit': {
      get: {
        tags: ['Audit'],
        summary: 'Staff action log',
        description: 'Newest first. Administrators only.',
        security: bearer,
        parameters: [
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string' }, example: '2026-10-01' },
          { name: 'to', in: 'query', schema: { type: 'string' }, example: '2026-10-07' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 } },
        ],
        responses: {
          200: ok(
            'Entries',
            envelope({
              type: 'object',
              properties: {
                entries: { type: 'array', items: { $ref: '#/components/schemas/AuditEntry' } },
                total: { type: 'integer' },
                page: { type: 'integer' },
                pages: { type: 'integer' },
                limit: { type: 'integer' },
              },
            })
          ),
          400: ERRORS[400],
          403: ERRORS[403],
        },
      },
    },

    '/api/audit/actions': {
      get: {
        tags: ['Audit'],
        summary: 'The action names used by the log',
        security: bearer,
        responses: {
          200: ok('Action names', envelope({ type: 'array', items: { type: 'string' } })),
          403: ERRORS[403],
        },
      },
    },
  },
};

module.exports = openapi;
