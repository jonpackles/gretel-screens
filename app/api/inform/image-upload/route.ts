import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const contentId = formData.get('contentId') as string;

    if (!file || !contentId) {
      return Response.json({ error: 'Missing file or contentId' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Create content-specific directory
    const uploadsDir = path.join(process.cwd(), 'public', 'content', 'event-images');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${contentId}-${timestamp}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Return public URL
    const imageUrl = `/content/event-images/${filename}`;
    
    console.log(`✅ Image uploaded: ${filename} for content ID: ${contentId}`);
    
    return Response.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    return Response.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
