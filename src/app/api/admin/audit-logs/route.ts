import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== "SUPERADMIN" && admin.role !== "ADMIN" && admin.role !== "LECTURER" && admin.role !== "HOD")) {
      return NextResponse.json({ error: "Unauthorized access to audit logs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const actionParam = searchParams.get("action");
    const entityParam = searchParams.get("entity");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let query = supabase
      .from("AuditLog")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (actionParam) query = query.eq("action", actionParam);
    if (entityParam) query = query.eq("entity_type", entityParam);

    const { data: logs, error } = await query;

    if (error) {
      console.warn("Supabase fetch audit logs warning:", error.message);
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
