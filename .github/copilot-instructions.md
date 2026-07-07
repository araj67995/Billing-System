# Automated Billing System - Setup Instructions

This is a complete Node.js/Express/MongoDB billing system with a web-based frontend.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure MongoDB**
   - Copy `.env.example` to `.env`
   - Update MongoDB connection string in `.env`
   - Ensure MongoDB is running

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open `http://localhost:5000` in your browser

## Project Structure

- **Backend**: Node.js + Express (server.js)
- **Database**: MongoDB + Mongoose (models/)
- **API**: RESTful endpoints (routes/, controllers/)
- **Frontend**: HTML/CSS/JavaScript (public/)

## Main Features

- ✅ Customer Management (CRUD operations)
- ✅ Invoice Generation with line items
- ✅ Payment Tracking and recording
- ✅ Dashboard with statistics
- ✅ Real-time calculations
- ✅ Status management (draft, sent, paid, overdue)

## Development

For development with auto-reload:
```bash
npm run dev
```

## API Health Check

```bash
curl http://localhost:5000/api/health
```

---

All project files have been created. Follow the Quick Start guide above to run the application.
