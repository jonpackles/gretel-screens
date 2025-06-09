import { Event as EventType } from '@/types/event'; 
import { basel, quadrant, droulers } from '@/styles/fonts'
import styles from './Event.module.scss'; 

interface EventProps {
  event: EventType;
  type: 'internal' | 'external';
  layout: 'fullscreen' | 'list';
}

export function Event({ event, type, layout }: EventProps) {
  const eventDate = new Date(event.date);
  const month = eventDate.getMonth() + 1;
  const day = eventDate.getDate().toString().padStart(2, '0');

  const classNames = [basel.variable, quadrant.variable, droulers.variable, styles.event, styles[`event--${type}`], styles[`event--${layout}`]].join(' ');

  return (
    <div className={classNames} >
       
      <div className={styles['event-date']}>{month}/{day}</div>
      <div className={styles['event-content']}>
        <h2 className={`${styles['event-title']} ${styles.h2}`}>{event.title}</h2>

        <div>
        {layout === 'fullscreen' && (
          <>
            {event.description && (
              <div className={styles['event-description']}>{event.description}</div>
            )}
            {event.imageUrl && (
              <img className={styles['event-image']} src={event.imageUrl} alt={event.title} />
            )}
          </>
        )}
        <div className={styles['event-info']}>
          <div className={styles['event-time']}>{event.time}</div>
          <div className={styles['event-location']}>@{event.location}</div>
        </div>
        </div>
      </div>
    </div>
  );
}