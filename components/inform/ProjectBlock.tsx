import styles from './inform.module.scss';

type Props = {
  data: {
    title: string;
    description?: string;
    team?: string[];
    status?: "In Progress" | "Shipped" | "Paused";
    className?: string;
  };
  mode: "poster" | "list";
};

export default function ProjectBlock({ data, mode }: Props) {
  const { title, description, team, status } = data;

  if (mode === "list") {
    return (
      <div>
        <h2 className={styles.h2List}>{title}</h2>
        {status && <div>{status}</div>}
      </div>
    );
  }

  // Poster view
  return (
    <div>
      <h2 className={styles.h2Poster}>{title}</h2>
      {status && <div>{status}</div>}
      {description && <p>{description}</p>}
      {team && team.length > 0 && (
        <div>
          Team: {team.join(", ")}
        </div>
      )}
    </div>
  );
}