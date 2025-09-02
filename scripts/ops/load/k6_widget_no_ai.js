/*
  k6 load test: Widget flows without AI costs
  - Simulates many site visitors:
    1) Create/find dialog via /api/widget/dialogs (assistant_id + guest_id)
    2) Open WebSocket to /ws/widget/dialogs/{dialog_id}?assistant_id=...
    3) Send a couple of manager messages (sender='manager') to avoid AI generation

  Environment variables (set via `K6_*`):
  - API_BASE: Backend base URL (default: http://localhost:8000)
  - ASSISTANT_ID: Assistant ID to test against (required)
  - VUS: virtual users (default: 50)
  - DURATION: test duration (default: 1m)
*/

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const API_BASE = __ENV.API_BASE || 'http://localhost:8000';
const ASSISTANT_ID = __ENV.ASSISTANT_ID; // required

if (!ASSISTANT_ID) {
  throw new Error('ASSISTANT_ID env var is required, e.g. ASSISTANT_ID=123');
}

const isHttps = API_BASE.startsWith('https://');
const WS_BASE = (isHttps ? 'wss://' : 'ws://') + API_BASE.replace(/^https?:\/\//, '');

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    'checks': ['rate>0.98']
  }
};

function ensureDialog(assistantId, guestId) {
  const getUrl = `${API_BASE}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${encodeURIComponent(guestId)}`;
  const res = http.get(getUrl);
  check(res, { 'GET dialogs 200': r => r.status === 200 });
  let dialogId = null;
  try {
    const items = res.json();
    if (Array.isArray(items) && items.length > 0) {
      dialogId = items[0].id;
    }
  } catch (_) {}

  if (!dialogId) {
    const createUrl = `${API_BASE}/api/widget/dialogs?assistant_id=${assistantId}&guest_id=${encodeURIComponent(guestId)}`;
    const cr = http.post(createUrl, null, { headers: { 'Content-Type': 'application/json' } });
    check(cr, { 'POST dialog 200': r => r.status === 200 });
    dialogId = (cr.json() || {}).id;
  }
  return dialogId;
}

function sendManagerMessage(dialogId, assistantId, guestId, text) {
  const url = `${API_BASE}/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}&guest_id=${encodeURIComponent(guestId)}`;
  const payload = JSON.stringify({ sender: 'manager', text });
  const res = http.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'POST manager message 200': r => r.status === 200 });
}

export default function () {
  // Unique guest per VU; new guest each iteration to simulate cold sessions
  const guestId = `k6-${__VU}-${uuidv4()}`;

  // 1) Ensure dialog exists
  const dialogId = ensureDialog(ASSISTANT_ID, guestId);
  check(dialogId, { 'got dialogId': id => !!id });

  // 2) Open WebSocket, respond to pings with __pong__
  const wsUrl = `${WS_BASE}/ws/widget/dialogs/${dialogId}?assistant_id=${ASSISTANT_ID}`;
  ws.connect(wsUrl, {}, function (socket) {
    let pingCount = 0;
    socket.on('open', function () {
      // 3) Send a couple of manager messages (no AI cost)
      sendManagerMessage(dialogId, ASSISTANT_ID, guestId, 'k6 load test: hello');
    });
    socket.on('text', function (msg) {
      if (msg === '__ping__') {
        pingCount++;
        socket.send('__pong__');
      }
    });
    socket.on('error', function (e) {
      // swallow errors; checks will capture HTTP failures
    });
    // keep for a bit to measure WS stability
    sleep(1 + Math.random() * 2);
    socket.close();
  });

  // small pause between iterations
  sleep(0.5 + Math.random());
}



