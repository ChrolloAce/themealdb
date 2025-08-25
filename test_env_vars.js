#!/usr/bin/env node

// Test environment variables and API connectivity
console.log('🔍 Environment Variable Test');
console.log('============================');

console.log('GETIMG_API_KEY:', process.env.GETIMG_API_KEY ? 'SET (' + process.env.GETIMG_API_KEY.substring(0, 15) + '...)' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET (' + process.env.OPENAI_API_KEY.substring(0, 7) + '...)' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

// Test the image generation directly
if (process.env.GETIMG_API_KEY) {
    console.log('\n🧪 Testing GetImg.AI API directly...');
    
    const axios = require('axios');
    
    const testImageGeneration = async () => {
        try {
            const response = await axios.post('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
                prompt: 'A simple test image of a delicious pizza',
                width: 1024,
                height: 1024,
                steps: 4,
                output_format: "jpeg",
                response_format: "url"
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.GETIMG_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });
            
            console.log('✅ API call successful!');
            console.log('📸 Image URL:', response.data.url);
            console.log('💰 Cost:', response.data.cost);
            console.log('🌱 Seed:', response.data.seed);
            
        } catch (error) {
            console.error('❌ API call failed!');
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Data:', error.response?.data);
            console.error('Message:', error.message);
        }
    };
    
    testImageGeneration();
} else {
    console.log('❌ Cannot test API - GETIMG_API_KEY not set');
}
