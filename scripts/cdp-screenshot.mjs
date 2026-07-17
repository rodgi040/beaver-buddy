// CDP screenshot of the Beaver Buddy overlay renderer.
// Usage: node scripts/cdp-screenshot.mjs <port> <outfile> [delayMs]
const [port, outfile, delayMs = '8000'] = process.argv.slice(2);

const list = await fetch(`http://localhost:${port}/json`).then((r) => r.json());
const page = list.find((t) => t.type === 'page');
if (!page) {
  console.error('no page target found');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
};

await new Promise((resolve) => {
  ws.onopen = resolve;
});

await send('Page.enable');
await new Promise((r) => setTimeout(r, Number(delayMs)));

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFile } = await import('node:fs/promises');
await writeFile(outfile, Buffer.from(shot.data, 'base64'));
console.log(`saved ${outfile}`);
ws.close();
process.exit(0);
