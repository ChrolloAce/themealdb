#!/usr/bin/env node

// Simple test script for your FAL API key
const https = require('https');

const API_KEY = "key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw";

console.log('🔍 Testing your FAL API key...');
console.log('🔑 Key format:', API_KEY.substring(0, 15) + '...');

const postData = JSON.stringify({
  prompt: "A simple test image of a delicious pizza, professional food photography",
  image_size: "square_hd",
  num_inference_steps: 4,
  num_images: 1,
  enable_safety_checker: true
});

const options = {
  hostname: 'fal.run',
  port: 443,
  path: '/fal-ai/flux/schnell',
  method: 'POST',
  headers: {
    'Authorization': `Key ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Making API request to fal.ai...');

const req = https.request(options, (res) => {
  console.log('📊 Status Code:', res.statusCode);
  console.log('📋 Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS! Your API key works!');
        console.log('🖼️ Generated image URL:', response.images[0].url);
        console.log('💰 Approximate cost: $0.00252');
        console.log('\n🎉 Image generation is working! You can now use this key in your FoodDB app.');
      } else {
        console.log('❌ API call failed');
        console.log('📄 Response:', response);
      }
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request failed:', error.message);
});

req.write(postData);
req.end();
