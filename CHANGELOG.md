# Changelog

## [0.0.1] - 2026-03-30

### Bug Fixes — Critical

- **Fixed overdue invoice auto-transition**: `updateOverdueInvoices()` WHERE clause was checking `status = 'Overdue'` (no-op) instead of `status = 'Sent'`, so invoices were never automatically marked overdue on app startup (`electron/database/invoice.ts`)
- **Fixed systemic IPC listener leak in preload**: `removeMessage` was a silent no-op because `onMessage` registered an anonymous wrapper with `ipcRenderer.on()` but `removeMessage` tried to remove the original callback. Added a `Map` to track wrapper→callback associations so listeners are properly cleaned up (`electron/preload.ts`)

### Bug Fixes — High

- **Removed dead duplicate `updateOverdueInvoices`**: Local function in `main.ts` duplicated the (now-fixed) logic from `invoice.ts` but was never called — removed to reduce confusion
- **Fixed double migration on startup**: `migrate()` was called as a module-level side effect in `migrate.ts` and again explicitly in `app.on('ready')`, causing duplicate log output (`electron/database/migrate.ts`)
- **Fixed attachment upload race condition**: `InvoiceAttachments.tsx` was calling `sendMessage` before registering the `onMessage` listener, risking a missed response. Listener now registers first
- **Fixed bulk Mark as Paid ignoring invoice status**: Bulk action applied to all selected invoices regardless of status. Now restricted to `Sent`/`Overdue` only, with a toast showing how many were skipped (`BulkActions.tsx`)

### Bug Fixes — Medium

- **Fixed `showSaveDialog` bypassing safe wrapper**: Was using raw `window.electronAPI` instead of `safeElectronAPI`, bypassing the availability check (`electron-api.ts`)
- **Added status colors to CustomerView invoice-tab chips**: Status count chips in the Invoices tab were missing `getStatusCssColor` styling, inconsistent with the rest of the app (`CustomerView.tsx`)
- **Replaced `window.location.hash` with `navigate()`**: Three files (`InvoiceList.tsx`, `CustomerList.tsx`, `ProductList.tsx`) used hash assignment for navigation instead of React Router's `navigate()`, causing non-SPA transitions
- **Removed dead `getStatusColor` (Tailwind version)**: All call sites were previously migrated to `getStatusCssColor`; the old Tailwind-class version was unused dead code (`invoice-status.ts`)
- **Consolidated duplicate type declarations**: Deleted redundant `electron.d.ts`; canonical `ElectronAPI` interface remains in `index.ts` with `export {}` for module compatibility

### Bug Fixes — Low

- **Dashboard date filter now applies to all charts**: `dateRange` filter previously only affected stat cards; revenue history, status breakdown, recent invoices, and monthly comparison charts now respect the selected date range (`Home.tsx`)
- **Added legend to pie chart**: Status breakdown pie chart was missing a `<Legend />` component, making it impossible to identify statuses without hovering (`Home.tsx`)
- **Removed dead `initAppSettings` export**: The `app_settings` table is created by migration 004; the unused `initAppSettings()` function in `backup.ts` was dead code

### Improvements (from prior audit rounds)

- **Mark as Paid consistency**: Added "Mark as Paid" to invoice row context menu, disabled for non-Sent/Overdue invoices. Consistent across row menu, detail view, and bulk actions
- **Send/Resend button gating**: Send button disabled for Cancelled/Paid invoices in both list and detail views
- **Status chip styling**: All status chips across the app use `getStatusCssColor` with MUI `sx` prop
- **Error boundaries**: Added `ErrorBoundary` component wrapping the app for graceful crash recovery
- **Loader error handling**: All async data loaders wrapped in `try/catch` with user-facing toast errors
- **Pre-delete referential checks**: Customers and products cannot be deleted when referenced by invoices/line items
- **Stale closure fixes**: `CustomerForm`, `ProductForm`, and `InvoiceAttachments` use `useRef` to prevent stale state in event handlers
- **IPC listener management**: `api.ts` uses `requestId`-based singleton pattern for database responses and single-use listeners with timeouts for other IPC calls
- **Cleaned up raw IPC in export utilities**: Removed raw `ipcRenderer` usage from `export.ts`; documented safe API usage
