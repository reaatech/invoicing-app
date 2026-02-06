import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const dataDir = app.getPath('userData');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'invoicing-app.db');
const db = new Database(dbPath, { verbose: console.log });

export { db as default };
