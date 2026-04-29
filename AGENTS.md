# AGENTS.md — Invoicing App

> Comprehensive guide for AI agents and developers working on this codebase.

---

## Project Summary

A standalone **Electron + React** desktop application for macOS (with Windows/Linux build targets) that manages customers, products, and invoices with email delivery via SMTP. Replaces QuickBooks for simple contractor invoicing.

**Current version**: `0.0.1`

---

## Tech Stack

| Layer        | Technology                     | Notes                                                            |
| ------------ | ------------------------------ | ---------------------------------------------------------------- |
| Shell        | Electron 40                    | Main process + preload with `contextIsolation: true`             |
| Frontend     | React 19, TypeScript ~5.9      | HashRouter for Electron compatibility                            |
| UI Framework | MUI 7 (Material UI)            | Theme created in `App.tsx`, dark/light mode support              |
| Icons        | Lucide React                   | Used across sidebar, status chips, etc.                          |
| Styling      | Tailwind CSS 4 + MUI `sx` prop | PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`)     |
| Database     | SQLite via `better-sqlite3`    | Synchronous, stored in Electron `userData`                       |
| PDF          | Puppeteer (headless Chrome)    | Renders Mustache HTML templates to PDF                           |
| Email        | Nodemailer                     | SMTP with retry + exponential backoff                            |
| Templates    | Mustache.js                    | `src/templates/invoice.mustache`, `src/templates/email.mustache` |
| Bundler      | Vite 7                         | `base: './'` for Electron file:// protocol                       |
| Packaging    | Electron Builder 26            | Outputs `.dmg` (mac), `.exe`/NSIS (win), AppImage (linux)        |

---

## Repository Layout

```
invoicing-app/
├── electron/                    # Electron main process (Node.js)
│   ├── main.ts                  # App entry, IPC handlers, window creation
│   ├── preload.ts               # Context bridge (sendMessage/onMessage/removeMessage)
│   ├── email-sender.ts          # Invoice email: PDF gen + SMTP send with retry
│   ├── types.d.ts               # Module declarations (better-sqlite3)
│   └── database/
│       ├── db.ts                # SQLite connection (userData/invoicing-app.db)
│       ├── migrate.ts           # Migration runner (reads .sql files, tracks schema_migrations)
│       ├── invoice.ts           # updateOverdueInvoices() — marks Sent → Overdue
│       ├── backup.ts            # 7-day backup reminder, copies .db file
│       └── migrations/
│           ├── 001_initial.sql          # Core tables
│           ├── 002_add_indexes.sql      # Performance indexes
│           ├── 003_default_settings.sql # Seed default company settings
│           ├── 004_add_app_settings.sql # Key-value app_settings table
│           ├── 005_add_invoice_attachments.sql
│           ├── 006_add_required_constraints.sql
│           └── 007_add_soft_delete.sql  # invoices.deleted_at column
│
├── src/                         # React renderer process (bundled by Vite)
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component: routing, MUI theme, dark mode, splash
│   ├── App.css                  # Splash screen styles
│   ├── index.css                # Tailwind import + base styles
│   ├── types/
│   │   └── index.ts             # ElectronAPI interface, Window augmentation
│   ├── services/
│   │   └── api.ts               # IPC wrapper: query, saveSettings, sendInvoice, etc.
│   ├── utils/
│   │   ├── electron-api.ts      # safeElectronAPI wrapper, isElectronAvailable()
│   │   ├── invoice-status.ts    # getStatusCssColor, getStatusIcon, canEdit/canDelete
│   │   └── export.ts            # downloadExportedData, readImportFile helpers
│   ├── hooks/
│   │   └── useMediaQuery.ts     # useIsMobile, useIsTablet, useIsDesktop
│   ├── templates/
│   │   ├── invoice.mustache     # HTML invoice template (rendered to PDF)
│   │   └── email.mustache       # Email body template
│   └── components/
│       ├── Home.tsx                     # Dashboard with charts (Recharts)
│       ├── Layout/
│       │   ├── Sidebar.tsx              # Permanent MUI Drawer with NavLinks
│       │   ├── Header.tsx               # Top bar with dark mode toggle
│       │   ├── Breadcrumbs.tsx
│       │   └── ThemeSwitcher.tsx
│       ├── Customers/
│       │   ├── CustomerList.tsx
│       │   ├── CustomerForm.tsx
│       │   └── CustomerView.tsx
│       ├── Products/
│       │   ├── ProductList.tsx
│       │   ├── ProductForm.tsx
│       │   └── ProductView.tsx
│       ├── Invoices/
│       │   ├── InvoiceList.tsx          # List with filters, bulk select
│       │   ├── InvoiceForm.tsx          # Create/edit with line items
│       │   ├── InvoiceView.tsx          # Read-only detail view
│       │   ├── InvoiceAttachments.tsx   # File upload/delete for invoices
│       │   └── BulkActions.tsx          # Mark as Paid, delete (draft only)
│       ├── Settings/
│       │   ├── SettingsForm.tsx         # Company info + SMTP config
│       │   └── SMTPConfig.tsx
│       └── ui/
│           ├── ErrorBoundary.tsx        # Class component, wraps entire app
│           ├── EmptyState.tsx
│           ├── LoadingSpinner.tsx
│           └── SkeletonLoader.tsx
│
├── public/                      # Static assets (icons)
├── src/assets/                  # Vite-processed assets (react.svg for splash)
│
├── package.json                 # type: "module", scripts below
├── vite.config.ts               # base: './', react plugin
├── postcss.config.js            # @tailwindcss/postcss + autoprefixer
├── electron-builder.json        # Build config, extraResources for templates
├── tsconfig.json                # Root: references app, node, preload configs
├── tsconfig.app.json            # Renderer: ESNext, react-jsx, bundler resolution
├── tsconfig.node.json           # Main process: ES2022, outDir dist/electron
├── tsconfig.preload.json        # Preload: CommonJS (required by Electron)
└── eslint.config.js
```

---

## Build & Run

### Development

```bash
# Terminal 1 — Start Vite dev server
npm run dev

