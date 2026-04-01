# 🚖 CyprusRide-DB

A full-stack On-Demand Shared Ride Hailing (OSRH) platform built as a university database project. Features real-time ride matching, multi-role dashboards, geofence-based routing, and GDPR compliance, backed by a 34-table SQL Server schema.

## What I Worked On
- Designed and implemented the full 34-table relational database schema (3NF/BCNF normalized)
- Built 14 performance-optimized indexes, reducing key query times by 60–70%
- Implemented GDPR request workflow with transactional anonymization via stored procedures
- Developed the cost analysis reporting system (`sp_GetCostAnalysisReport`)
- Integrated Leaflet.js for real-time geofence and driver mapping
- Built the full REST API backend in C# / ASP.NET Core

## Features
- **Multi-role system** — Admin, Operator, Driver, and Passenger dashboards
- **Real-time ride matching** — Passengers request rides and receive driver offers with live map
- **Multi-segment trips** — Geofence-aware routing with bridge connection points
- **Cost analysis reports** — Filterable by date, service type, city, and grouping
- **GDPR compliance** — User deletion requests with admin approval and full audit log
- **Driver management** — Document verification, shift scheduling, earnings tracking
- **Leaflet.js map integration** — Visual pickup/dropoff selection, driver markers, geofence overlays

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | ASP.NET Core (C#) |
| Database | SQL Server (UCY) |
| Frontend | HTML, CSS, JavaScript |
| Mapping | Leaflet.js + OpenStreetMap |
| Reporting | Custom Stored Procedures |

## Database Design

The schema consists of 34 tables normalized to 3NF/BCNF, covering users, drivers, vehicles, trips, payments, geofencing, GDPR, and reporting.

Key design decisions:
- `POSTAL_CODES` table eliminates transitive dependencies on city/country
- `USER_PHONE_NUMBERS` decomposes multi-valued phone attributes (1NF)
- `SERVICE_TYPE` + `SERVICE_PREREQUISITES` enable future-proof service extensibility
- `TRIP` / `TRIP_SEGMENT` / `PAYMENT` decomposition supports multi-segment geofenced routing
- Controlled denormalization in `TRIP` (aggregate totals) reduced report query time from ~800ms to ~50ms

### Critical Indexes
- `IX_DriverAvailability_Search` — reduced driver matching from 980ms → ~400ms
- `IX_TripSegment_Active` — eliminated full table scans for active trip detection
- `IX_Vehicle_Driver_Service` — covering index for real-time driver search queries

## 📸 Screenshots

### 🗺️ Passenger — Ride Request & Map
<a href="https://github.com/user-attachments/assets/f19f238b-b86e-43f2-ba14-ac52633e7627">
  <img src="https://github.com/user-attachments/assets/f19f238b-b86e-43f2-ba14-ac52633e7627" height="400" />
</a>

### 👨‍💼 Admin Dashboard — Cost Analysis & Data Filtering
<a href="https://github.com/user-attachments/assets/cbef329d-468b-476e-8627-6e255851f2a2">
  <img src="https://github.com/user-attachments/assets/cbef329d-468b-476e-8627-6e255851f2a2" height="400" />
</a>

### 👤 Passenger Dashboard
<a href="https://github.com/user-attachments/assets/3a91c438-9e21-4e7d-85cd-d8d35f1ac67e">
  <img src="https://github.com/user-attachments/assets/3a91c438-9e21-4e7d-85cd-d8d35f1ac67e" height="300" />
</a>

### 🚗 Driver Dashboard
<a href="https://github.com/user-attachments/assets/04a8c944-9db9-4c16-9cf7-23730c1f0786">
  <img src="https://github.com/user-attachments/assets/04a8c944-9db9-4c16-9cf7-23730c1f0786" height="300" />
</a>

### 📋 Relational Schema
<a href="https://github.com/user-attachments/assets/3771d680-66e4-4254-8b60-c97de6f0f3f5">
  <img src="https://github.com/user-attachments/assets/3771d680-66e4-4254-8b60-c97de6f0f3f5" height="400" />
</a>
<a href="https://github.com/user-attachments/assets/669bf0d9-1e35-4d2f-9c58-431569653050">
  <img src="https://github.com/user-attachments/assets/669bf0d9-1e35-4d2f-9c58-431569653050" height="400" />
</a>

### 📊 ER Diagram
<a href="https://github.com/user-attachments/assets/b1879357-aea9-4ef8-a93f-a27718bb62db">
  <img src="https://github.com/user-attachments/assets/b1879357-aea9-4ef8-a93f-a27718bb62db" height="400" />
</a>

## Running the Project

### Database Setup
```sql
-- 1. Create schema
source create.sql

-- 2. Create stored procedures
source procedures.sql

-- 3. Create indexes
source indexes.sql

-- 4. Import sample data (10,000+ rows)
source data/import.sql
```

### Web App
```bash
# Configure connection string in appsettings.json
# Then run:
dotnet run --project OSRH.Api
```

Open `http://localhost:5000` in your browser.

## Notes
Team project (Team 32) for EPL342 — Databases course at the University of Cyprus. My primary focus was the database schema design, stored procedure development, index optimization, and backend API.
