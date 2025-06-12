import React from "react";
import Block from "./Block";
import { ContentBlock } from "@/types/inform/inform";
import styles from "./inform.module.scss";

type Props = {
  content: ContentBlock[];
};

export default function BlockList({ content }: Props) {
  if (!content || content.length === 0) {
    return <p>No updates available.</p>;
  }

  return (
    <div className="block-list">
      {content.map((block) => (
        <div key={block.id} className={styles.block}>
          <Block type={block.type} data={block.data} />
        </div>
        ))}
    </div>
  );
}
