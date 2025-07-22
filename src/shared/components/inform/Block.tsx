'use client';

import { useState, useRef } from "react";
import EventBlock from "./blocks/EventBlock";
import ProjectBlock from "./blocks/ProjectBlock";

// Format date to M/DD format
function formatDate(dateString: string): string {
  // Parse date string as local date to avoid timezone conversion issues
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const monthNum = date.getMonth() + 1; // getMonth() returns 0-11
  const dayNum = date.getDate().toString().padStart(2, '0');
  return `${monthNum}/${dayNum}`;
}

type Props = {
  type: string;
  data: any;
  internal: boolean;
};

export default function Block({ type, data, internal }: Props) {
  const [mode, setMode] = useState<"poster" | "list">("list");
  const blockRef = useRef<HTMLDivElement>(null);

  const toggleMode = () => {
    const newMode = mode === "poster" ? "list" : "poster";
    setMode(newMode);
    
    // If switching to poster mode, scroll to top
    if (newMode === "poster" && blockRef.current) {
      setTimeout(() => {
        blockRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const renderContent = () => {
    switch (type) {
      case "announcement":
      case "event":
        return <EventBlock data={data} mode={mode} formatDate={formatDate} />;
      case "project":
        return <ProjectBlock data={data} mode={mode} />;
      default:
        return null;
    }
  };

  return (
    <div 
      ref={blockRef}
      className={`block-wrapper block-wrapper--${mode} block-wrapper--${internal ? 'internal' : 'external'}`}
      onClick={toggleMode}
      style={{ cursor: 'pointer' }}
      aria-label={`Switch to ${mode === "poster" ? "list" : "poster"} view`}
    >
      {renderContent()}
    </div>
  );
}