import styles from './inform.module.scss';

type Props = {
  data: {
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
    className?: string;
  };
  mode: "poster" | "list";
};

export default function EventBlock({ data, mode }: Props) {
  const { title, date, time, location, description } = data;

  if (mode === "list") {
    return (
      <div>
        <div>{date}</div>
        <h2 className={styles.h2List}>{title}</h2>
      </div>
    );
  }

  // Poster view
  return (
    <div>
      <div>{date}</div>
      <h2 className={styles.h2Poster}>{title}</h2>
      {time && <div>{time}</div>}
      {location && <div>{location}</div>}
      {description && <p>{description}</p>}
    </div>
  );
}