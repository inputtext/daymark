// Run against an authorized staging backend only, never production by default.
// k6 run -e BASE_URL=https://your-staging-app.example -e AUTH_TOKEN=... tests/load/tasks.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failures = new Rate('task_request_failures');
const latency = new Trend('task_request_duration', true);
export const options = {
  stages: [{ duration: '30s', target: 10 }, { duration: '1m', target: 50 },
    { duration: '1m', target: 100 }, { duration: '30s', target: 0 }],
  thresholds: { task_request_failures: ['rate<0.01'], task_request_duration: ['p(95)<1000'] },
};
const base = __ENV.BASE_URL;
const token = __ENV.AUTH_TOKEN;
if (!base || !/^https:\/\//.test(base) || !token) {
  throw new Error('Set HTTPS BASE_URL for an authorized staging InsForge backend and AUTH_TOKEN');
}
export default function () {
  const url = base.replace(/\/$/, '') + '/api/database/records/tasks?limit=20';
  const res = http.get(url, { headers: { Authorization: 'Bearer ' + token } });
  const ok = check(res, { 'successful task read': r => r.status >= 200 && r.status < 300 });
  failures.add(!ok);
  latency.add(res.timings.duration);
  sleep(1);
}
