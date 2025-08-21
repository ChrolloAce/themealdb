const axios = require('axios');

async function testFalAPI() {
  const apiKey = process.env.FAL_KEY;
  
  console.log('🔍 Testing fal.ai API with your key...');
  console.log('🔑 API Key format:', apiKey.substring(0, 15) + '...');
  
  // Test different fal.ai endpoints and formats
  const endpoints = [
    {
      name: 'fal.ai flux schnell v1',
      url: 'https://fal.run/fal-ai/flux/schnell',
      auth: `Key ${apiKey}`
    },
    {
      name: 'fal.ai flux schnell v2', 
      url: 'https://fal.run/fal-ai/flux-schnell',
      auth: `Key ${apiKey}`
    },
    {
      name: 'fal.ai with Bearer token',
      url: 'https://fal.run/fal-ai/flux/schnell',
      auth: `Bearer ${apiKey}`
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔄 Testing ${endpoint.name}...`);
      console.log(`📍 URL: ${endpoint.url}`);
      
      const response = await axios.post(endpoint.url, {
        prompt: "A simple test image of a red apple",
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1
      }, {
        headers: {
          'Authorization': endpoint.auth,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint.name} SUCCESS!`);
      console.log('📊 Response status:', response.status);
      console.log('📦 Response keys:', Object.keys(response.data));
      
      if (response.data.images) {
        console.log('🖼️ Image URL:', response.data.images[0].url);
        return response.data.images[0].url;
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name} failed:`);
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.detail || error.message);
    }
  }
  
  console.log('\n💡 All endpoints failed. Check your API key or try a different service.');
}

testFalAPI().catch(console.error);
