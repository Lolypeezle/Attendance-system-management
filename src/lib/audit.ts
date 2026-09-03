import { prisma } from "./db";

export interface LogAuditParams {
  actorId?: string | null;
  actorName: string;
  action: string; // e.g. "MANUAL_STATUS_CORRECTION", "EXCUSE_APPROVED", "COURSE_CREATED", "USER_DEACTIVATED"
  entityType: string; // e.g. "AttendanceRecord", "ExcuseRequest", "Course", "User"
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
}

export async function logAudit({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
}: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actor_id: actorId || null,
        actor_name: actorName,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
