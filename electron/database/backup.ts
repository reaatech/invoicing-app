import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import db from './db.js';

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
const BACKUP_INTERVAL_DAYS = 7;
const LAST_BACKUP_KEY = 'lastBackupDate';

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Get the last backup date from app settings
function getLastBackupDate(): string | null {
  const result = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(LAST_BACKUP_KEY) as { value: string } | undefined;
  return result ? result.value : null;
}

// Set the last backup date in app settings
function setLastBackupDate(date: string) {
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(LAST_BACKUP_KEY, date);
}

// Create a backup of the database
function createBackup() {
  ensureBackupDir();
  const backupFileName = `invoicing-app-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  // SQLite backup
  const source = fs.readFileSync(path.join(app.getPath('userData'), 'invoicing-app.db'));
  fs.writeFileSync(backupPath, source);
  
  setLastBackupDate(new Date().toISOString());
  return backupPath;
}

// Check if a backup reminder is needed
function checkBackupReminder() {
  const lastBackupDateStr = getLastBackupDate();
  if (!lastBackupDateStr) {
    return true; // No backup ever made
  }
  
  const lastBackupDate = new Date(lastBackupDateStr);
  const daysSinceLastBackup = Math.floor((new Date().getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceLastBackup >= BACKUP_INTERVAL_DAYS;
}

// Show backup reminder dialog
export function showBackupReminder() {
  if (checkBackupReminder()) {
    dialog.showMessageBox({
      type: 'question',
      buttons: ['Backup Now', 'Remind Me Later'],
      defaultId: 0,
      title: 'Database Backup Reminder',
      message: 'It has been a while since your last backup. Would you like to create a backup of your invoicing data now?',
      detail: 'Regular backups protect against data loss. Backups are stored in a secure location.'
    }).then(response => {
      if (response.response === 0) {
        const backupPath = createBackup();
        dialog.showMessageBox({
          type: 'info',
          buttons: ['OK'],
          title: 'Backup Successful',
          message: `Backup created successfully at: ${backupPath}`
        });
      }
    });
  }
}

// Initialize app settings table if not exists
export function initAppSettings() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}
