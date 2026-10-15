const { createError } = require('../middleware/errorHandler');

const SECTIONS = ['params', 'query', 'body'];

/** "name: Name must be at least 2 characters; age: Age must be 120 or less" */
const formatIssues = (error) =>
  error.issues
    .map((issue) => {
      const field = issue.path.join('.');
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join('; ');

/**
 * validate({ params, body, query }) — rejects a malformed request with 400
 * before it reaches a controller, and replaces the request data with the
 * parsed result, so controllers only ever see known, trimmed, correctly typed
 * fields (unknown keys are stripped, which also stops field smuggling).
 *
 * Usage: router.post('/', validate(schemas.createDepartment), createDepartment)
 */
const validate = (schemas = {}) => (req, res, next) => {
  for (const section of SECTIONS) {
    const schema = schemas[section];
    if (!schema) continue;

    const result = schema.safeParse(req[section]);

    if (!result.success) {
      return next(createError(formatIssues(result.error), 400));
    }

    if (section === 'body') {
      req.body = result.data;
    } else {
      // req.params and req.query belong to Express — mutate, never replace
      Object.assign(req[section], result.data);
    }
  }

  next();
};

module.exports = { validate };
