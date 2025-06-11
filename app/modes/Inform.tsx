'use client';

import { useState, useRef } from "react";
import { basel, quadrant, droulers } from '@/styles/fonts';
import '@/styles/inform/inform.scss';

// Format date to M/DD format
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

function Block({ type, data, internal }: { type: string; data: any; internal: boolean }) {
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
      }, 0); // Small delay to let the CSS transition start
    }
  };

  const renderContent = () => {
    switch (type) {
      case "announcement":
        return mode === "list" ? (
          <div>
            <div className="date">{data.date && formatDate(data.date)}</div>
            <div className="body">
                <h1 className="title">{data.title}</h1>
                <div className="info">
                    <div className="time">{data.time}</div>
                    <div className="body">
                      {data.location === "Gretel" ? (
                        <img className="gretel-logo" src="/images/gretel-logo.svg" alt="Gretel"  />
                      ) : (
                        data.location
                      )}
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="top">
                <div className="tag">Announcement</div>
                <h1>{data.title}</h1>
            </div>
            
            {/* {data.body && <p>{data.body}</p>} */}
            <div className="info">
                {data.date && <div className="date">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>}
                <div className="time">{data.time}</div>
                <div className="body">
                  {data.location === "Gretel" ? (
                    <img className="gretel-logo" src="/images/gretel-logo.svg" alt="Gretel"  />
                  ) : (
                    data.location
                  )}
                </div>
            </div>
            
          </div>
        );

      case "event":
        return mode === "list" ? (
          <div>
            <div className="date">{formatDate(data.date)}</div>
            <div className="body">
                <h1 className="title">{data.title}</h1>
                <div className="info">
                    <div className="time">{data.time}</div>
                    <div className="body">{data.location === "Gretel" ? (
                    <img className="gretel-logo" src="/images/gretel-logo.svg" alt="Gretel" />
                  ) : (
                    data.location
                  )}</div>
                </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="top">
              <div className="tag">Event</div>
              <h1>{data.title}</h1>
            </div>
            
            <div className="info">
              <div className="date">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              {data.time && <div className="time">{data.time}</div>}
              {data.location && (
                <div className="body">
                  {data.location === "Gretel" ? (
                    <img className="gretel-logo" src="/images/gretel-logo.svg" alt="Gretel"  />
                  ) : (
                    data.location
                  )}
                </div>
              )}
              {data.description && <div className="body">{data.description}</div>}
            </div>
          </div>
        );

      case "project":
        return mode === "list" ? (
          <div className="hidden">
            <h1>{data.title}</h1>
            {data.status && <div>{data.status}</div>}
          </div>
        ) : (
          <div>
            <div className="top">
              <div className="tag">Project</div>
              <h1>{data.title}</h1>
              <h3>Campaign</h3>
              <p>Crossplay fosters social connection through 2-player gameplay</p>
              <p>Team: {data.team.join(", ")}</p>
            </div>
            
            <div className="info">

              <div className="status">Status: {data.status}</div>
            
            </div>
          </div>
        );

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

export default function Inform({ content }: { content: any[] }) {
  return (
    <main id="inform" className={`${basel.variable} ${quadrant.variable} ${droulers.variable}`}>
      {content.map((item, index) => (
        <Block key={index} type={item.type} data={item.data} internal={item.internal} />
      ))}
    </main>
  );
}