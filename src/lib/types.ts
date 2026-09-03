export type Role = "STUDENT" | "LECTURER" | "HOD" | "SUPERADMIN";
export const Role = {
  STUDENT: "STUDENT" as Role,
  LECTURER: "LECTURER" as Role,
  HOD: "HOD" as Role,
  SUPERADMIN: "SUPERADMIN" as Role,
};

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export const AttendanceStatus = {
  PRESENT: "PRESENT" as AttendanceStatus,
  LATE: "LATE" as AttendanceStatus,
  ABSENT: "ABSENT" as AttendanceStatus,
  EXCUSED: "EXCUSED" as AttendanceStatus,
};

export type ExcuseStatus = "PENDING" | "APPROVED" | "REJECTED";
export const ExcuseStatus = {
  PENDING: "PENDING" as ExcuseStatus,
  APPROVED: "APPROVED" as ExcuseStatus,
  REJECTED: "REJECTED" as ExcuseStatus,
};

export type SessionStatus = "OPEN" | "CLOSED";
export const SessionStatus = {
  OPEN: "OPEN" as SessionStatus,
  CLOSED: "CLOSED" as SessionStatus,
};
