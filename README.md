# APRE — Agent Performance Reporting Engine

**WEB450: Mastering the MEAN Stack Bootcamp**  
Bellevue University · Brownfield Project

APRE is a sample reporting and administration application used for the Brownfield development sprints in WEB450. It combines an Angular frontend, a Node.js/Express API, and MongoDB to support operational dashboards, reporting, and user management.

This repository contains the APRE starter application and my course development changes.

## Features

- Sign-in and dashboard views
- Sales reports by region
- Agent performance reports, including call duration by date range
- Customer feedback reports by month and channel
- User management screens
- Support and FAQ pages

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 18, TypeScript, Chart.js |
| Backend | Node.js, Express 4 |
| Database | MongoDB (official Node.js driver) |
| Backend testing | Jest, Supertest |
| Frontend testing | Jasmine, Karma |

## Repository structure

```text
web450-apre/
├── apre-client/     # Angular UI
├── apre-server/     # Express API and backend tests
└── README.md        # This file
```

The client and server are separate npm projects with their own `package.json` and `package-lock.json` files.

## Getting started

**Prerequisites:** Node.js and npm, Git, and access to a compatible MongoDB instance for database-backed features. Use a Node.js version compatible with this Angular 18 starter project.

Clone the repository (using my configured GitHub SSH alias):

```bash
git clone git@github-joncantu:joncantu-nh/web450-apre.git
cd web450-apre
```

If you don't use that local SSH alias, clone using the standard GitHub HTTPS URL instead.

### 1. Start the API

In one terminal:

```bash
cd apre-server
npm ci
npm test
npm run dev
```

The API runs at **http://localhost:3000/api**. To verify the root endpoint from another terminal:

```bash
curl -i http://localhost:3000/api
```

`npm start` runs the server without Nodemon; `npm run dev` restarts it when backend files change.

### 2. Start the Angular app

In a second terminal, from the repository root:

```bash
cd apre-client
npm ci
npm start
```

Open **http://localhost:4200/** in your browser. Angular's development server watches for file changes, so a separate build step is not required for local development.

## Testing and builds

Run backend tests:

```bash
cd apre-server
npm test
```

Run frontend tests or create a frontend build:

```bash
cd apre-client
npm test
npm run build
```


## Database and configuration notes

The starter server currently reads its MongoDB Atlas connection settings from `apre-server/src/utils/config.js`. The API can start and return its root response even if database-backed features are unavailable; successful unit tests do not necessarily confirm a live database connection.

