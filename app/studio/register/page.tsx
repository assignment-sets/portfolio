import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getStudioUsersCollection } from "@/lib/auth-studio";
import StudioRegisterClient from "./StudioRegisterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Setup Studio Administrator",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioRegisterPage() {
  try {
    const usersCol = await getStudioUsersCollection();
    const count = await usersCol.countDocuments();
    if (count > 0) {
      redirect("/studio/login");
    }
  } catch {
    // If DB check fails, continue
  }

  return <StudioRegisterClient />;
}
