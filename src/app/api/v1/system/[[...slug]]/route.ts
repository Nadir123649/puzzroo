import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";

const VERSION = process.env.npm_package_version || "1.0.0";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  if (action === "version") {
    return successResponse({ version: VERSION, api: "v1" });
  }

  if (action === "status") {
    return successResponse({
      status: "operational",
      environment: process.env.NODE_ENV || "development",
      version: VERSION,
    });
  }

  return errorResponse(404, "not_found", "Route not found");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  if (action === "csp-report") {
    try {
      const text = await request.text();
      const report = JSON.parse(text);
      console.warn("[CSP Violation]", JSON.stringify(report));
    } catch { }
    return new Response(null, { status: 204 });
  }

  return errorResponse(404, "not_found", "Route not found");
}
