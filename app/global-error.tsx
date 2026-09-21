"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlobalError]:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Application Error | Gourab Mondal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #0c0d0e;
              color: #e4e4e7;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .error-card {
              max-width: 480px;
              padding: 36px 28px;
              border: 1px solid #27272a;
              border-radius: 8px;
              background-color: #121316;
            }
            h1 {
              font-size: 1.45rem;
              margin: 0 0 12px;
              font-weight: 600;
              color: #f4f4f5;
              letter-spacing: -0.01em;
            }
            p {
              font-size: 0.92rem;
              color: #a1a1aa;
              line-height: 1.6;
              margin: 0 0 24px;
            }
            .btn-group {
              display: flex;
              gap: 12px;
              justify-content: center;
            }
            button, a {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 9px 18px;
              font-size: 0.88rem;
              border-radius: 6px;
              cursor: pointer;
              text-decoration: none;
              font-weight: 500;
              transition: all 0.15s ease;
            }
            .primary-btn {
              background-color: #f4f4f5;
              color: #09090b;
              border: 1px solid #f4f4f5;
            }
            .primary-btn:hover {
              background-color: #e4e4e7;
            }
            .secondary-btn {
              background-color: transparent;
              color: #d4d4d8;
              border: 1px solid #3f3f46;
            }
            .secondary-btn:hover {
              background-color: #18181b;
            }
          `,
          }}
        />
      </head>
      <body>
        <div className="error-card">
          <h1>Application Encountered an Error</h1>
          <p>
            An unexpected error occurred. You can retry the action or return to the home page.
          </p>
          <div className="btn-group">
            <button
              type="button"
              onClick={() => reset()}
              className="primary-btn"
            >
              Try Again
            </button>
            <Link href="/" className="secondary-btn">
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
