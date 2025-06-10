import { ModeSequenceItem } from '../app/modes/ModeManager';

export async function fetchSequence(screen: string): Promise<ModeSequenceItem[] | null> {
  try {
    const res = await fetch(`/api/sequences?screen=${screen}`);
    if (!res.ok) throw new Error(`Failed to fetch sequence: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Error fetching sequence for ${screen}:`, err);
    return null;
  }
}