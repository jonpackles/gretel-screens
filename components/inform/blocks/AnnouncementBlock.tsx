import GretelLogo from '../GretelLogo';

type Props = {
  data: {
    title: string;
    body?: string;
    date?: string;
    time?: string;
    location?: string;
    imageUrl?: string;
    tag?: string;
  };
  mode: "poster" | "list";
  formatDate: (dateString: string) => string;
};

export default function AnnouncementBlock({ data, mode, formatDate }: Props) {
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
        <div className="tag">Announcement</div>
        <h1>{data.title}</h1>
      </div>
      
      <div className="info">
        {data.date && <div className="date">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>}
        <div className="time">{data.time}</div>
       
          <GretelLogo location={data.location} />
       
      </div>
    </div>
  );
}