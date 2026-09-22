import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import {
  verifySessionToken,
  STUDIO_COOKIE_NAME,
  getStudioUsersCollection,
} from "@/lib/auth-studio";
import StudioLoginClient from "./StudioLoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Authentication",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioLoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;

  if (sessionCookie && verifySessionToken(sessionCookie).valid) {
    redirect("/studio");
  }

  let needsBootstrap = false;
  try {
    const usersCol = await getStudioUsersCollection();
    const count = await usersCol.countDocuments();
    needsBootstrap = count === 0;
  } catch {
    // MongoDB might not be reachable yet or uninitialized
    needsBootstrap = false;
  }

  return <StudioLoginClient needsBootstrap={needsBootstrap} />;
}
