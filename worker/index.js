// Worker entry: the three API endpoints, the weekly retention cleanup, and the static site from dist/.
import { onRequestPost as event } from '../functions/api/event.js';
import { onRequestPost as report } from '../functions/api/report.js';
import { onRequestPost as subscribe } from '../functions/api/subscribe.js';
import { json } from '../functions/api/_shared.js';
import { runCleanup } from '../src/lib/retention.js';

const API = { '/api/event': event, '/api/report': report, '/api/subscribe': subscribe };

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const handler = API[pathname.replace(/\/$/, '')];
    if (handler) {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      return handler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env) {
    await runCleanup(env.DB, new Date(controller.scheduledTime));
  },
};
