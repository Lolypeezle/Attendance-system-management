import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== "SUPERADMIN" && admin.role !== "HOD")) {
      return NextResponse.json({ error: "Unauthorized access to audit logs." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const actionParam = searchParams.get("action");
    const entityParam = searchParams.get("entity");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const whereClause: any = {};
    if (actionParam) whereClause.action = actionParam;
    if (entityParam) whereClause.entity_type = entityParam;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
