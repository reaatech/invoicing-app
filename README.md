# Invoicing App

A free desktop invoicing application built with Electron, React, and TypeScript for managing customers, products, and invoices with email delivery and PDF generation.

This app was developed for contractors and freelancers who need a simple way to manage invoices without any fees.

See the [release files](https://github.com/reaatech/invoicing-app/releases) for pre-built binaries for macOS (Apple Silicon) and Windows.

## Features

### Core Functionality
- **Invoice Management**: Create, edit, duplicate, and manage invoices with line items
- **Customer Management**: Full CRUD operations for customer records with contact details
- **Product Management**: Manage product catalog with pricing and descriptions
- **Invoice Attachments**: Attach files to the email sent with the invoice delivery
- **Status Tracking**: Track invoice lifecycle (Draft, Sent, Paid, Overdue, Canceled)
- **Soft Delete**: Canceled and deleted invoices are preserved for audit purposes

### Automation & Communication
- **Email Delivery**: Send invoices via SMTP with customizable templates
- **PDF Generation**: Automatic PDF generation using Puppeteer and Mustache templates
- **BCC to Company**: Automatically BCC company email on all invoice sends
- **Automatic Status Updates**: Invoices automatically marked as Overdue when past due date

### Analytics & Reporting
- **Dashboard**: Real-time statistics for revenue, outstanding invoices, and totals
- **Revenue Trends**: 6-month revenue history with line charts
- **Status Breakdown**: Visual pie chart of invoice status distribution
- **Monthly Comparison**: Paid vs Outstanding revenue by month
- **Date Range Filtering**: Filter dashboard data by custom date ranges

### Data Management
- **Bulk Actions**: Mark multiple invoices as paid, cancel, or delete in bulk
- **Data Export/Import**: Export and import application data for backup or migration
- **Backup Reminders**: Automatic reminders to backup your data
- **Search & Filter**: Search and filter across invoices, customers, and products

### User Experience
- **Dark Mode**: Full dark mode support with system preference detection
- **Form Validation**: All forms validate required fields before submission
- **Responsive Design**: Optimized layout for different screen sizes
- **Toast Notifications**: Clear feedback for all user actions

## Tech Stack

### Frontend
- **React 19** with TypeScript for type-safe UI development
- **Material-UI (MUI)** for component library and design system
- **Tailwind CSS** for utility-first styling with dark mode
- **React Router** for client-side routing
- **Recharts** for dashboard charts and visualizations
- **Lucide React** for icons
- **React Hot Toast** for notifications

### Backend & Desktop
- **Electron 40** for cross-platform desktop application
- **SQLite** with `better-sqlite3` for local database
- **Nodemailer** for SMTP email delivery
- **Puppeteer** for PDF generation
- **Mustache.js** for email and PDF templates

### Build Tools
- **Vite** for fast development and optimized production builds
- **TypeScript** for type safety across the entire codebase
- **Electron Builder** for packaging and distribution
- **ESLint** for code quality

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/reaatech/invoicing-app.git
   cd invoicing-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Running in Development Mode

To run the application in development mode with hot-reload:

1. Start the Vite development server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start the Electron app:
   ```bash
   npm run dev:electron
   ```

The app will open automatically and reload when you make changes to the code.

## Building for Production

### Build the Application

To build the Electron application for your platform:

```bash
npm run build:electron
```

This command will:
1. Compile TypeScript files for Electron main process
2. Build the React frontend with Vite
3. Copy necessary files (migrations, templates)
4. Package the application using electron-builder

### Build Output

The built application will be in the `release/` directory:

- **macOS**: `release/mac-arm64/Invoicing App.app` (Apple Silicon) and `Invoicing App-0.0.0-arm64.dmg` installer

**Note**: This application is currently configured for macOS (Apple Silicon) only. The `electron-builder.json` includes configurations for Windows and Linux, but these have not been tested.

### Platform-Specific Builds

The default build targets macOS Apple Silicon:

```bash
# macOS (default)
npm run build:electron
```

To build for other platforms (untested):

```bash
# Windows (untested)
npm run build:electron -- --win

# Linux (untested)
npm run build:electron -- --linux
```

**Windows/Linux Support**: While the codebase includes configurations for Windows and Linux builds, these platforms have not been tested. You may need to:
- Add platform-specific icons (`public/icon.ico` for Windows, `public/icon.png` for Linux)
- Test and adjust file paths and system-specific features
- Verify database and file system operations work correctly

### Development Build Only

To build just the web assets without packaging:

```bash
npm run build
```

The output will be in the `dist/` directory.

## Usage

### Initial Setup
1. Launch the application
2. Navigate to **Settings** and configure:
   - Company information (name, address, email, phone)
   - Invoice settings (due days, invoice prefix)
   - SMTP configuration for email delivery
3. Add your products with pricing
4. Add your customers with contact information

### Creating and Sending Invoices
1. Click **Create New Invoice** from the dashboard or Invoices page
2. Select a customer and add line items from your product catalog
3. Attach files if needed (PDFs, images, etc.)
4. Choose to either:
   - **Save Draft**: Save for later editing
   - **Send Now**: Immediately send via email with PDF attachment

### Managing Invoices
- **Edit**: Only Draft invoices can be edited
- **Send/Resend**: Send or resend invoices to customers
- **Mark Paid**: Update invoice status when payment received
- **Cancel**: Cancel an invoice (preserves data, excludes from analytics)
- **Delete**: Delete Draft or Cancelled invoices (soft delete)
- **Duplicate**: Create a copy of any invoice
- **Download PDF**: Generate and download invoice PDF

### Bulk Operations
Select multiple invoices to:
- Mark as Paid
- Cancel multiple invoices
- Delete Draft/Cancelled invoices
- Export selected invoices

### Data Management
- **Export Data**: Backup all data to JSON file
- **Import Data**: Restore from backup file
- **Backup Reminders**: App reminds you to backup regularly

## Directory Structure

```
invoicing-app/
├── electron/              # Electron main process
│   ├── database/         # Database logic and migrations
│   │   └── migrations/   # SQL migration files
│   ├── email-sender.ts   # Email delivery logic
│   ├── main.ts          # Electron main process entry
│   └── preload.ts       # IPC bridge to renderer
├── src/                  # React frontend
│   ├── components/      # UI components
│   │   ├── Customers/   # Customer management
│   │   ├── Invoices/    # Invoice management
│   │   ├── Products/    # Product management
│   │   ├── Settings/    # App settings
│   │   ├── Layout/      # Layout components
│   │   └── ui/          # Reusable UI components
│   ├── services/        # API and service layer
│   ├── templates/       # Mustache templates for PDF/email
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
└── dist/                # Build output (gitignored)
```

## Database

The application uses SQLite with automatic migrations. The database file is stored in the user's application data directory:

- **macOS**: `~/Library/Application Support/Invoicing App/database.db`

Migrations run automatically on app startup, ensuring the database schema is always up to date.

## Development Notes

- The app uses IPC (Inter-Process Communication) for Electron main/renderer communication
- All database operations are synchronous using `better-sqlite3`
- Soft deletes preserve data integrity and maintain foreign key relationships
- Analytics queries exclude cancelled and deleted invoices
- File attachments are stored in the user's application data directory

## License

This project is licensed under the MIT License - see the LICENSE file for details.