# Terminal 2 — Start Electron (connects to Vite at localhost:5175)
npm run dev:electron
```

The dev server port in `electron/main.ts` is hardcoded to `http://localhost:5175`. If Vite starts on a different port, update the URL in `createWindow()`.

### Production Build

```bash
npm run build:electron
```

This single command:

1. Compiles `electron/` → `dist/electron/` via `tsconfig.node.json`
2. Compiles `electron/preload.ts` → `dist/electron/preload.js` via `tsconfig.preload.json` (CommonJS)
3. Runs `vite build --outDir dist/electron/app`
4. Copies migration `.sql` files to `dist/electron/database/migrations/`
5. Copies `src/templates/*` to `dist/electron/templates/`
6. Runs `electron-builder`

Output lands in `release/`.

### Start Built App (without packaging)

```bash
npm run start:electron
```

---

## Architecture & Key Patterns

### IPC Communication

The app uses Electron's IPC with strict `contextIsolation: true`. All renderer ↔ main communication flows through the preload bridge.

**Preload** (`electron/preload.ts`):

- Exposes `window.electronAPI` with `sendMessage`, `onMessage`, `removeMessage`
- Uses a `Map<callback, wrapper>` to correctly track and remove IPC listeners
- Whitelists valid send/receive channel names

**Renderer** (`src/services/api.ts`):

- Wraps all IPC calls with Promises + timeouts
- Database queries use a `requestId`-based singleton listener pattern (one persistent `database-response` listener, dispatches by request ID)
- Non-database IPC uses single-use listeners: register → send → receive → unregister
- All methods go through `safeElectronAPI` from `electron-api.ts` which gracefully handles non-Electron environments

**IPC Channels:**

