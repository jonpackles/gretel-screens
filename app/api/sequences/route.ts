import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const screen = searchParams.get('screen');
  if (!screen) return new Response('Missing screen param', { status: 400 });

  const filePath = path.join(process.cwd(), 'public/content/linked-content/sequences', `${screen}.json`);
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return new Response(data, { status: 200 });
  } catch (err) {
    return new Response('Not found', { status: 404 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const screen = body.screen;
  const sequence = body.sequence;

  if (!screen || !Array.isArray(sequence)) {
    return new Response('Invalid input', { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public/content/linked-content/sequences', `${screen}.json`);
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(sequence, null, 2));
    return new Response('Saved', { status: 200 });
  } catch (err) {
    return new Response('Write failed', { status: 500 });
  }
}