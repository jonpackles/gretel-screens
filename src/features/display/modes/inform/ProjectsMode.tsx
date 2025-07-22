'use client';

import { useState, useRef, useEffect } from 'react';
import { basel, quadrant, droulers } from '@/styles/fonts';
import ProjectBlock from '@/shared/components/inform/blocks/ProjectBlock';
import styles from '../modes.module.scss';
import '@/styles/inform/inform.scss';
import { useInformContent } from '@/shared/hooks/useInformContent';

let projectsCache: any[] | null = null;

export async function preload() {
  if (!projectsCache) {
    const response = await fetch('/api/inform');
    if (response.ok) {
      const data = await response.json();
      projectsCache = data.filter((item: any) => item.type === 'project');
    }
  }
}

// Custom Block component that defaults to poster mode for projects
function ProjectPosterBlock({ data, internal }: { data: any; internal: boolean }) {
  const [mode, setMode] = useState<"poster" | "list">("poster"); // Default to poster
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

  return (
    <div 
      ref={blockRef}
      className={`block-wrapper block-wrapper--${mode} block-wrapper--${internal ? 'internal' : 'external'}`}
      onClick={toggleMode}
      style={{ cursor: 'pointer' }}
      aria-label={`Switch to ${mode === "poster" ? "list" : "poster"} view`}
    >
      <ProjectBlock data={data} mode={mode} />
    </div>
  );
}

export default function ProjectsMode() {
  const { content, loading, error } = useInformContent({
    filterType: 'project',
    pollInterval: 60000, // Poll every minute
    enableBroadcast: true
  });

  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll through projects every 20 seconds
  useEffect(() => {
    if (content.length <= 1) return; // Don't auto-scroll if only one or no projects

    const interval = setInterval(() => {
      setCurrentProjectIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % content.length;
        
        // Smooth scroll to the next project
        if (containerRef.current) {
          const projectElements = containerRef.current.children;
          if (projectElements[nextIndex]) {
            projectElements[nextIndex].scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
        
        return nextIndex;
      });
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [content.length]);

  // Scroll to current project when content loads
  useEffect(() => {
    if (content.length > 0 && containerRef.current) {
      const projectElements = containerRef.current.children;
      if (projectElements[currentProjectIndex]) {
        setTimeout(() => {
          projectElements[currentProjectIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    }
  }, [content, currentProjectIndex]);

  if (loading && content.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Loading projects...</div>
      </div>
    );
  }

  if (error && content.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Error loading projects: {error}</div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>No projects available.</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} 
      id="inform"
    >
      {content.map((item, index) => (
        <ProjectPosterBlock 
          key={index} 
          data={item.data} 
          internal={item.internal} 
        />
      ))}
      
      {/* Optional: Progress indicator */}
      {content.length > 1 && (
        <div className="fixed bottom-4 left-4 z-40 bg-black/60 text-white px-3 py-1 rounded text-sm">
          Project {currentProjectIndex + 1} of {content.length}
        </div>
      )}
    </div>
  );
}   