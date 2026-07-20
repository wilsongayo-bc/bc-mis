import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

// Adjust path to point to the correct files directory
const FILES_DIR = path.resolve(__dirname, '../../files/Courses');
const OUTPUT_FILE = path.join(__dirname, 'pdf-extraction-debug.json');

async function extractPdfText() {
  try {
    if (!fs.existsSync(FILES_DIR)) {
      console.error(`Directory not found: ${FILES_DIR}`);
      return;
    }

    const files = fs.readdirSync(FILES_DIR).filter(file => file.endsWith('.pdf'));
    console.log(`Found ${files.length} PDF files in ${FILES_DIR}`);

    const extractedData: Array<{ filename: string; text: string }> = [];

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const filePath = path.join(FILES_DIR, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      try {
        const data = await pdf(dataBuffer);
        // We'll store the filename and the raw text
        extractedData.push({
          filename: file,
          // Limit text preview to first 3000 chars to avoid huge files if we just want to inspect structure
          // But we want full extraction eventually. For now, let's dump everything so I can read parts of it.
          text: data.text 
        });
        console.log(`   - Extracted ${data.text.length} characters`);
      } catch (err) {
        console.error(`   - Error parsing PDF: ${err}`);
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedData, null, 2));
    console.log(`\nExtraction complete! Saved to ${OUTPUT_FILE}`);
    console.log('You can now inspect this file to see the text structure.');

  } catch (error) {
    console.error('Script failed:', error);
  }
}

extractPdfText();