| Send Channel              | Response Channel             | Purpose                              |
| ------------------------- | ---------------------------- | ------------------------------------ |
| `database-query`          | `database-response`          | Generic SQL queries (with requestId) |
| `settings-save`           | `settings-response`          | Save company/SMTP settings           |
| `invoice-send`            | `invoice-response`           | Generate PDF + email invoice         |
| `generate-pdf`            | `pdf-response`               | Generate PDF only                    |
| `export-data`             | `export-response`            | Export all data as JSON              |
| `import-data`             | `import-response`            | Import JSON data                     |
| `get-next-invoice-number` | `invoice-number-response`    | Sequential invoice numbering         |
| `show-save-dialog`        | `show-save-dialog-response`  | Native save file dialog              |
| `show-open-dialog`        | `show-open-dialog-response`  | Native open file dialog              |
| `upload-attachment`       | `upload-attachment-response` | Upload invoice attachment            |
| `delete-attachment`       | `delete-attachment-response` | Delete invoice attachment            |

### Database

- **Engine**: `better-sqlite3` (synchronous)
- **Location**: `app.getPath('userData')/invoicing-app.db`
- **Migrations**: Numbered `.sql` files in `electron/database/migrations/`. Runner reads `schema_migrations` table, applies pending ones in order. Runs once on `app.on('ready')`.
- **Migration file naming**: `NNN_description.sql` — version parsed from prefix before first `_` or `-`
- **Backups**: Copied `.db` files in `userData/backups/`, 7-day reminder via `app_settings.lastBackupDate`

### Invoice Status Workflow

```
Draft → Sent       (when email is sent successfully)
Sent → Paid        (manual: "Mark as Paid")
Sent → Overdue     (automatic: updateOverdueInvoices on app launch)
Any → Cancelled    (manual action)
```

- Only **Draft** invoices can be edited
- Only **Draft** or **Cancelled** invoices can be deleted
- "Mark as Paid" restricted to **Sent** / **Overdue** status
- Overdue auto-transition runs at startup in `app.on('ready')` via `updateOverdueInvoices()`

### Dark Mode

- State managed in `App.tsx` via `useState<boolean>`, persisted to `localStorage('darkMode')`
- Initializes from localStorage or system `prefers-color-scheme`
- Toggles both `document.documentElement.classList` (for Tailwind `dark:` classes) and MUI `createTheme({ palette: { mode } })`
- Toggle exposed via `Header.tsx` → `ThemeSwitcher.tsx`

### Error Handling

- **ErrorBoundary**: Class component wrapping the entire app in `App.tsx`
- **IPC timeouts**: All `api.ts` methods have `setTimeout`-based deadlines (5s for DB, 10s for PDF/export, 60s for email)
- **Email retry**: 3 attempts with exponential backoff in `email-sender.ts`
- **Puppeteer timeouts**: `withTimeout()` wrapper for each Puppeteer stage (launch, new page, render, PDF gen)
- **Data loaders**: All async data fetches wrapped in try/catch with toast error notifications

---

## Database Schema

### Core Tables

| Table                 | Key Columns                                                                                   | Notes                                           |
| --------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `settings`            | company*name, smtp*\*, logo_base64                                                            | Single row (id=1), stores company + SMTP config |
| `customers`           | name, email, billing_address, phone, notes                                                    | FK referenced by invoices                       |
| `products`            | name, unit_price, unit_type, description                                                      | FK referenced by invoice_line_items             |
| `invoices`            | invoice_number (unique), customer_id, status, subtotal, total, deleted_at                     | Soft delete via migration 007                   |
| `invoice_line_items`  | invoice_id, product_id, product_name (snapshot), unit_price, quantity, line_total, sort_order | Snapshots price at creation time                |
| `email_logs`          | invoice_id, recipient_email, status (success/failed), error_message                           |                                                 |
| `invoice_attachments` | invoice_id, filename, original_filename, file_path, file_size                                 | Files stored in `userData/attachments/`         |
| `app_settings`        | key, value                                                                                    | Key-value store (e.g., `lastBackupDate`)        |
| `schema_migrations`   | version, applied_at                                                                           | Migration tracking                              |

