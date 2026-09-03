import { supabase } from "./supabase";

export interface LogAuditParams {
  actorId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
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
    const { data } = await supabase.from("AuditLog").insert({
      actor_id: actorId || null,
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
    }).select().maybeSingle();
    return data;
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

