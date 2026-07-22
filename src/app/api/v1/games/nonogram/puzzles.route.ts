import { type NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { rateLimit } from "@/lib/server/utils/http";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram";
import { Difficulty } from "@/lib/server/puzzles/nonogram/types";

// Validation schemas
const difficultyQuerySchema = {
  difficulty: (value: any) => {
    if (typeof value !== "string" || (value && !["easy", "medium", "hard", "expert"].includes(value))) {
      return [{ message: "Valid difficulty is required (easy, medium, hard, expert)" }];
    }
    return null;
  }
};

function validateQuery(query: Record<string, any>) {
  const errors = [];
  
  if (query.difficulty && !["easy", "medium", "hard", "expert"].includes(query.difficulty)) {
    errors.push({ message: "Valid difficulty is required (easy, medium, hard, expert)" });
  }
  
  if (query.limit && (isNaN(query.limit) || query.limit < 1 || query.limit > 100)) {
    errors.push({ message: "Limit must be between 1 and 100" });
  }
  
  if (query.cursor && typeof query.cursor !== "string") {
    errors.push({ message: "Cursor must be a string" });
  }
  
  return errors.length > 0 ? errors : null;
}

function buildCursorFilter(cursor: string | null) {
  if (!cursor) return {};
  
  const filter: any = { createdAt: { $gt: new Date(cursor) } };
  if (!cursor.startsWith("date_")) {
    return filter;
  }
  
  const dateStr = cursor.replace("date_", "");
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return filter;
  }
  
  return {
    $or: [
      { createdAt: { $gt: date } },
      { $and: [
        { createdAt: { $lt: date } },
        { gameId: "nonogram" }
      ] }
    ]
  };
}

export async function GET(request: NextRequest) {
  const requestStart = Date.now();
  
  if (!rateLimit(request, "nonogram-puzzles", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  await connectDB();
  const userResult = await auth(request);
  const userId = "error" in userResult ? null : userResult.user.id;

  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries()) as any;

    const validationErrors = validateQuery(query);
    if (validationErrors && validationErrors.length > 0) {
      return errorResponse(
        400,
        "validation_error",
        validationErrors.map(e => e.message).join(", ")
      );
    }

    const requestedDifficulty = query.difficulty as Difficulty | undefined;
    const limit = query.limit ? Math.min(parseInt(query.limit) || 50, 100) : 50;
    const cursor = query.cursor as string | null;

    const filter: any = {
      $and: [
        { gameId: "nonogram" },
        requestedDifficulty ? { difficulty: requestedDifficulty } : {},
        { isActive: true }
      ]
    };

    const cursorFilter = buildCursorFilter(cursor);
    if (Object.keys(cursorFilter).length > 0) {
      filter.$and.push(cursorFilter);
    }

    const totalCount = await NonogramPuzzle.countDocuments(filter);

    const puzzles = await NonogramPuzzle.find(filter)
      .sort({ createdAt: -1, "_id": 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = puzzles.length > limit;
    const itemsToReturn = hasMore ? puzzles.slice(0, limit) : puzzles;

    const responseItems = itemsToReturn.map(nonogramToResponse);

    let nextCursor: string | null = null;
    if (hasMore && itemsToReturn.length > 0) {
      const lastItem = itemsToReturn[itemsToReturn.length - 1];
      nextCursor = `date_${lastItem.createdAt.toISOString().split("T")[0]}`;

      if (itemsToReturn.length === limit) {
        nextCursor = `id_${lastItem._id.toString()}`;
      }
    }

    const response = {
      items: responseItems,
      nextCursor,
      counts: {
        easy: requestedDifficulty ? undefined : totalCount,
        medium: requestedDifficulty ? undefined : totalCount,
        hard: requestedDifficulty ? undefined : totalCount,
        expert: requestedDifficulty ? undefined : totalCount,
      }
    };

    return successResponse(response);

  } catch (error: any) {
    console.error(`[nonogram] puzzles error:`, error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
