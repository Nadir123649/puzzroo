import { z } from "zod";
import { errorResponse } from "../utils/apiResponse";

export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return { error: errorResponse(400, "validation_error", details.map((d) => d.message).join("; ")) };
  }
  return { data: result.data as z.infer<T> };
}
