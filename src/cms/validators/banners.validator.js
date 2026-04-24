// cms/validators/banners.validator.js
const Joi = require('joi');

const TEMPLATE_TYPES = ['hero', 'strip', 'popup', 'card'];
const STATUSES       = ['draft', 'scheduled', 'active', 'expired'];

const createSchema = Joi.object({
  title:        Joi.string().max(200).required(),
  templateType: Joi.string().valid(...TEMPLATE_TYPES).required(),
  targetPages:  Joi.array().items(Joi.string()).min(1).required(),
  contentJSON:  Joi.object().required(),
  status:       Joi.string().valid(...STATUSES).default('draft'),
  priority:     Joi.number().integer().min(0).default(0),
  startDate:    Joi.string().isoDate(),
  endDate:      Joi.string().isoDate().allow(null, ''),
}).options({ stripUnknown: true })  // ← add this too

const updateSchema = Joi.object({
  title:        Joi.string().max(200),
  templateType: Joi.string().valid(...TEMPLATE_TYPES),
  targetPages:  Joi.array().items(Joi.string()).min(1),
  contentJSON:  Joi.object(),
  status:       Joi.string().valid(...STATUSES),
  priority:     Joi.number().integer().min(0),
  startDate:    Joi.string().isoDate(),
  endDate:      Joi.string().isoDate().allow(null, ''),
}).min(1)
  .options({ stripUnknown: true })  // ← add this — strips extra fields instead of erroring

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { createSchema, updateSchema, validate };