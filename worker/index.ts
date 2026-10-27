import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from './app';
import { HttpError } from './lib/errors';
import { sessionMiddleware, csrfMiddleware } from './lib/session';
import { sweep } from './lib/ratelimit';
import auth from './routes/auth';
import me from './routes/me';
import ai from './routes/ai';
import classrooms from './routes/classrooms';
import exams from './routes/exams';
import admin from './routes/admin';
import payments from './routes/payments';
import pub from './routes/public';
import projects from './routes/projects';
import capstones from './routes/capstones';

const app = new Hono<AppEnv>();

app.use('/api/*', secureHeaders({ crossOriginResourcePolicy: 'same-origin', referrerPolicy: 'strict-origin-when-cross-origin' }));
app.use('/api/*', bodyLimit({ maxSize: 128 * 1024, onError: (c) => c.json({ error: { code: 'too_large', message: 'Request is too large.' } }, 413) }));
app.use('/api/*', csrfMiddleware);
app.use('/api/*', sessionMiddleware);
app.use('/api/*', async (c, next) => {
  await next();
  if (!c.res.headers.has('cache-control')) c.res.headers.set('cache-control', 'no-store');
  // Housekeeping on ~1% of requests keeps D1 tidy without a cron trigger.
  if (Math.random() < 0.01) c.executionCtx.waitUntil(sweep(c.env.DB).catch(() => {}));
});

app.route('/api/auth', auth);
app.route('/api/me', me);
app.route('/api/ai', ai);
app.route('/api/classrooms', classrooms);
app.route('/api/exams', exams);
app.route('/api/admin', admin);
app.route('/api/payments', payments);
app.route('/api/projects', projects);
app.route('/api/capstones', capstones);
app.route('/api', pub);

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message, fields: err.fields } }, err.status as 400);
  }
  console.error('[unhandled]', c.req.method, c.req.path, err);
  return c.json({ error: { code: 'server_error', message: 'Something went wrong on our side. Try again in a moment.' } }, 500);
});

export default app;
