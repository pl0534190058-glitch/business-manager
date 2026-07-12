import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import taskRoutes from './routes/tasks';
import clientRoutes from './routes/clients';
import activityRoutes from './routes/activity';
import dashboardRoutes from './routes/dashboard';
import tabRoutes from './routes/tabs';
import { requireAuth } from './auth/middleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/employees', requireAuth, employeeRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/clients', requireAuth, clientRoutes);
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/tabs', requireAuth, tabRoutes);

app.listen(PORT, () => {
  console.log(`השרת פועל על פורט ${PORT}`);
});
