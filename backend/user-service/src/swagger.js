// Serves interactive API docs at /docs and the raw spec at /openapi.json.
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'EduSlot — User & Access Service',
    version: '1.0.0',
    description: 'Authentication, RBAC (roles, pages, permissions) and user management.',
  },
  servers: [{ url: 'http://localhost:4001', description: 'direct' }, { url: 'http://localhost:3000', description: 'via gateway' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  tags: [{ name: 'Auth' }, { name: 'Roles' }, { name: 'Pages' }, { name: 'Users' }],
  paths: {
    '/auth/signup': { post: { tags: ['Auth'], summary: 'Register (new users become Student)', security: [], requestBody: body({ name: 'string', email: 'string', password: 'string' }), responses: ok('Created') } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login → { token, user }', security: [], requestBody: body({ email: 'string', password: 'string' }), responses: ok() } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', responses: ok() } },
    '/auth/permissions': { get: { tags: ['Auth'], summary: 'Visible page tree + action flags (drives the dynamic sidebar)', responses: ok() } },
    '/roles': {
      get: { tags: ['Roles'], summary: 'List roles', parameters: listParams(), responses: ok() },
      post: { tags: ['Roles'], summary: 'Create role with permissions', requestBody: body({ name: 'string', description: 'string', permissions: 'array' }), responses: ok('Created') },
    },
    '/roles/{id}': {
      get: { tags: ['Roles'], summary: 'Role + permission matrix', parameters: [idParam()], responses: ok() },
      put: { tags: ['Roles'], summary: 'Update role + permissions', parameters: [idParam()], responses: ok() },
      delete: { tags: ['Roles'], summary: 'Soft-delete role', parameters: [idParam()], responses: ok('No Content') },
    },
    '/roles/{id}/status': { patch: { tags: ['Roles'], summary: 'Toggle active status', parameters: [idParam()], responses: ok() } },
    '/pages': { get: { tags: ['Pages'], summary: 'List pages', responses: ok() }, post: { tags: ['Pages'], summary: 'Create page', responses: ok('Created') } },
    '/users': {
      get: { tags: ['Users'], summary: 'List users', parameters: listParams(), responses: ok() },
      post: { tags: ['Users'], summary: 'Create user', requestBody: body({ name: 'string', email: 'string', password: 'string', role_id: 'integer', state_id: 'integer', campus_id: 'integer' }), responses: ok('Created') },
    },
    '/users/{id}': {
      put: { tags: ['Users'], summary: 'Update user', parameters: [idParam()], responses: ok() },
      delete: { tags: ['Users'], summary: 'Soft-delete user', parameters: [idParam()], responses: ok('No Content') },
    },
    '/users/{id}/status': { patch: { tags: ['Users'], summary: 'Toggle active status', parameters: [idParam()], responses: ok() } },
  },
};

function ok(desc = 'OK') { return { 200: { description: desc }, 401: { description: 'Unauthenticated' }, 403: { description: 'No permission' } }; }
function idParam() { return { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }; }
function listParams() { return [
  { name: 'page', in: 'query', schema: { type: 'integer' } },
  { name: 'limit', in: 'query', schema: { type: 'integer' } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
]; }
function body(props) {
  const properties = {};
  for (const [k, t] of Object.entries(props)) properties[k] = { type: t };
  return { required: true, content: { 'application/json': { schema: { type: 'object', properties } } } };
}

function mountSwagger(app) {
  app.get('/openapi.json', (req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'EduSlot User Service — API Docs' }));
}

module.exports = { mountSwagger, spec };
