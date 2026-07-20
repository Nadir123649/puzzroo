import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug;
  const type = slug?.[0] || "image";

  // Require authentication for uploads
  const userResult = auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    // POST /api/v1/uploads/image
    if (type === "image") {
      const formData = await request.formData();
      const file = (formData.get("image") || formData.get("file")) as File | null;
      if (!file) return errorResponse(400, "no_file", "No image uploaded");
      if (!file.type.startsWith("image/")) return errorResponse(400, "invalid_file", "Only image files are allowed");

      const cloudinary = (await import("@/lib/server/config/cloudinary")).default;

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "backend-puzzroo", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });

      return successResponse({ imageUrl: result.secure_url || result.url, publicId: result.public_id });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    return errorResponse(500, "internal_error", error.message);
  }
}