### Indexed Columns

- `invoices`: invoice_number, customer_id, status, due_date, deleted_at
- `invoice_line_items`: invoice_id
- `email_logs`: invoice_id
- `invoice_attachments`: invoice_id

---

## Coding Conventions & Rules

### TypeScript

- **Strict mode** enabled across all tsconfigs
- Three separate tsconfigs with different module systems:
  - `tsconfig.app.json` — renderer: ESNext modules, bundler resolution, `react-jsx`
  - `tsconfig.node.json` — main process: ES2022, Node resolution, emits to `dist/electron/`
  - `tsconfig.preload.json` — preload: **CommonJS** (required by Electron), emits to `dist/electron/`
- The preload script **must** remain CommonJS. Do not change its module type.
- `noUnusedLocals` and `noUnusedParameters` are enabled — remove dead code, don't leave it commented out

### Styling

- **Primary approach**: MUI components with `sx` prop for layout and theming
- **Tailwind**: Used via `@import "tailwindcss"` in `index.css`; utility classes used sparingly alongside MUI
- **PostCSS plugin**: Must be `@tailwindcss/postcss` (not `tailwindcss`). Using the wrong name breaks the build.
- **Status colors**: Always use `getStatusCssColor()` from `invoice-status.ts` with MUI `sx` prop — never use Tailwind color classes for status chips
- **No inline Tailwind for status**: The old `getStatusColor` (Tailwind class version) was removed; all call sites use `getStatusCssColor` (returns CSS hex)

### Navigation

- Use React Router's `navigate()` — never use `window.location.hash` assignment
- Router is `HashRouter` (required for Electron `file://` protocol)
- Routes defined in `App.tsx`

### IPC Safety

- **Always** use `safeElectronAPI` from `electron-api.ts` — never access `window.electronAPI` directly
- Always register the `onMessage` listener **before** calling `sendMessage` to avoid race conditions
- Always clean up listeners after receiving a response (use the `removeMessage` API)
- Use `useRef` for callbacks passed to IPC in React components to avoid stale closures
- The `database-response` listener is a singleton (registered once); other channels use single-use listeners

### Data Integrity

- **Referential checks before delete**: Customers and products cannot be deleted if referenced by invoices/line items
- **Bulk actions**: Must validate status before applying (e.g., "Mark as Paid" only for Sent/Overdue)
- **Import validation**: All required fields checked before transaction begins
- **Transactions**: Data import uses `db.transaction()` for atomicity

### File Organization

- One component per file
- Components grouped by domain: `Customers/`, `Products/`, `Invoices/`, `Settings/`, `Layout/`, `ui/`
- Shared UI primitives in `components/ui/`
- Business logic utilities in `utils/`
- All IPC/data access in `services/api.ts`
- Types in `src/types/index.ts` (canonical `ElectronAPI` interface)

---

## Adding New Features

### Adding a New IPC Channel

1. **Preload** (`electron/preload.ts`): Add channel names to `validSendChannels` and `validReceiveChannels` arrays
2. **Main** (`electron/main.ts`): Add `ipcMain.on('channel-name', ...)` handler
3. **API** (`src/services/api.ts`): Add a new method following the existing pattern (Promise + timeout + listener cleanup)
4. **Types**: If the response has a new shape, add types in `src/types/index.ts`

### Adding a New Database Migration

1. Create `electron/database/migrations/NNN_description.sql` (next sequential number)
2. Write idempotent SQL (use `IF NOT EXISTS` where possible)
3. Migrations run automatically on app startup — no registration needed
4. The migration runner extracts the version number from the filename prefix (digits before the first `_` or `-`)

### Adding a New Route/Page

1. Create component in appropriate `src/components/` subdirectory
2. Add `<Route>` in `App.tsx`
3. Add navigation item in `Sidebar.tsx` if it should appear in the nav
4. Wrap async data loading in try/catch with `toast.error()`

