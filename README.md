# SMT Agency – Sales, Stock & Demand Forecasting System

A web-based application for SMT Agency (FMCG distribution) that combines **data analytics** and **machine learning** to automate tracking, analysis, and sales forecasting.

## Features

- **Admin (SMT Agency):** Products, imports/exports, real-time stock, CSV/Excel upload, analytics dashboards, ML sales prediction, request approval
- **Agency (External):** View products & stock, request products, track request status
- **ML:** Linear regression–based next-month sales prediction from historical data

## Tech Stack

| Layer      | Technology                    |
|-----------|-------------------------------|
| Frontend  | React, Vite, Recharts         |
| Backend   | Node.js, Express              |
| Database  | MongoDB                       |
| ML        | Python, Flask, scikit-learn   |

## Prerequisites

- **Node.js** 18+
- **MongoDB** (local or Atlas)
- **Python** 3.9+ (for ML service)

## Quick Start

### 1. Environment

Copy `backend/.env.example` to `backend/.env` and set values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smt_agency
JWT_SECRET=your-secret-key-change-in-production
ML_SERVICE_URL=http://localhost:5001
```

### 2. Backend

```bash
cd backend
npm install
npm run seed    # creates fixed SMT Admin: adminsmt@gmail.com / adminsmt@123 + sample products
npm run dev     # http://localhost:5000
```

### 3. ML Service

```bash
cd ml-engine
pip install -r requirements.txt
python app.py   # http://localhost:5001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000 (proxies /api to backend)
```

### 5. Use the App

- **Admin:** Login at http://localhost:3000 with `admin@smt.com` / `admin123`
- **Agency:** Register at http://localhost:3000/register, then login

## Project Structure

```
consultancy_proj/
├── backend/          # Node.js API
│   ├── models/       # User, Product, Import, Export, Stock, ProductRequest, SalesRecord
│   ├── routes/       # auth, products, imports, exports, stock, requests, analytics, upload, ml
│   ├── middleware/   # JWT auth, adminOnly, agencyOnly
│   └── server.js
├── frontend/         # React (Vite)
│   └── src/
│       ├── components/  # Layout
│       ├── context/     # AuthContext
│       ├── pages/       # Login, Register, Admin/User dashboards, Products, Imports, Exports, Stock, Requests, Analytics, Upload, MLPredict
│       └── api.js
├── ml-engine/        # Python Flask + scikit-learn
│   ├── app.py        # /predict endpoint (Linear Regression)
│   └── requirements.txt
└── README.md
```

## API Overview

| Endpoint           | Method | Auth   | Description              |
|--------------------|--------|--------|--------------------------|
| /api/auth/register | POST   | —      | Agency signup            |
| /api/auth/login    | POST   | —      | Login                    |
| /api/products      | GET/POST/PUT/DELETE | JWT | Products CRUD (admin)    |
| /api/imports       | GET/POST | JWT admin | Imports from Nestlé   |
| /api/exports       | GET/POST | JWT admin | Exports/sales          |
| /api/stock         | GET    | JWT admin | Real-time stock (admin only) |
| /api/requests      | GET/POST/PATCH | JWT | Requests (agency create, admin approve/reject) |
| /api/analytics/*   | GET    | JWT admin | Monthly, product-wise, summary |
| /api/upload/csv    | POST   | JWT admin | Upload CSV              |
| /api/upload/excel  | POST   | JWT admin | Upload Excel            |
| /api/ml/predict    | GET    | JWT admin | Next month prediction  |

## Upload File Format (CSV / Excel)

Expected columns (names case-insensitive): **Date**, **Product Name**, **Imported Quantity**, **Sold Quantity**, **Remaining Stock**, **Price**.

## Default credentials (fixed SMT Admin)

- **Admin (SMT Agency only):** `adminsmt@gmail.com` / `adminsmt@123`
  - Created by `npm run seed` in the backend (single account; no duplicate).
  - Admin is **not** created via signup; signup is for agencies only.
  - You can change the password after first login (sidebar → **Change password**).
- **Agencies:** Register at `/register`; each gets `role: agency` and cannot use the SMT Admin email.

## License

Academic / project use.
