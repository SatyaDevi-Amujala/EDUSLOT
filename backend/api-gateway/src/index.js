const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const ENROLL_SERVICE_URL = process.env.ENROLLMENT_SERVICE_URL || process.env.BOOKING_SERVICE_URL || 'http://localhost:4002';
const MASTER_SERVICE_URL = process.env.MASTER_SERVICE_URL || 'http://localhost:4003';

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    upstream: { users: USER_SERVICE_URL, masters: MASTER_SERVICE_URL, enrollments: ENROLL_SERVICE_URL },
  });
});

// Aggregated docs landing page → links to each service's Swagger UI.
app.get('/docs', (req, res) => {
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8">
    <title>EduSlot — API Docs</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:48px;}
      h1{font-size:28px;margin:0 0 8px}p{color:#94a3b8;margin:0 0 32px}
      .grid{display:grid;gap:16px;max-width:640px}
      a{display:block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;
        color:#e2e8f0;text-decoration:none;transition:.15s}
      a:hover{border-color:#3b6cf6;transform:translateY(-2px)}
      .t{font-size:18px;font-weight:600}.d{color:#94a3b8;font-size:14px;margin-top:4px}
    </style></head><body>
    <h1>📘 EduSlot — API Documentation</h1>
    <p>Interactive Swagger UI for each microservice (open via the gateway).</p>
    <div class="grid">
      <a href="${USER_SERVICE_URL}/docs"><div class="t">User &amp; Access Service</div><div class="d">Auth, roles, pages, permissions, users — :4001/docs</div></a>
      <a href="${MASTER_SERVICE_URL}/docs"><div class="t">Master Data Service</div><div class="d">States, campuses, categories, instructors, courses — :4003/docs</div></a>
      <a href="${ENROLL_SERVICE_URL}/docs"><div class="t">Enrollment Service</div><div class="d">Course browsing &amp; enrollments — :4002/docs</div></a>
    </div></body></html>`);
});

const proxy = (target, prefix) =>
  createProxyMiddleware({ target, changeOrigin: true, pathRewrite: (path) => `${prefix}${path}`, logger: console });

// Identity & access → user-service
app.use('/auth', proxy(USER_SERVICE_URL, '/auth'));
app.use('/users', proxy(USER_SERVICE_URL, '/users'));
app.use('/roles', proxy(USER_SERVICE_URL, '/roles'));
app.use('/pages', proxy(USER_SERVICE_URL, '/pages'));

// Masters → master-service
app.use('/masters', proxy(MASTER_SERVICE_URL, '/masters'));

// Courses (browse) + enrollments → enrollment-service
app.use('/courses', proxy(ENROLL_SERVICE_URL, '/courses'));
app.use('/enrollments', proxy(ENROLL_SERVICE_URL, '/enrollments'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[api-gateway] listening on :${PORT}`);
  console.log(`  /auth /users /roles /pages -> ${USER_SERVICE_URL}`);
  console.log(`  /masters                   -> ${MASTER_SERVICE_URL}`);
  console.log(`  /courses /enrollments      -> ${ENROLL_SERVICE_URL}`);
  console.log(`  /docs (aggregated)         -> service Swagger UIs`);
});
