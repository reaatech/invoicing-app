import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function applyMigration(version: number, sql: string) {
  console.log(`Applying migration ${version}`);
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)') 
      .run(version, new Date().toISOString());
  } catch (error) {
    console.warn(`Migration ${version} partially applied or already exists:`, (error as Error).message);
    // Continue with migration process even if a table already exists
  }
}

function runMigrations(migrations: Array<{version: number, sql: string}>) {
  const appliedVersions = new Set(
    db.prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row: { version: number }) => row.version)
  );
  
  for (const {version, sql} of migrations) {
    if (!appliedVersions.has(version)) {
      applyMigration(version, sql);
    }
  }
}

export async function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME
    )
  `);
  
  console.log('SELECT version FROM schema_migrations');
  let migrationDir = path.join(__dirname, './migrations');
  if (!fs.existsSync(migrationDir)) {
    console.warn(`Migrations directory not found at ${migrationDir}, trying alternative path`);
    migrationDir = path.join(__dirname, '../database/migrations');
    if (!fs.existsSync(migrationDir)) {
      console.error(`Migrations directory not found at ${migrationDir}`);
      return;
    }
  }
  
  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      const aVersion = parseInt(a.split('-')[0]);
      const bVersion = parseInt(b.split('-')[0]);
      return aVersion - bVersion;
    });
  
  const migrations = migrationFiles.map(file => {
    const version = parseInt(file.split('-')[0]);
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
    return {version, sql};
  });
  
  runMigrations(migrations);
  console.log('All migrations completed.');
}

migrate();
