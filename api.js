import { createServer } from 'node:http';
import { parse } from 'node:url';

const events = [];

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const server = createServer((req, res) => {
  const { method, url } = req;
  const { pathname } = parse(url);

  if (method === 'GET' && pathname === '/') {
    return sendResponse(res, 200, { message: 'Hello World' });
  }

  if (method === 'GET' && pathname === '/events') {
    return sendResponse(res, 200, events);
  }

  if (method === 'POST' && pathname === '/events') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const event = JSON.parse(body);
      const newEvent = { id: generateId(), ...event };
      events.push(newEvent);
      sendResponse(res, 201, newEvent);
    });
    return;
  }

  if (method === 'DELETE' && pathname.startsWith('/events/')) {
    const id = pathname.split('/')[2];
    const index = events.findIndex(event => event.id === id);
    if (index !== -1) {
      events.splice(index, 1);
      return sendResponse(res, 204);
    }
    return sendResponse(res, 404, { message: 'Event not found' });
  }

  sendResponse(res, 404, { message: 'Not Found' });
});

const sendResponse = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
