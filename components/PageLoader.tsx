import React from "react";

export default function PageLoader() {
  return (
    <div className="page-loader-overlay" role="status" aria-label="Loading">
      <div className="page-loader-spinner" />
    </div>
  );
}
