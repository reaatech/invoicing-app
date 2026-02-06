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

1. Clone the repository.
2. Navigate to the project directory: `cd invoicing-app`.
3. Install dependencies: `npm install`.
4. Run the development server: `npm run dev`.

## Building for Production

To build the application for production, run:

```bash
npm run build
```

The built application can be found in the `dist` folder.

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