### Adding a New Entity

1. Write a migration SQL for the new table
2. Add IPC handlers in `main.ts` or a new dedicated handler file (import it in `main.ts`)
3. Add API methods in `api.ts`
4. Create List, Form, and View components
5. Add routes and sidebar entry

---

## Known Gotchas & Historical Bugs

These are patterns that have caused bugs before. Be vigilant about them.

1. **PostCSS plugin name**: Must be `@tailwindcss/postcss` in `postcss.config.js`, not `tailwindcss`
2. **Preload listener leak**: `onMessage` wraps callbacks before passing to `ipcRenderer.on()`. The `listenerMap` tracks wrapper→callback associations. Without this, `removeMessage` silently fails.
3. **Overdue transition WHERE clause**: Must check `status = 'Sent'` (not `status = 'Overdue'`). The fixed version is in `electron/database/invoice.ts`.
4. **Race condition in IPC**: Always register `onMessage` before `sendMessage`. The attachment upload component had this bug.
5. **Stale closures in React + IPC**: Use `useRef` for values accessed inside IPC callbacks in `useEffect`. `CustomerForm`, `ProductForm`, and `InvoiceAttachments` all needed this fix.
6. **Double migration**: `migrate()` must only be called once — in `app.on('ready')`. Do not call it as a module side-effect.
7. **Dev server port**: Hardcoded to `5175` in `main.ts`. If Vite picks a different port, the Electron window will show an error page.
8. **Packaged app file paths**: `createWindow()` tries multiple paths for `index.html` in packaged mode. If build output structure changes, update the path array.
9. **Template paths differ**: Dev uses `__dirname/../../src/templates/`, packaged uses `process.resourcesPath/templates/`. Both `main.ts` and `email-sender.ts` have this logic — keep them in sync.

---

## Testing Checklist

No automated test suite exists yet. When testing manually or adding tests, verify:

- [ ] Invoice number auto-generation (starts at 1001, increments sequentially)
- [ ] Invoice status transitions (Draft → Sent → Paid/Overdue, cancellation)
- [ ] Overdue auto-detection on app launch
- [ ] PDF generation (template renders, file saves)
- [ ] Email send with PDF attachment (SMTP config required)
- [ ] Email retry on transient failure
- [ ] Export data → import on fresh DB → verify integrity
- [ ] Bulk actions respect status constraints
- [ ] Customer/product delete blocked when referenced by invoices
- [ ] Dark mode toggle persists across reload
- [ ] IPC listener cleanup (no accumulating listeners on repeated actions)
- [ ] Backup reminder triggers after 7 days
- [ ] Migrations run cleanly on a fresh database (delete .db, restart)
- [ ] Packaged app loads `index.html` correctly

---

## Dependencies of Note

| Package                | Why It Matters                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `better-sqlite3`       | Native module — must match Electron's Node version. Rebuild after Electron upgrades with `electron-rebuild`.                               |
| `puppeteer`            | Downloads Chromium. Large dependency. `PUPPETEER_EXECUTABLE_PATH` env var can override. In packaged builds, ensure Chromium is accessible. |
| `@tailwindcss/postcss` | Tailwind v4 PostCSS integration. Plugin name is **not** `tailwindcss`.                                                                     |
| `react-hot-toast`      | Toast notifications. Configured in `App.tsx` with dark mode CSS variables.                                                                 |
| `recharts`             | Dashboard charts in `Home.tsx`.                                                                                                            |
| `@mui/x-data-grid`     | Data grid component (available but may not be used in all list views).                                                                     |

---

## Security Notes

- SMTP credentials stored in plaintext in SQLite (local file). macOS Keychain integration is a future enhancement.
- `contextIsolation: true` and `nodeIntegration: false` — the renderer cannot access Node.js directly
- IPC channels are whitelisted in the preload script
- Template inputs should be sanitized to prevent injection (Mustache auto-escapes HTML by default)
- No external API calls — fully offline after SMTP setup
