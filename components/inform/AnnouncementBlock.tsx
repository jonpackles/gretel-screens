import styles from './inform.module.scss';

type Props = {
    data: {
      title: string;
      body?: string;
      date?: string;
    };
    mode: "poster" | "list";
  };
  
export default function AnnouncementBlock({ data, mode }: Props) {
  return mode === "list" ? (
    <div>
      <div>{data.date}</div>
      <h1 className={styles.h1List}>{data.title}</h1>
    </div>
  ) : (
    <div>
      {data.date && <div>{data.date}</div>}
      <h1 className={styles.h1Poster}>{data.title}</h1>
      {data.body && <p>{data.body}</p>}
    </div>
  );
}