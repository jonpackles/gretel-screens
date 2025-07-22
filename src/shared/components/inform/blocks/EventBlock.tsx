import GretelLogo from '../GretelLogo';

type Props = {
  data: {
    title: string;
    date?: string;        // Made optional for announcements
    time?: string;
    location?: string;
    description?: string;
    body?: string;        // For announcement body text
    imageUrl?: string;
    tag?: string;
  };
  mode: "poster" | "list";
  formatDate: (dateString: string) => string;
};

export default function EventBlock({ data, mode, formatDate }: Props) {
  // Use body for announcements, description for events, or either for display
  const displayText = data.body || data.description;
  
  return mode === "list" ? (
    <div>
      <div className="date">{data.date && formatDate(data.date)}</div>
      <div className="body">
        <h1 className="title">{data.title}</h1>
        <div className="info">
          <div className="time">{data.time}</div>
         
            <GretelLogo location={data.location} />
         
        </div>
      </div>
      
    </div>
  ) : (
    <div>
      <div className="top">
        <div className="tag">{data.tag || 'Event'}</div>
        <h1>{data.title}</h1>
        {data.imageUrl && (
          <div className="image">
            <img src={data.imageUrl} alt={data.title} />
          </div>
        )}
      </div>
      
      <div className="info">
        {data.date && <div className="date">{(() => {
          // Parse date string as local date to avoid timezone conversion issues
          const [year, month, day] = data.date.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        })()}</div>}
        {data.time && <div className="time">{data.time}</div>}
        {data.location && (
          
            <GretelLogo location={data.location} />
          
        )}
        {displayText && <div className="body">{displayText.replace(/\n/g, '<br>')}</div>}
      </div>
    </div>
  );
}