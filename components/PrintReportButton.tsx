"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      className="btn-secondary no-print"
      onClick={() => window.print()}
    >
      Download or print PDF
    </button>
  );
}
