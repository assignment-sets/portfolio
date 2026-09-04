"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Treat server render as online
}

export default function OfflineNotice() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <aside
      aria-live="polite"
      role="status"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 14px",
        borderRadius: "9999px",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        fontSize: "0.78rem",
        color: "var(--text-mid)",
        transition: "all 0.3s ease",
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff size={13} style={{ color: "#ef4444" }} />
          <span>Offline mode (viewing cached portfolio)</span>
        </>
      ) : (
        <>
          <Wifi size={13} style={{ color: "#22c55e" }} />
          <span>Back online</span>
        </>
      )}
    </aside>
  );
}
