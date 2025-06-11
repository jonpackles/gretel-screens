'use client';

import React, { useState } from "react";
import AnnouncementBlock from "./AnnouncementBlock";
import EventBlock from "./EventBlock";
import ProjectBlock from "./ProjectBlock";
import { ContentBlock } from "@/types/inform/inform";
import styles from "./inform.module.scss";

type Props = {
  type: ContentBlock["type"];
  data: any;
};

export default function Block({ type, data }: Props) {
  const [mode, setMode] = useState<"poster" | "list">("list");

  const toggleMode = () => {
    setMode(prev => prev === "poster" ? "list" : "poster");
  };

  // Debug: Log the CSS classes being applied
  const wrapperClass = `${styles.blockWrapper} ${mode === 'poster' ? styles['blockWrapper--poster'] : styles['blockWrapper--list']}`;
  console.log('Block CSS classes:', {
    mode,
    blockWrapper: styles.blockWrapper,
    modeClass: mode === 'poster' ? styles['blockWrapper--poster'] : styles['blockWrapper--list'],
    fullClass: wrapperClass,
    allStyles: styles
  });

  return (
    <div className={wrapperClass}>
      {/* Mode Toggle Button */}
      <button 
        onClick={toggleMode}
        className={`${styles.modeToggle} ${mode === 'poster' ? styles['modeToggle--poster'] : styles['modeToggle--list']}`}
        aria-label={`Switch to ${mode === "poster" ? "list" : "poster"} view`}
      >
        {mode === "poster" ? "📋" : "🖼️"}
      </button>

      {/* Block Content */}
      <div className={styles.blockContent}>
        {(() => {
          switch (type) {
            case "announcement":
              return <AnnouncementBlock data={data} mode={mode} />;
            case "event":
              return <EventBlock data={data} mode={mode} />;
            case "project":
              return <ProjectBlock data={data} mode={mode} />;
            default:
              return null;
          }
        })()}
      </div>
    </div>
  );
}