# Dealer Ops — Starter Full-Stack App

A starter capstone project for Dealer Ops with:

- React + Vite frontend
- C# ASP.NET Core backend
- Firebase Authentication (email/password + Google)
- VIN decoding using the free NHTSA vPIC API
- Landing page with a VIN scanner/decoder section
- Responsive car-dealership UI
- VS Code workspace and environment templates

## Project structure

dealer-ops-starter/
├── frontend/              # React + Vite
├── backend/               # ASP.NET Core Web API (C#)
├── .vscode/               # VS Code workspace settings
└── README.md

## APIs / UI references

1. NHTSA vPIC VIN Decoder (free/public)
   https://vpic.nhtsa.dot.gov/api/

2. NHTSA vPIC documentation
   https://vpic.nhtsa.dot.gov/api/

3. Firebase Web Authentication
   https://firebase.google.com/docs/auth/web/start

4. Firebase Web setup
   https://firebase.google.com/docs/web/setup

5. Firebase Microsoft authentication
   https://firebase.google.com/docs/auth/web/microsoft-oauth

The starter uses NHTSA vPIC because it is a free public vehicle-information API and is a natural fit for the VIN feature.

## 1. Install prerequisites

- Node.js 20+ recommended
- .NET 8 SDK
- VS Code
- A Firebase project

## 2. Firebase setup

Create a Firebase project and register a Web App.

In Firebase Console:
Authentication -> Sign-in method:
- Enable Email/Password
- Optionally enable Google

Then copy the web app configuration into:

frontend/.env.local

Use:

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

Do NOT commit real secrets or private service-account keys.

## 3. Run backend

From the backend directory:

dotnet restore
dotnet run

The API normally starts on:
http://localhost:5180

Test:
http://localhost:5180/api/health

## 4. Run frontend

From the frontend directory:

npm install
npm run dev

Then open the URL printed by Vite, normally:
http://localhost:5173

## 5. Test VIN decoding

Use a valid VIN in the landing page and click "Decode VIN".

The frontend calls:
GET http://localhost:5180/api/vin/{VIN}

The C# backend calls the NHTSA vPIC API and returns normalized vehicle information.

## Important capstone note

This is a starter, not the final production security architecture. Before production deployment, the team should add:

- Firebase ID-token validation in the C# API
- Firestore/SQL data model and security rules
- dealership/tenant isolation
- proper roles
- audit logging
- OMVIC compliance rules
- automated tests
- cloud deployment
- environment-specific configuration
- rate limiting and API error handling

The client specifically asked for C#, so the backend is intentionally ASP.NET Core/C#.
