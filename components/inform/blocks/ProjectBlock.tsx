import styles from './inform.module.scss';

type Props = {
  data: {
    title: string;
    description?: string;
    team?: string[];
    status?: "In Progress" | "Shipped" | "Paused";
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
        <h3>Campaign</h3>
        <p>Crossplay fosters social connection through 2-player gameplay</p>
        <p>Team: {data.team?.join(", ")}</p>
      </div>
      
      <div className="info">
        <div className="status">Status: {data.status}</div>
      </div>
    </div>
  );
}