import { NextResponse } from "next/server";
import { getStudioUsersCollection } from "@/lib/auth-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usersCol = await getStudioUsersCollection();
    const count = await usersCol.countDocuments();
    return NextResponse.json({
      success: true,
      bootstrapped: count > 0,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to determine studio status." },
      { status: 500 }
    );
  }
}
