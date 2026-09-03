import { PrismaClient } from "@prisma/client";
import { Role, AttendanceStatus, ExcuseStatus, SessionStatus } from "../src/lib/types";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting FUOYE SAMS Database Seeding...");

  // Clean existing records in cascade-safe order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.excuseRequest.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.session.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: "attendance_threshold", value: "70", description: "Minimum attendance rate required for exam eligibility (%)" },
      { key: "warning_threshold", value: "75", description: "Attendance rate trigger for warning alert (%)" },
      { key: "campus_lat", value: "7.7983", description: "FUOYE Main Campus Latitude" },
      { key: "campus_lng", value: "5.2974", description: "FUOYE Main Campus Longitude" },
      { key: "campus_radius_m", value: "2000", description: "Campus Geofence radius in meters" },
      { key: "default_late_minutes", value: "15", description: "Default late arrival threshold in minutes" },
      { key: "academic_session", value: "2025/2026", description: "Current Academic Session" },
      { key: "current_semester", value: "FIRST", description: "Current Semester" },
    ],
  });

  // 2. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      name: "Engr. T. O. Fashola",
      email: "admin@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.SUPERADMIN,
    },
  });

  const hod = await prisma.user.create({
    data: {
      name: "Dr. O. A. Babatunde (HOD)",
      email: "hod.csc@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.HOD,
    },
  });

  const lecturer1 = await prisma.user.create({
    data: {
      name: "Dr. S. O. Adeyemi",
      email: "adeyemi@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.LECTURER,
    },
  });

  const lecturer2 = await prisma.user.create({
    data: {
      name: "Dr. K. M. Balogun",
      email: "balogun@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.LECTURER,
    },
  });

  const lecturer3 = await prisma.user.create({
    data: {
      name: "Mrs. F. I. Okonjo",
      email: "okonjo@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.LECTURER,
    },
  });

  // Sample Student User
  const studentUser = await prisma.user.create({
    data: {
      name: "Adebayo Emmanuel",
      email: "student@fuoye.edu.ng",
      password_hash: passwordHash,
      role: Role.STUDENT,
    },
  });

  // 3. Create Student Profiles
  const studentData = [
    { matric: "CSC/2021/1001", name: "Adebayo Emmanuel", level: "400L", email: "student@fuoye.edu.ng", userId: studentUser.id },
    { matric: "CSC/2021/1002", name: "Chukwuma Blessing", level: "400L", email: "b.chukwuma@fuoye.edu.ng" },
    { matric: "CSC/2021/1003", name: "Ogunleye Samuel", level: "400L", email: "s.ogunleye@fuoye.edu.ng" },
    { matric: "CSC/2021/1004", name: "Yusuf Fatima Zahra", level: "400L", email: "f.yusuf@fuoye.edu.ng" },
    { matric: "CSC/2021/1005", name: "Ibrahim Tunde", level: "400L", email: "t.ibrahim@fuoye.edu.ng" },
    { matric: "CSC/2021/1006", name: "Nwosu Chinedu", level: "400L", email: "c.nwosu@fuoye.edu.ng" },
    { matric: "CSC/2021/1007", name: "Alabi Kehinde", level: "400L", email: "k.alabi@fuoye.edu.ng" },
    { matric: "CSC/2021/1008", name: "Bello Zainab", level: "400L", email: "z.bello@fuoye.edu.ng" },

    { matric: "CSC/2022/1001", name: "Ajayi Damilola", level: "300L", email: "d.ajayi@fuoye.edu.ng" },
    { matric: "CSC/2022/1002", name: "Eze Collins", level: "300L", email: "c.eze@fuoye.edu.ng" },
    { matric: "CSC/2022/1003", name: "Ojo Victoria", level: "300L", email: "v.ojo@fuoye.edu.ng" },
    { matric: "CSC/2022/1004", name: "Lawal Hammed", level: "300L", email: "h.lawal@fuoye.edu.ng" },
    { matric: "CSC/2022/1005", name: "Musa Amina", level: "300L", email: "a.musa@fuoye.edu.ng" },
    { matric: "CSC/2022/1006", name: "Okafor Ifeanyi", level: "300L", email: "i.okafor@fuoye.edu.ng" },

    { matric: "CSC/2023/1001", name: "Fagbemi Temitope", level: "200L", email: "t.fagbemi@fuoye.edu.ng" },
    { matric: "CSC/2023/1002", name: "Dada Oluwaseun", level: "200L", email: "o.dada@fuoye.edu.ng" },
    { matric: "CSC/2023/1003", name: "Mohammed Kabir", level: "200L", email: "k.mohammed@fuoye.edu.ng" },
    { matric: "CSC/2023/1004", name: "Adeyemi Joy", level: "200L", email: "j.adeyemi@fuoye.edu.ng" },

    { matric: "CSC/2020/1001", name: "Olatunji Seyi", level: "500L", email: "s.olatunji@fuoye.edu.ng" },
    { matric: "CSC/2020/1002", name: "Danladi Usman", level: "500L", email: "u.danladi@fuoye.edu.ng" },
  ];

  const studentProfiles: any[] = [];
  for (const s of studentData) {
    const profile = await prisma.studentProfile.create({
      data: {
        full_name: s.name,
        matric_number: s.matric,
        level: s.level,
        email: s.email,
        user_id: s.userId || null,
      },
    });
    studentProfiles.push(profile);
  }

  // 4. Create Only the 8 Specific 300L Courses
  const csc302 = await prisma.course.create({
    data: {
      course_code: "CSC 302",
      course_title: "Object-Oriented Programming & Systems",
      units: 3,
      level: "300L",
      lecturer_id: lecturer3.id,
    },
  });

  const csc304 = await prisma.course.create({
    data: {
      course_code: "CSC 304",
      course_title: "Database Systems & File Organization",
      units: 3,
      level: "300L",
      lecturer_id: lecturer1.id,
    },
  });

  const csc306 = await prisma.course.create({
    data: {
      course_code: "CSC 306",
      course_title: "Algorithms & Complexity Analysis",
      units: 3,
      level: "300L",
      lecturer_id: hod.id,
    },
  });

  const csc308 = await prisma.course.create({
    data: {
      course_code: "CSC 308",
      course_title: "Formal Languages & Automata Theory",
      units: 3,
      level: "300L",
      lecturer_id: lecturer2.id,
    },
  });

  const csc312 = await prisma.course.create({
    data: {
      course_code: "CSC 312",
      course_title: "Computer Architecture & Organization",
      units: 3,
      level: "300L",
      lecturer_id: lecturer3.id,
    },
  });

  const csc314 = await prisma.course.create({
    data: {
      course_code: "CSC 314",
      course_title: "Operations Research & Computing",
      units: 3,
      level: "300L",
      lecturer_id: lecturer2.id,
    },
  });

  const csc316 = await prisma.course.create({
    data: {
      course_code: "CSC 316",
      course_title: "Web Development & Technologies",
      units: 2,
      level: "300L",
      lecturer_id: lecturer1.id,
    },
  });

  const csc320 = await prisma.course.create({
    data: {
      course_code: "CSC 320",
      course_title: "Human-Computer Interaction (HCI)",
      units: 2,
      level: "300L",
      lecturer_id: hod.id,
    },
  });

  const courses300List = [csc302, csc304, csc306, csc308, csc312, csc314, csc316, csc320];

  // 5. Enrollments (300L students in all 8 courses)
  const level300Students = studentProfiles.filter((s) => s.level === "300L");
  for (const s of level300Students) {
    for (const c of courses300List) {
      await prisma.enrollment.create({
        data: {
          student_id: s.id,
          course_id: c.id,
          academic_session: "2025/2026",
          semester: "SECOND",
        },
      });
    }
  }

  // 6. Active Demo Session (CSC 302)
  const activeSession = await prisma.session.create({
    data: {
      course_id: csc302.id,
      opened_by: lecturer3.id,
      opened_at: new Date(Date.now() - 10 * 60 * 1000), // opened 10 mins ago
      duration_minutes: 90,
      late_threshold_minutes: 15,
      qr_token: "active-qr-token-csc302",
      require_qr: false,
      require_geo: false,
      status: SessionStatus.OPEN,
    },
  });



  // Pre-seed some clock-ins into the active session
  await prisma.attendanceRecord.create({
    data: {
      session_id: activeSession.id,
      student_id: level400Students[1].id,
      matric_number: level400Students[1].matric_number,
      full_name: level400Students[1].full_name,
      status: AttendanceStatus.PRESENT,
      clock_in_time: new Date(Date.now() - 8 * 60 * 1000),
      attendance_token: "FY-401A",
      device_fingerprint: "fp-demo-device-01",
      ip_address: "197.210.84.12",
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      session_id: activeSession.id,
      student_id: level400Students[2].id,
      matric_number: level400Students[2].matric_number,
      full_name: level400Students[2].full_name,
      status: AttendanceStatus.PRESENT,
      clock_in_time: new Date(Date.now() - 5 * 60 * 1000),
      attendance_token: "FY-401B",
      device_fingerprint: "fp-demo-device-02",
      ip_address: "197.210.84.15",
    },
  });

  // 7. Historical Past Sessions for Rich Analytics
  const pastDates = [
    new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 3 weeks ago
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // 1 week ago
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),  // 3 days ago
  ];

  for (let i = 0; i < pastDates.length; i++) {
    const pDate = pastDates[i];
    const s = await prisma.session.create({
      data: {
        course_id: csc401.id,
        opened_by: lecturer2.id,
        opened_at: pDate,
        closed_at: new Date(pDate.getTime() + 90 * 60 * 1000),
        duration_minutes: 90,
        late_threshold_minutes: 15,
        qr_token: `hist-qr-${i}`,
        status: SessionStatus.CLOSED,
      },
    });

    // Populate attendance records for 400L students
    for (let idx = 0; idx < level400Students.length; idx++) {
      const student = level400Students[idx];
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      // create some late & absent to simulate realistic statistics and at-risk students
      if (idx === 4 && i > 0) {
        status = AttendanceStatus.ABSENT; // Student 4 misses frequently -> at risk
      } else if (idx === 3 && i % 2 === 1) {
        status = AttendanceStatus.LATE;
      } else if (idx === 5 && i === 2) {
        status = AttendanceStatus.EXCUSED;
      }

      await prisma.attendanceRecord.create({
        data: {
          session_id: s.id,
          student_id: student.id,
          matric_number: student.matric_number,
          full_name: student.full_name,
          status,
          clock_in_time: new Date(pDate.getTime() + (status === AttendanceStatus.LATE ? 20 : 5) * 60 * 1000),
          attendance_token: `FY-H${i}${idx}`,
          device_fingerprint: `fp-sim-${idx}`,
          ip_address: `197.210.84.${10 + idx}`,
        },
      });
    }
  }

  // Add historical sessions for CSC 301
  for (let i = 0; i < 3; i++) {
    const pDate = pastDates[i];
    const s = await prisma.session.create({
      data: {
        course_id: csc301.id,
        opened_by: hod.id,
        opened_at: pDate,
        closed_at: new Date(pDate.getTime() + 60 * 60 * 1000),
        duration_minutes: 60,
        late_threshold_minutes: 15,
        qr_token: `hist-301-${i}`,
        status: SessionStatus.CLOSED,
      },
    });
    for (const student of level300Students) {
      await prisma.attendanceRecord.create({
        data: {
          session_id: s.id,
          student_id: student.id,
          matric_number: student.matric_number,
          full_name: student.full_name,
          status: Math.random() > 0.15 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
          clock_in_time: new Date(pDate.getTime() + 6 * 60 * 1000),
          attendance_token: `FY-30${i}`,
        },
      });
    }
  }

  // 8. Sample Excuse Request
  await prisma.excuseRequest.create({
    data: {
      student_id: level400Students[0].id,
      session_id: activeSession.id,
      reason: "Medical appointment at FUOYE University Health Centre due to fever and tests.",
      document_url: "https://fuoye.edu.ng/health/medical-report-sample.pdf",
      status: ExcuseStatus.PENDING,
    },
  });

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      actor_id: superAdmin.id,
      actor_name: superAdmin.name,
      action: "SYSTEM_INITIALIZATION",
      entity_type: "System",
      entity_id: "INIT",
      old_value: null,
      new_value: JSON.stringify({ message: "FUOYE Computer Science SAMS initialized with seed dataset." }),
    },
  });

  console.log("✅ FUOYE SAMS Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
