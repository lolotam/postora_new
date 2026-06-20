
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://api.postora.cloud";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcnVpYnN3YXp6dXV1cGd5em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTE4NjgsImV4cCI6MjA4Mjg2Nzg2OH0.A591L2M5dMAaVm-W-DZYg5wsvtVp9qkzTrzWsRolRDA";

const OUTPUT_JSON_PATH = "logo_urls.json";

async function uploadLogo(filePath, fileName) {
    try {
        console.log(`Reading file: ${filePath}`);
        const fileBytes = fs.readFileSync(filePath);
        const base64Data = fileBytes.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Data}`;

        console.log(`Uploading ${fileName}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(`${SUPABASE_URL}/functions/v1/cloudinary-upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fileData: dataUrl,
                fileName: fileName,
                fileType: "image",
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(`Upload API error: ${result.error}`);
        }

        console.log(`✅ Uploaded ${fileName}: ${result.url}`);
        // clean name by removing timestamp suffix if present
        const cleanName = fileName.replace(/_logo_\d+\.png$/, '').replace('.png', '');
        return { name: cleanName, url: result.url };

    } catch (error) {
        console.error(`❌ Error uploading ${fileName}:`, error);
        return null;
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Please provide the directory path containing images.");
        process.exit(1);
    }

    const dirPath = args[0];
    const uploadedLogos = {};

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        if (file.endsWith(".png") && file.includes("_logo_")) {
            const filePath = path.join(dirPath, file);
            const result = await uploadLogo(filePath, file);
            if (result) {
                uploadedLogos[result.name] = result.url;
            }
        }
    }

    // Save results
    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(uploadedLogos, null, 2));
    console.log(`\n🎉 Saved all uploaded URLs to ${OUTPUT_JSON_PATH}`);
}

main();
