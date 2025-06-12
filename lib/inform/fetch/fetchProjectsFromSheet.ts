import { google } from 'googleapis';
import path from 'path';

export async function fetchProjectsFromSheet() {
  console.log('📊 Starting fetchProjectsFromSheet...');
  
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  console.log('🔑 GOOGLE_SHEET_ID:', spreadsheetId ? 'SET' : 'MISSING');
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }
  
  const keyFilePath = path.join(process.cwd(), 'lib/credentials/service-account.json');
  console.log('🔐 Service account path:', keyFilePath);
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('🔗 Creating Google Sheets client...');
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Try different range formats to be more flexible
    const possibleRanges = [
      'Current!A1:E',  // Based on the visible tab name
      'Sheet1!A1:E',   // Original format
      'A1:E',          // Without sheet name
      'Current!A:E',   // Entire columns with Current tab
      'Sheet1!A:E',    // Entire columns
      'A:E'            // Entire columns without sheet name
    ];

    let response;
    let range;
    
    for (const testRange of possibleRanges) {
      try {
        console.log(`📋 Trying range: ${testRange}`);
        response = await sheets.spreadsheets.values.get({ 
          spreadsheetId, 
          range: testRange 
        });
        range = testRange;
        console.log(`✅ Successfully used range: ${range}`);
        break;
      } catch (error) {
        console.log(`❌ Range ${testRange} failed:`, (error as any).message);
        continue;
      }
    }
    
    if (!response) {
      // If all ranges failed, let's get sheet metadata to see what's available
      try {
        console.log('🔍 Fetching sheet metadata to see available sheets...');
        const metadataResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetNames = metadataResponse.data.sheets?.map(sheet => sheet.properties?.title) || [];
        console.log('📋 Available sheets:', sheetNames);
        
        // Try with the first available sheet
        if (sheetNames.length > 0) {
          const firstSheet = sheetNames[0];
          console.log(`🔄 Trying with first available sheet: ${firstSheet}`);
          response = await sheets.spreadsheets.values.get({ 
            spreadsheetId, 
            range: `${firstSheet}!A:E` 
          });
          range = `${firstSheet}!A:E`;
        }
      } catch (metaError) {
        console.error('❌ Failed to get sheet metadata:', metaError);
      }
    }
    
    if (!response) {
      throw new Error('Unable to fetch data with any of the attempted ranges');
    }

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('⚠️  No data found in sheet');
      return [];
    }

    console.log(`📊 Found ${rows.length} rows in sheet`);
    const headers = rows[0];
    console.log('📋 Headers found:', headers);
    const projects = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows or rows without a project name
      if (!row[0] || row[0].trim() === '' || row[0] === '...') {
        continue;
      }
      
      projects.push({
        id: `project-${i}`,
        title: row[0],                    // Column A: Project
        description: row[2] || '',        // Column C: Description  
        team: row[3] ? row[3].split(',').map((t: string) => t.trim()) : [], // Column D: Team (comma-separated)
        status: row[4] || 'Unknown',      // Column E: Status
        internal: true, // Assuming all projects in your sheet are internal
      });
    }

    console.log(`✅ Successfully parsed ${projects.length} projects from sheet`);
    return projects;
  } catch (error) {
    console.error('❌ Error in fetchProjectsFromSheet:', error);
    throw error;
  }
}