-- ==============================================================================
-- FUOYE SAMS — Supabase PostgreSQL Schema & Seed Script
-- Run this directly in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable pgcrypto for UUID / CUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if needed
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "ExcuseRequest" CASCADE;
DROP TABLE IF EXISTS "AttendanceRecord" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Enrollment" CASCADE;
DROP TABLE IF EXISTS "Course" CASCADE;
DROP TABLE IF EXISTS "StudentProfile" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- 3. Create Tables

CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT ('usr_' || substr(md5(random()::text), 1, 16)),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL DEFAULT ('std_' || substr(md5(random()::text), 1, 16)),
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "matric_number" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT '300L',
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentProfile_user_id_key" ON "StudentProfile"("user_id");
CREATE UNIQUE INDEX "StudentProfile_matric_number_key" ON "StudentProfile"("matric_number");

CREATE TABLE "Course" (
    "id" TEXT NOT NULL DEFAULT ('crs_' || substr(md5(random()::text), 1, 16)),
    "course_code" TEXT NOT NULL,
    "course_title" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 3,
    "level" TEXT NOT NULL DEFAULT '300L',
    "lecturer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_course_code_key" ON "Course"("course_code");

CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL DEFAULT ('enr_' || substr(md5(random()::text), 1, 16)),
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "academic_session" TEXT NOT NULL DEFAULT '2025/2026',
    "semester" TEXT NOT NULL DEFAULT 'SECOND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enrollment_student_id_course_id_key" ON "Enrollment"("student_id", "course_id");

CREATE TABLE "Session" (
    "id" TEXT NOT NULL DEFAULT ('ses_' || substr(md5(random()::text), 1, 16)),
    "course_id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "late_threshold_minutes" INTEGER NOT NULL DEFAULT 15,
    "qr_token" TEXT NOT NULL,
    "require_qr" BOOLEAN NOT NULL DEFAULT false,
    "require_geo" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL DEFAULT ('att_' || substr(md5(random()::text), 1, 16)),
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "matric_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "clock_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "attendance_token" TEXT NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceRecord_session_id_matric_number_key" ON "AttendanceRecord"("session_id", "matric_number");

CREATE TABLE "ExcuseRequest" (
    "id" TEXT NOT NULL DEFAULT ('exc_' || substr(md5(random()::text), 1, 16)),
    "student_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "document_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcuseRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL DEFAULT ('aud_' || substr(md5(random()::text), 1, 16)),
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL DEFAULT ('set_' || substr(md5(random()::text), 1, 16)),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL DEFAULT ('not_' || substr(md5(random()::text), 1, 16)),
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign Key Constraints
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcuseRequest" ADD CONSTRAINT "ExcuseRequest_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcuseRequest" ADD CONSTRAINT "ExcuseRequest_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcuseRequest" ADD CONSTRAINT "ExcuseRequest_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==============================================================================
-- 5. SEED DATA (Default Password for all users: Password@123)
-- BCrypt hash for "Password@123": $2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu
-- ==============================================================================

-- Academic Staff & Admin
INSERT INTO "User" ("id", "name", "email", "password_hash", "role", "is_active") VALUES
('usr_admin_01', 'Engr. T. O. Fashola', 'admin@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'SUPERADMIN', true),
('usr_hod_01', 'Dr. O. A. Babatunde (HOD)', 'hod.csc@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'HOD', true),
('usr_lec_01', 'Dr. K. M. Balogun', 'balogun@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'LECTURER', true),
('usr_lec_02', 'Dr. S. O. Adeyemi', 'adeyemi@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'LECTURER', true),
('usr_lec_03', 'Mrs. F. I. Okonjo', 'okonjo@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'LECTURER', true),
('usr_std_01', 'Ajayi Damilola', 'student@fuoye.edu.ng', '$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu', 'STUDENT', true);


-- 300L Student Profiles
INSERT INTO "StudentProfile" ("id", "user_id", "full_name", "matric_number", "level", "email") VALUES
('std_01', 'usr_std_01', 'Ajayi Damilola', 'CSC/2022/1001', '300L', 'student@fuoye.edu.ng'),
('std_02', NULL, 'Eze Collins', 'CSC/2022/1002', '300L', 'c.eze@fuoye.edu.ng'),
('std_03', NULL, 'Ojo Victoria', 'CSC/2022/1003', '300L', 'v.ojo@fuoye.edu.ng'),
('std_04', NULL, 'Lawal Hammed', 'CSC/2022/1004', '300L', 'h.lawal@fuoye.edu.ng'),
('std_05', NULL, 'Musa Amina', 'CSC/2022/1005', '300L', 'a.musa@fuoye.edu.ng'),
('std_06', NULL, 'Okafor Ifeanyi', 'CSC/2022/1006', '300L', 'i.okafor@fuoye.edu.ng');

-- The 8 Specific 300L Courses
INSERT INTO "Course" ("id", "course_code", "course_title", "units", "level", "lecturer_id") VALUES
('crs_302', 'CSC 302', 'Object-Oriented Programming & Systems', 3, '300L', 'usr_lec_03'),
('crs_304', 'CSC 304', 'Database Systems & File Organization', 3, '300L', 'usr_lec_01'),
('crs_306', 'CSC 306', 'Algorithms & Complexity Analysis', 3, '300L', 'usr_hod_01'),
('crs_308', 'CSC 308', 'Formal Languages & Automata Theory', 3, '300L', 'usr_lec_02'),
('crs_312', 'CSC 312', 'Computer Architecture & Organization', 3, '300L', 'usr_lec_03'),
('crs_314', 'CSC 314', 'Operations Research & Computing', 3, '300L', 'usr_lec_02'),
('crs_316', 'CSC 316', 'Web Development & Technologies', 2, '300L', 'usr_lec_01'),
('crs_320', 'CSC 320', 'Human-Computer Interaction (HCI)', 2, '300L', 'usr_hod_01');

-- Enroll All 6 300L Students into all 8 Courses (48 Enrollments)
INSERT INTO "Enrollment" ("student_id", "course_id", "academic_session", "semester")
SELECT s.id, c.id, '2025/2026', 'SECOND'
FROM "StudentProfile" s
CROSS JOIN "Course" c;

-- Active Live Session for CSC 302
INSERT INTO "Session" ("id", "course_id", "opened_by", "opened_at", "duration_minutes", "late_threshold_minutes", "qr_token", "require_qr", "require_geo", "status") VALUES
('ses_active_302', 'crs_302', 'usr_lec_03', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 90, 15, 'active-qr-token-csc302', false, false, 'OPEN');

-- Pre-seed some sample attendance records for CSC 302
INSERT INTO "AttendanceRecord" ("session_id", "student_id", "matric_number", "full_name", "status", "attendance_token") VALUES
('ses_active_302', 'std_01', 'CSC/2022/1001', 'Ajayi Damilola', 'PRESENT', 'FY-302A'),
('ses_active_302', 'std_02', 'CSC/2022/1002', 'Eze Collins', 'PRESENT', 'FY-302B');

-- System Settings (FUOYE Coordinates)
INSERT INTO "SystemSetting" ("key", "value", "description") VALUES
('attendance_threshold', '70', 'Minimum percentage required to write exams'),
('warning_threshold', '75', 'Warning threshold for at-risk students'),
('campus_lat', '7.7983', 'FUOYE Main Campus Latitude'),
('campus_lng', '5.2974', 'FUOYE Main Campus Longitude'),
('campus_radius_m', '2000', 'FUOYE Campus Radius in meters');
