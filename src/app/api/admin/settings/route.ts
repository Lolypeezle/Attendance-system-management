import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: settings, error } = await supabase.from("SystemSetting").select("*");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: settings || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can modify system settings." }, { status: 403 });
    }

    const { settings } = await req.json();

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 });
    }

    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const { data: existing } = await supabase
          .from("SystemSetting")
          .select("id")
          .eq("key", item.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("SystemSetting")
            .update({
              value: String(item.value),
              description: item.description !== undefined ? item.description : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("key", item.key);
        } else {
          await supabase.from("SystemSetting").insert({
            key: item.key,
            value: String(item.value),
            description: item.description || null,
          });
        }
      }
    }

    await logAudit({
      actorId: admin.userId,
      actorName: admin.name,
      action: "SETTINGS_UPDATED",
      entityType: "SystemSetting",
      newValue: settings,
    });

    return NextResponse.json({ success: true, message: "System settings updated successfully." });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
