// Serves interactive API docs at /docs and the raw spec at /openapi.json.
const swaggerUi = require('swagger-ui-express');

const entity = (base, tag, listExtra = '') => ({
  [base]: {
    get: { tags: [tag], summary: `List ${tag.toLowerCase()} (paginated; ?all=1 for dropdowns${listExtra})`, parameters: listParams(), responses: ok() },
    post: { tags: [tag], summary: `Create ${tag.toLowerCase()}`, responses: ok('Created') },
  },
  [`${base}/{id}`]: {
    get: { tags: [tag], summary: `Get one`, parameters: [idParam()], responses: ok() },
    put: { tags: [tag], summary: `Update`, parameters: [idParam()], responses: ok() },
    delete: { tags: [tag], summary: `Soft-delete`, parameters: [idParam()], responses: ok('No Content') },
  },
  [`${base}/{id}/status`]: { patch: { tags: [tag], summary: 'Toggle active status', parameters: [idParam()], responses: ok() } },
});

const spec = {
  openapi: '3.0.0',
  info: { title: 'EduSlot — Master Data Service', version: '1.0.0', description: 'CRUD for states, campuses, categories, instructors and courses.' },
  servers: [{ url: 'http://localhost:4003', description: 'direct' }, { url: 'http://localhost:3000', description: 'via gateway' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  security: [{ bearerAuth: [] }],
  tags: [{ name: 'States' }, { name: 'Campuses' }, { name: 'Categories' }, { name: 'Instructors' }, { name: 'Courses' }],
  paths: {
    ...entity('/masters/states', 'States'),
    ...entity('/masters/campuses', 'Campuses', '; ?unassigned=1 or ?stateId=N'),
    ...entity('/masters/categories', 'Categories'),
    ...entity('/masters/instructors', 'Instructors'),
    ...entity('/masters/courses', 'Courses'),
  },
};

function ok(desc = 'OK') { return { 200: { description: desc }, 401: { description: 'Unauthenticated' }, 403: { description: 'No permission' } }; }
function idParam() { return { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }; }
function listParams() { return [
  { name: 'page', in: 'query', schema: { type: 'integer' } },
  { name: 'limit', in: 'query', schema: { type: 'integer' } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
  { name: 'all', in: 'query', schema: { type: 'integer' } },
]; }

function mountSwagger(app) {
  app.get('/openapi.json', (req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'EduSlot Master Service — API Docs' }));
}

module.exports = { mountSwagger, spec };
