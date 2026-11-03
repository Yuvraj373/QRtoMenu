const { EventEmitter } = require('events');

// In-process pub/sub for live order updates. Fine for a single server instance
// (Render free/starter); multiple instances would need Redis or Mongo change streams.
const bus = new EventEmitter();
bus.setMaxListeners(0);

// Turns a response into a Server-Sent Events stream and returns a send(event, data) function
function openStream(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  // Proxies close idle connections; a comment line every 20s keeps it open
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => clearInterval(ping));
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

module.exports = { bus, openStream };
