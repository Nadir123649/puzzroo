import { NextRequest } from "next/server";
import ContactMessage from "@/lib/server/models/ContactMessage";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { contactSchema } from "@/lib/server/validators/contactValidator";

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const val = validate(contactSchema, body);
  if (val.error) return val.error;

  await connectDB();

  try {
    const { name, email, message } = val.data!;
    const userResult = await auth(request);
    const contact = await ContactMessage.create({
      name, email, message,
      userId: "error" in userResult ? null : userResult.user.id,
    });
    return successResponse({ id: contact._id, message: "Your message has been received. We'll get back to you soon." }, 201);
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
