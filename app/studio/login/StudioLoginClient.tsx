"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { Lock, KeyRound, Fingerprint, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

interface StudioLoginClientProps {
  needsBootstrap: boolean;
}

export default function StudioLoginClient({ needsBootstrap }: StudioLoginClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/studio/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      router.push("/studio");
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setErrorMessage("");

    try {
      // 1. Fetch challenge and authentication options from server
      const optRes = await fetch("/api/auth/studio/passkey/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });

      const optData = await optRes.json();
      if (!optRes.ok || !optData.success || !optData.options) {
        setErrorMessage(optData.error || "Failed to initialize passkey sign-in.");
        setIsPasskeyLoading(false);
        return;
      }

      // 2. Prompt biometric / security key via WebAuthn browser API
      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: optData.options });
      } catch (authErr: unknown) {
        const err = authErr as { name?: string; message?: string };
        if (err?.name === "NotAllowedError") {
          setErrorMessage("Passkey sign-in canceled or timed out.");
        } else {
          setErrorMessage(err?.message || "Passkey authentication was not completed.");
        }
        setIsPasskeyLoading(false);
        return;
      }

      // 3. Verify signed assertion with server
      const verifyRes = await fetch("/api/auth/studio/passkey/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", response: authResponse }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.error || "Passkey verification failed.");
        setIsPasskeyLoading(false);
        return;
      }

      router.push("/studio");
      router.refresh();
    } catch {
      setErrorMessage("Failed to authenticate with passkey. Please use password.");
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100 selection:bg-zinc-800">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
            <Lock className="w-5 h-5 text-zinc-200" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Studio Authentication</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to manage portfolio content and settings</p>
        </div>

        {/* Bootstrap Notice if no admin registered */}
        {needsBootstrap && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-100">Initial Setup Required</div>
              <div className="text-xs text-amber-300/90 mt-1">
                No administrator account has been created yet.
              </div>
              <Link
                href="/studio/register"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-white underline mt-2 transition-colors"
              >
                Create Admin Account <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  disabled={isLoading || isPasskeyLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading || isPasskeyLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isPasskeyLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-sm mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Sign In with Password
                </>
              )}
            </button>
          </form>

          {/* Passkey Alternative Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/90 px-3 text-zinc-500 tracking-wider font-medium">Or</span>
            </div>
          </div>

          {/* Passkey / Hardware Key Sign In Button */}
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={isLoading || isPasskeyLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPasskeyLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Passkey...
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4 text-emerald-400" /> Sign In with Passkey / Biometrics
              </>
            )}
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
          >
            ← Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
