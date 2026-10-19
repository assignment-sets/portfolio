import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { verifySessionToken, STUDIO_COOKIE_NAME } from "@/lib/auth-studio";
import BlogVerifyClient from "./BlogVerifyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watermark Verifier | Studio",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BlogVerifyPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(STUDIO_COOKIE_NAME)?.value;
  const isAuthorized = verifySessionToken(sessionCookie).valid;

  if (!isAuthorized) {
    redirect("/studio/login");
  }

  return <BlogVerifyClient />;
}
