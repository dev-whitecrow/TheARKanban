import { consola } from 'consola';
import { taskEvents } from '../write-queue.js';
import { getKSTISOString } from '../utils.js';
// Track connected SSE clients
const clients = new Set();
export function registerSSE(app) {
    app.get('/api/events', (req, res) => {
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        });
        // Send initial connection event
        res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE connected' })}\n\n`);
        // Add to client set
        clients.add(res);
        consola.info(`SSE client connected (total: ${clients.size})`);
        // Heartbeat every 30s to keep connection alive
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 30_000);
        // Cleanup on disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            clients.delete(res);
            consola.info(`SSE client disconnected (total: ${clients.size})`);
        });
    });
    // Listen to task events and broadcast to all SSE clients
    taskEvents.on('task:event', (event) => {
        const data = JSON.stringify({
            type: event.type,
            task: event.task.frontmatter,
            source: event.source,
            timestamp: getKSTISOString(),
        });
        for (const client of clients) {
            client.write(`event: ${event.type}\ndata: ${data}\n\n`);
        }
    });
}
/**
 * Get the number of connected SSE clients.
 */
export function getSSEClientCount() {
    return clients.size;
}
//# sourceMappingURL=sse.js.map