import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'public/content/linked-content/global-settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  hideOverlays: false,
  autoRotate: true,
  debugMode: false,
  highQuality: true,
  preloadNext: true,
};

async function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error reading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: any) {
  try {
    // Ensure directory exists
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

export async function GET() {
  try {
    const settings = await getSettings();
    return Response.json(settings);
  } catch (error) {
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...body };
    
    const success = await saveSettings(newSettings);
    if (success) {
      return Response.json({ success: true, settings: newSettings });
    } else {
      return Response.json({ error: 'Failed to save settings' }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
