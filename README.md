# Invoicing App

A desktop application built with Electron, React, and TypeScript for managing personal invoicing. This app allows you to manage customers, products, invoices, generate PDFs, and send emails via SMTP.

## Features

- **Settings Management**: Configure company details, invoice settings, and SMTP configurations.
- **Products CRUD**: Create, read, update, and delete products with search functionality.
- **Customers CRUD**: Manage customer information including contact and billing details.
- **Invoices CRUD**: Create and manage invoices with line items and status tracking.
- **PDF Generation**: Generate PDF invoices using Puppeteer and Mustache templates.
- **Email Sending**: Send invoices via email using Nodemailer with SMTP settings.
- **Reporting**: View dashboard statistics for total invoices, revenue, and outstanding amounts.
- **Data Export/Import**: Export and import application data for backup or migration.

## Tech Stack

- **Electron**: For building the desktop application.
- **React 18+ with TypeScript**: Frontend UI.
- **Vite**: Build tool for fast development and bundling.
- **Tailwind CSS**: Styling with dark mode support.
- **SQLite**: Database using `better-sqlite3` for synchronous operations.
- **React Router**: Navigation and routing.
- **Nodemailer**: SMTP email sending.
- **Puppeteer & Mustache.js**: PDF generation.

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

- **macOS**: `release/mac-arm64/Invoicing App.app` (for Apple Silicon) or `release/mac-x64/` (for Intel)
- **Windows**: `release/win-unpacked/` or `release/Invoicing App Setup.exe`
- **Linux**: `release/linux-unpacked/` or `release/Invoicing App.AppImage`

The `.dmg`, `.exe`, or `.AppImage` installers will also be generated in the `release/` directory.

### Platform-Specific Builds

To build for a specific platform:

```bash
# macOS only
npm run build:electron -- --mac

# Windows only
npm run build:electron -- --win

# Linux only
npm run build:electron -- --linux
```

### Development Build Only

To build just the web assets without packaging:

```bash
npm run build
```

The output will be in the `dist/` directory.

## Usage

- Launch the application.
- Configure your company and SMTP settings under `Settings`.
- Add products and customers as needed.
- Create invoices, add line items, and send them to customers via email.
- Monitor invoice status and outstanding payments from the dashboard.

## Directory Structure

- `electron/`: Electron main process code, database, and migrations.
- `src/`: React frontend code with components for each feature.
- `src/templates/`: Mustache templates for PDF and email generation.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
