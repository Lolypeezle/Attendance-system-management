# FUOYE SAMS — Student Attendance Management System
**Department of Computer Science • Federal University Oye-Ekiti (FUOYE)**

A modern, tamper-resistant, mobile-first academic attendance tracking web application built with **Next.js 14 (App Router)**, **TypeScript**, **TailwindCSS**, and **Prisma ORM with SQLite**.

---

## 🚀 Key System Features

### 1. 📲 Student Self Clock-In (`/clock-in`)
- **No App Installation Needed**: Mobile-first web interface with instant access.
- **Fast Attendance Flow**: Select course session, enter matriculation number and name.
- **Dynamic Signed QR Code**: In-class projected QR code with time-limited cryptographic tokens.
- **Anti-Proxy & Tamper Resistance**:
  - Device fingerprinting detecting multiple matric entries from the same hardware.
  - Optional campus geofence validation using Haversine algorithm (FUOYE Oye Campus coordinates: `7.7983° N, 5.2974° E`).
  - Automatic late arrival calculation based on lecturer's defined threshold.
- **Digital Verification Slip (`/clock-in/success`)**: Generates an official 6-character alphanumeric verification token (e.g. `FY-401A`) with printable receipt and celebratory confetti.

### 2. 🎓 Student Academic Portal (`/student`)
- **Course-by-Course Attendance Ledger**: Live breakdown of sessions held, sessions attended, late counts, and percentages.
- **Eligibility Badges**: Visual indicator of whether the student meets the 70% exam eligibility threshold, warning status (70-74%), or barred status (<70%).
- **Attendance History**: Searchable table of past clock-in events with verification tokens.
- **Digital Excuse Submission**: Submit medical or official absence excuses with supporting documentation links for lecturer review.

### 3. 👨‍🏫 Lecturer Command Center (`/lecturer`)
- **Start New Lecture Session**: Set duration, late arrival threshold (e.g., 15 mins), and toggle QR / Geofence enforcement.
- **Live Classroom Monitor (`/lecturer/sessions/[id]`)**:
  - Real-time 3-second polling of incoming clock-ins.
  - Live statistics: Enrolled, Clocked In, Present, Late, Excused, Flagged, Unclocked.
  - Fullscreen Projector Mode with high-contrast QR code display.
  - One-click **"Mark Remaining Students Absent"**.
  - Manual Attendance Correction Modal with mandatory audit justification.
- **Excuse Request Review (`/lecturer/excuses`)**: Approve or reject student absence requests; approved excuses automatically reflect as `EXCUSED` status in attendance sheets.
- **Reports & Export (`/lecturer/reports`)**: Course rosters, session sign-in sheets, and Excel (`.xlsx`) / CSV exports.

### 4. 📊 HOD Executive Analytics (`/hod`)
- **Department-Wide Overview**: Total enrolled students, active lecture sessions, average attendance rate across all levels (100L - 500L).
- **At-Risk Student Registry**: Immediate identification of students below the 70% threshold who are barred from semester examinations.
- **Course Performance Heatmaps & Trends**: Track attendance trends across weeks and compare course attendance rates.
- **Course & Lecturer Assignment (`/hod/courses`)**: Assign courses to departmental lecturers and view enrollment counts.
- **Department Ledger Export**: One-click download of the complete departmental attendance register in `.xlsx`.

### 5. 🛡️ Super Administrator Console (`/admin`)
- **User Management (`/admin/users`)**: Create and manage lecturers, HODs, admins, and students; reset passwords; toggle account active status.
- **Bulk CSV Data Onboarding (`/admin/imports`)**: Upload student rosters and course registries via CSV with instant column validation.
- **Tamper-Evident Audit Trail (`/admin/audit-logs`)**: Immutable logging of every security action, manual attendance correction, excuse approval, and user deactivation.
- **Academic Policy Configuration (`/admin/settings`)**: Configure exam threshold (70%), warning threshold (75%), FUOYE GPS geofence radius, and default session duration.

---

## 🔑 Demo Login Accounts

All pre-seeded demo accounts use the standard password: **`Password@123`**

| Role | Name | Email | Default Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Engr. T. O. Fashola | `admin@fuoye.edu.ng` | `Password@123` |
| **HOD (Computer Science)** | Dr. O. A. Babatunde | `hod.csc@fuoye.edu.ng` | `Password@123` |
| **Lecturer** | Dr. K. M. Balogun | `balogun@fuoye.edu.ng` | `Password@123` |
| **Lecturer** | Dr. S. O. Adeyemi | `adeyemi@fuoye.edu.ng` | `Password@123` |
| **Lecturer** | Mrs. F. I. Okonjo | `okonjo@fuoye.edu.ng` | `Password@123` |
| **Student** | Adebayo Emmanuel (CSC/2021/1001) | `student@fuoye.edu.ng` | `Password@123` |

> *Tip: The Login Page (`/login`) includes **1-Click Demo Fill** buttons to instantly sign in as any role.*

---

## 💻 Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: SQLite with Prisma ORM (`prisma/schema.prisma`)
- **Styling**: Tailwind CSS, custom institutional FUOYE color scheme (Deep Emerald `#006B3F`, Gold `#E5A823`)
- **Icons**: Lucide React
- **Visualization**: Recharts
- **Export Formats**: SheetJS (`xlsx`) for Excel spreadsheets and CSVs
- **Security & Tokens**: HMAC SHA-256 for signed QR codes, JWT for authentication cookies, browser canvas fingerprinting, timing-safe crypto comparisons.

---

## 🛠️ Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Prepare Database & Seed Data
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📁 Project Structure

```
A.M.S/
├── prisma/
│   ├── dev.db              # Local SQLite database
│   ├── schema.prisma       # Prisma ORM schema
│   └── seed.ts             # Comprehensive database seed script
├── src/
│   ├── app/
│   │   ├── admin/          # Superadmin modules (users, imports, audit-logs, settings)
│   │   ├── api/            # Next.js App Router API Route Handlers
│   │   │   ├── admin/      # Admin endpoints (users, bulk-import, audit-logs, settings)
│   │   │   ├── analytics/  # HOD executive stats and trends
│   │   │   ├── auth/       # Login, register, logout, current user session
│   │   │   ├── clock-in/   # Public attendance submission endpoint
│   │   │   ├── courses/    # Course management
│   │   │   ├── excuses/    # Excuse submission & review
│   │   │   ├── reports/    # Excel & CSV data exports
│   │   │   ├── sessions/   # Session lifecycle & live attendance feeds
│   │   │   └── student/    # Student attendance ledger API
│   │   ├── clock-in/       # Student clock-in page & verification receipt
│   │   ├── hod/            # HOD analytics & course assignment
│   │   ├── lecturer/       # Lecturer dashboard, live session monitor, excuse reviews, reports
│   │   ├── login/          # Role-based authentication page
│   │   ├── student/        # Student attendance & exam eligibility portal
│   │   ├── globals.css     # Global theme & print styles
│   │   ├── layout.tsx      # App shell layout
│   │   └── page.tsx        # Public landing & active session notices
│   ├── components/         # Reusable UI components (Navbar, Footer, StatCard, QRCodeModal, AttendanceBadge)
│   └── lib/                # Shared utilities (auth, db, tokens, geofence, fingerprint, audit)
└── package.json
```

---

## 📜 License & Acknowledgments

Developed for the **Department of Computer Science, Federal University Oye-Ekiti (FUOYE)**.
All rights reserved.
