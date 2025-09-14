// lib/api-utils.js - API Utilities and Helpers
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// API Response formatter
export function apiResponse(success = true, data = null, message = '', error = null) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  if (error) {
    response.error = error;
  }

  return response;
}

// Error handler middleware
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          apiResponse(false, null, '', 'Invalid request data')
        );
      }

      if (error.name === 'UnauthorizedError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json(
          apiResponse(false, null, '', 'Unauthorized access')
        );
      }

      // Generic error response
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        apiResponse(false, null, '', 'Internal server error')
      );
    }
  };
}

// Method validation middleware
export function withMethods(allowedMethods, handler) {
  return (req, res) => {
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods);
      return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json(
        apiResponse(false, null, '', `Method ${req.method} not allowed`)
      );
    }
    return handler(req, res);
  };
}

// Request validation middleware
export function withValidation(schema, handler) {
  return (req, res) => {
    const validation = validateRequest(req, schema);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        apiResponse(false, null, '', validation.errors.join(', '))
      );
    }
    return handler(req, res);
  };
}

// Basic request validation
export function validateRequest(req, schema) {
  const errors = [];
  const { body, query } = req;

  // Validate required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in body) && !(field in query)) {
        errors.push(`${field} is required`);
      }
    }
  }

  // Validate field types
  if (schema.fields) {
    for (const [field, rules] of Object.entries(schema.fields)) {
      const value = body[field] || query[field];
      
      if (value !== undefined) {
        // Type validation
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }

        // String length validation
        if (rules.type === 'string' && rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must not exceed ${rules.maxLength} characters`);
        }

        // Array validation
        if (rules.type === 'object' && Array.isArray(value) && rules.minItems) {
          if (value.length < rules.minItems) {
            errors.push(`${field} must have at least ${rules.minItems} items`);
          }
        }

        // Custom validation
        if (rules.validate && !rules.validate(value)) {
          errors.push(`${field} validation failed`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Rate limiting (simple in-memory implementation)
const rateLimitStore = new Map();

export function withRateLimit(windowMs = 60000, maxRequests = 100) {
  return (handler) => {
    return (req, res) => {
      const clientId = getClientId(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (rateLimitStore.has(clientId)) {
        const requests = rateLimitStore.get(clientId).filter(time => time > windowStart);
        rateLimitStore.set(clientId, requests);
      }

      // Get current request count
      const currentRequests = rateLimitStore.get(clientId) || [];
      
      if (currentRequests.length >= maxRequests) {
        return res.status(429).json(
          apiResponse(false, null, '', 'Rate limit exceeded')
        );
      }

      // Add current request
      currentRequests.push(now);
      rateLimitStore.set(clientId, currentRequests);

      return handler(req, res);
    };
  };
}

function getClientId(req) {
  // In production, you might want to use user ID or more sophisticated client identification
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// Pagination helper
export function paginate(data, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);
  
  return {
    data: paginatedData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: offset + limit < data.length,
      hasPrev: page > 1
    }
  };
}

// Search helper
export function searchInFields(items, query, fields) {
  if (!query || query.trim().length === 0) {
    return items;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return items.filter(item => {
    return fields.some(field => {
      const value = getNestedValue(item, field);
      return value && value.toString().toLowerCase().includes(searchTerm);
    });
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

// Sort helper
export function sortBy(items, field, direction = 'asc') {
  return [...items].sort((a, b) => {
    const aVal = getNestedValue(a, field);
    const bVal = getNestedValue(b, field);
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal > bVal ? 1 : -1;
    return direction === 'desc' ? -comparison : comparison;
  });
}

// Date utilities for API
export const dateUtils = {
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  formatDate(date) {
    return new Date(date).toISOString();
  },

  isToday(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
  },

  isUpcoming(dateString, days = 7) {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  },

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
};

// Validation schemas for different entities
export const validationSchemas = {
  task: {
    required: ['title'],
    fields: {
      title: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      priority: { 
        type: 'string', 
        validate: (value) => ['low', 'medium', 'high'].includes(value) 
      },
      status: { 
        type: 'string', 
        validate: (value) => ['pending', 'in_progress', 'completed'].includes(value) 
      },
      dueDate: { 
        type: 'string', 
        validate: (value) => !value || dateUtils.isValidDate(value) 
      }
    }
  },

  event: {
    required: ['title', 'date'],
    fields: {
      title: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      type: { 
        type: 'string', 
        validate: (value) => ['interview', 'meeting', 'deadline', 'announcement', 'onboarding'].includes(value) 
      },
      date: { type: 'string', validate: dateUtils.isValidDate },
      time: { type: 'string' },
      location: { type: 'string', maxLength: 255 }
    }
  },

  profile: {
    fields: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      email: { 
        type: 'string', 
        validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) 
      },
      phone: { type: 'string', maxLength: 20 },
      university: { type: 'string', maxLength: 255 },
      major: { type: 'string', maxLength: 255 },
      company: { type: 'string', maxLength: 255 },
      position: { type: 'string', maxLength: 255 }
    }
  },

  schedule: {
    required: ['title', 'date', 'startTime'],
    fields: {
      title: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      date: { type: 'string', validate: dateUtils.isValidDate },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
      type: { 
        type: 'string', 
        validate: (value) => ['work', 'meeting', 'personal', 'study'].includes(value) 
      },
      recurring: { type: 'boolean' },
      recurringPattern: { 
        type: 'string', 
        validate: (value) => !value || ['daily', 'weekly', 'monthly'].includes(value) 
      }
    }
  }
};