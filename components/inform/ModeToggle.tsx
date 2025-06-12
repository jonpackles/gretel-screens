

"use client";

import React from "react";

type Mode = "poster" | "list";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <button
        onClick={() => onChange("poster")}
        disabled={mode === "poster"}
        style={{
          marginRight: "8px",
          padding: "6px 12px",
          background: mode === "poster" ? "#333" : "#eee",
          color: mode === "poster" ? "#fff" : "#000",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Poster View
      </button>
      <button
        onClick={() => onChange("list")}
        disabled={mode === "list"}
        style={{
          padding: "6px 12px",
          background: mode === "list" ? "#333" : "#eee",
          color: mode === "list" ? "#fff" : "#000",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        List View
      </button>
    </div>
  );
}