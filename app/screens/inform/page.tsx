import Inform from '../../modes/Inform';
import { getInformContent } from "@/lib/inform/getInformContent";

export default async function ScreenA() {
  const content = await getInformContent();

  return <Inform content={content} />;
}