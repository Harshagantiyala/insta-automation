const Joi = require('joi');

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // Remove keys that are not defined in the schema
    });

    if (error) {
      const errorDetails = error.details.map((x) => x.message).join(', ');
      return res.status(400).json({ error: `Validation error: ${errorDetails}` });
    }

    // Replace req.body with the validated (and stripped) value
    req.body = value;
    next();
  };
}

module.exports = { validateBody };
