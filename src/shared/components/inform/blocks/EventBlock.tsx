import GretelLogo from '../GretelLogo';

type Props = {
  data: {
    title: string;
    date?: string;        // Made optional for announcements
    endDate?: string;     // End date for multi-day events
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
  
  // Check if it's a multi-day event by comparing dates
  // Only consider it multi-day if endDate exists, is different from date, and both are valid
  const isMultiDay = data.endDate && 
                     data.endDate !== data.date && 
                     data.endDate.trim() !== '' && 
                     data.date && 
                     data.date.trim() !== '';

  // Debug logging for date issues
  if (data.endDate && data.endDate === data.date) {
    console.log(`🐛 Same-day event with endDate: ${data.title} | start: ${data.date} | end: ${data.endDate}`);
  }
  
  // Format date range for multi-day events
  const formatDateRange = () => {
    if (!data.date) return '';
    
    if (isMultiDay) {
      // Multi-day event with line break
      return (
        <>
          {formatDate(data.date)} –
          <br />
          {formatDate(data.endDate!)}
        </>
      );
    } else {
      // Single day event
      return formatDate(data.date);
    }
  };
  
  return mode === "list" ? (
    <div>
      <div className="date">{data.date && formatDateRange()}</div>
      <div className="body">
        <h1 className="title">{data.title}</h1>
        <div className="info">
          {!isMultiDay && <div className="time">{data.time}</div>}
         
            <GretelLogo location={data.location} />
         
        </div>
        {data.imageUrl && (
          <div className="image">
            <img src={data.imageUrl} alt={data.title} style={{ maxHeight: '40rem', objectFit: 'cover' }} />
          </div>
        )}
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
          if (isMultiDay) {
            // Parse date strings as local dates to avoid timezone conversion issues
            const [year1, month1, day1] = data.date.split('-');
            const [year2, month2, day2] = data.endDate!.split('-');
            const startDate = new Date(parseInt(year1), parseInt(month1) - 1, parseInt(day1));
            const endDate = new Date(parseInt(year2), parseInt(month2) - 1, parseInt(day2));
            return (
              <>
                {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} –
                <br />
                {endDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </>
            );
          } else {
            // Parse date string as local date to avoid timezone conversion issues
            const [year, month, day] = data.date.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          }
        })()}</div>}
        {!isMultiDay && data.time && <div className="time">{data.time}</div>}
        {data.location && (
          
            <GretelLogo location={data.location} />
          
        )}
        {displayText && <div className="body">{displayText.replace(/\n/g, '<br>')}</div>}
      </div>
    </div>
  );
}