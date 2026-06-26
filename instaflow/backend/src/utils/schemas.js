const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(255).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const createFlowSchema = Joi.object({
  instagramAccountId: Joi.number().integer().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  trigger: Joi.object({
    type: Joi.string().valid('comment_keyword', 'dm_inbound', 'story_mention', 'story_reply').required(),
    keywords: Joi.array().items(Joi.string().trim().min(1)).optional(),
    mediaId: Joi.string().allow(null, '').optional(),
  }).required(),
  action: Joi.object({
    type: Joi.string().valid('send_dm').required(),
    messageTemplate: Joi.string().trim().min(1).required(),
    commentReplyTemplate: Joi.string().allow(null, '').optional(),
  }).required(),
  fallback: Joi.object({
    enabled: Joi.boolean().required(),
    waitMinutes: Joi.number().integer().min(1).optional(),
    messageTemplate: Joi.string().allow(null, '').optional(),
  }).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createFlowSchema,
};
