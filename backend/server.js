// server.js

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
dotenv.config();
import db from './models/index.js';
import mountRoutes from './routes/mountRoutes.js';
import { startAttendanceScheduler } from './services/processAttendance.js';
import { seedInitialUser } from './services/seedInitialUser.js';
const app = express();
const PORT = process.env.PORT || 5000;
const shouldSync = process.env.DB_SYNC === "true";
const shouldAlter = process.env.DB_SYNC_ALTER === "true";

// Middleware
app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health & root endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Payroll Management API is running!' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Mount all routes from the separate file
mountRoutes(app);

// Start server
db.sequelize.authenticate()
  .then(async () => {
    console.log('Database connection established successfully.');
    if (shouldSync === "true") {
      await db.sequelize.sync({
        alter: true
      });
      console.log('All models were synchronized successfully.');
    } else {
      console.log('DB sync disabled (DB_SYNC != "true").');
    }

    if (String(process.env.SEED_INITIAL_USER || "true").toLowerCase() === "true") {
      await seedInitialUser(db);
    } else {
      console.log('Initial user seed disabled (SEED_INITIAL_USER != true).');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (String(process.env.ATTENDANCE_CRON_ENABLED || "true").toLowerCase() === "true") {
        startAttendanceScheduler();
      } else {
        console.log("Attendance cron disabled (ATTENDANCE_CRON_ENABLED != true).");
      }
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

export default app;
