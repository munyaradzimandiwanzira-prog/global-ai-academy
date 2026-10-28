import proLessons from 'virtual:pro-lessons';
import { createRouter, requireUser } from '../app';
import { can } from '@shared/rbac';
import { effectivePlan } from '../lib/db';
import { notFound, upgradeRequired } from '../lib/errors';

/**
 * Paywalled lesson bodies. The public bundle only carries a teaser for these lessons, so the
 * paywall is enforced here rather than by hiding things in the browser.
 */
const content = createRouter();

content.get('/:trackId/:slug', (c) => {
  const blocks = proLessons[`${c.req.param('trackId')}/${c.req.param('slug')}`];
  if (!blocks) throw notFound('This lesson does not exist or is free to read.');
  const user = requireUser(c);
  if (!can({ role: user.role, plan: effectivePlan(user) }, 'content.pro')) {
    throw upgradeRequired('This lesson is part of a professional track. Upgrade to Plus or start your free trial to keep going.');
  }
  c.header('Cache-Control', 'private, no-store');
  return c.json({ blocks });
});

export default content;
