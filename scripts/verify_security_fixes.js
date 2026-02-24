import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api';

async function verifyTiming() {
    console.log('--- Verifying Timing Side-Channel ---');
    const scenarios = [
        { name: 'Non-existing user', email: 'nonexisting@example.com' },
        { name: 'Existing user (wrong password)', email: 'admin@nvaulty.online' } // Adjust to a known email
    ];

    for (const scenario of scenarios) {
        let totalTime = 0;
        const iterations = 5;
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                await axios.post(`${API_URL}/auth/signin`, {
                    email: scenario.email,
                    password: 'wrongpassword'
                });
            } catch (error) { }
            totalTime += (Date.now() - start);
        }
        console.log(`${scenario.name}: Average response time: ${totalTime / iterations}ms`);
    }
}

async function verifyMetadataStripping() {
    console.log('\n--- Verifying Image Metadata Stripping ---');
    // Note: This requires an authenticated session and a file to upload.
    // In a real scenario, we'd use a test token and an image with metadata.
    console.log('Manual check recommended: Upload an image with GPS/EXIF to /avatar and check binary.');
}

// Note: Ensure the server is running before executing this script.
// verifyTiming().catch(console.error);
