import axios from 'axios';

async function testSignup() {
    console.log('--- Testing Signup Endpoint ---');
    try {
        const response = await axios.post('http://localhost:3001/api/auth/signup', {
            email: `test-${Date.now()}@example.com`,
            password: 'password123',
            name: 'Test Member'
        });
        console.log('✅ Signup Success:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('❌ Signup Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            if (error.response.data.stack) {
                console.error('Server Stack:', error.response.data.stack);
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testSignup();
