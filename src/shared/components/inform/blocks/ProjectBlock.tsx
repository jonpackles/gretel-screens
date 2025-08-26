import styles from '../inform.module.scss';

type Props = {
  data: {
    title: string;
    description?: string;
    team?: string[];
    status?: "In Progress" | "Shipped" | "Paused";
    imageUrl?: string;
    mediaUrls?: string[]; // Support for multiple media files
  };
  mode: "poster" | "list";
};

export default function ProjectBlock({ data, mode }: Props) {
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
        {(data.mediaUrls?.length || data.imageUrl) && (
          <div className={styles['media-grid']}>
            {data.mediaUrls?.length ? (
              // Multiple media files
              data.mediaUrls.map((mediaUrl, index) => (
                <div key={index} className={styles['media-item']}>
                  {mediaUrl.match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <video 
                      src={mediaUrl} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className={styles['media-content']}
                    />
                  ) : (
                    <img 
                      src={mediaUrl} 
                      alt={`${data.title} ${index + 1}`} 
                      className={styles['media-content']}
                    />
                  )}
                </div>
              ))
            ) : data.imageUrl ? (
              // Single media file (backward compatibility)
              <div className={styles['media-item']}>
                {data.imageUrl.match(/\.(mp4|mov|avi|webm)$/i) ? (
                  <video 
                    src={data.imageUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="media-content"
                  />
                ) : (
                  <img 
                    src={data.imageUrl} 
                    alt={data.title} 
                    className="media-content"
                  />
                )}
              </div>
            ) : null}
          </div>
        )}
        <h3>Campaign</h3>
        <p>{data.description || 'Crossplay fosters social connection through 2-player gameplay'}</p>
        {data.team && data.team.length > 0 && (
          <p>Team: {data.team.join(", ")}</p>
        )}
      </div>
      
      <div className="info">
        <div className="status">Status: {data.status}</div>
      </div>
    </div>
  );
}