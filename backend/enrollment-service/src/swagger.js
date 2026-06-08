// Serves interactive API docs at /docs and the raw spec at /openapi.json.
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.0',
  info: { title: 'EduSlot — Enrollment Service', version: '1.0.0', description: 'Browse courses with live seat counts and manage enrollments.' },
  servers: [{ url: 'http://localhost:4002', description: 'direct' }, { url: 'http://localhost:3000', description: 'via gateway' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  security: [{ bearerAuth: [] }],
  tags: [{ name: 'Courses' }, { name: 'Enrollments' }],
  paths: {
    '/courses': { get: { tags: ['Courses'], summary: 'Browse active courses with live seats_left', responses: ok() } },
    '/courses/{id}/seats': { get: { tags: ['Courses'], summary: 'Live seat count for one course', parameters: [idParam()], responses: ok() } },
    '/enrollments': {
      get: { tags: ['Enrollments'], summary: 'List enrollments (student → own; staff/admin → all)', responses: ok() },
      post: { tags: ['Enrollments'], summary: 'Enroll in a course (takes a seat)', requestBody: body({ course_id: 'integer' }), responses: { 201: { description: 'Enrolled' }, 409: { description: 'Full or already enrolled' } } },
    },
    '/enrollments/{id}/drop': { patch: { tags: ['Enrollments'], summary: 'Drop a course (frees the seat)', parameters: [idParam()], responses: ok() } },
  },
};

function ok(desc = 'OK') { return { 200: { description: desc }, 401: { description: 'Unauthenticated' }, 403: { description: 'No permission' } }; }
function idParam() { return { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }; }
function body(props) {
  const properties = {};
  for (const [k, t] of Object.entries(props)) properties[k] = { type: t };
  return { required: true, content: { 'application/json': { schema: { type: 'object', properties } } } };
}

function mountSwagger(app) {
  app.get('/openapi.json', (req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'EduSlot Enrollment Service — API Docs' }));
}

module.exports = { mountSwagger, spec };
