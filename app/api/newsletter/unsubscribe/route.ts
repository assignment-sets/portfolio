import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeUser } from "@/lib/newsletter";

const tokenSchema = z
  .string()
  .trim()
  .min(1, "Token is required")
  .max(100, "Invalid token format")
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid token format");

export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token") || "";
  const parsed = tokenSchema.safeParse(rawToken);

  if (!parsed.success) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Unsubscribe</title>
          <style>
            body { font-family: Georgia, serif; background: #0c0c0c; color: #eaeaea; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #2e2e2e; padding: 40px; border-radius: 8px; max-width: 480px; text-align: center; }
            a { color: #888; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Invalid Request</h2>
            <p style="color: #999;">A valid unsubscribe token was not provided.</p>
            <p><a href="/">Return to Home</a></p>
          </div>
        </body>
      </html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const token = parsed.data;

  try {
    const success = await unsubscribeUser(token);

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Unsubscribe Successful</title>
          <style>
            body { font-family: Georgia, serif; background: #0c0c0c; color: #eaeaea; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #2e2e2e; padding: 40px; border-radius: 8px; max-width: 480px; text-align: center; }
            h2 { font-weight: normal; margin-top: 0; }
            p { color: #999; line-height: 1.6; }
            a { color: #eaeaea; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${success ? "Unsubscribed" : "Already Unsubscribed"}</h2>
            <p>${
              success
                ? "You have been successfully removed from Gourab Mondal's newsletter. You will not receive future issues."
                : "This link has already been used or is no longer active."
            }</p>
            <p style="margin-top: 24px;"><a href="/">Return to portfolio</a></p>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Error</title>
          <style>
            body { font-family: Georgia, serif; background: #0c0c0c; color: #eaeaea; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #2e2e2e; padding: 40px; border-radius: 8px; max-width: 480px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Something went wrong</h2>
            <p style="color: #999;">Could not process unsubscribe request right now. Please try again later.</p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
