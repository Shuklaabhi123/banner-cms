// auth/validators/auth.validator.js
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().max(120).allow('', null),
}).options({ stripUnknown: true });

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).options({ stripUnknown: true });

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
}).options({ stripUnknown: true });

const resetSchema = Joi.object({
  token: Joi.string().min(10).required(),
  password: Joi.string().min(8).max(128).required(),
}).options({ stripUnknown: true });

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  validate,
};
