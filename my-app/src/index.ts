import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import invoiceRoutes from './business/index.js';

const app = new Hono()

app.route('/api/invoices', invoiceRoutes);

serve({ fetch: app.fetch, port: 3000}, (info) => { console.log(`Server is running on http://localhost:${info.port}`)})