#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

console.log('🎨 Simple Image Generator');
console.log('========================\n');

// Option 1: Try your fal.ai key with correct format
async function tryFalAI() {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    console.log('❌ No FAL_KEY found');
    return false;
  }

  try {
    console.log('🔄 Trying fal.ai with your key...');
    
    // The correct fal.ai endpoint format
    const response = await axios.post('https://fal.run/fal-ai/flux/schnell', {
      prompt: "Professional food photography of a delicious Italian pasta dish with cheese and herbs, restaurant quality, well-lit",
      image_size: "square_hd",
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true
    }, {
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data?.images?.[0]?.url) {
      console.log('✅ fal.ai SUCCESS!');
      console.log('🔗 Image URL:', response.data.images[0].url);
      
      // Download the image
      await downloadImage(response.data.images[0].url, 'fal-generated.jpg');
      return true;
    }
    
  } catch (error) {
    console.log('❌ fal.ai failed:', error.response?.data?.detail || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Your API key might be invalid or expired');
      console.log('💡 Check your fal.ai account: https://fal.ai/dashboard/keys');
    }
  }
  
  return false;
}

// Option 2: Use Together AI (free Flux schnell)
async function tryTogetherAI() {
  console.log('🔄 Trying Together AI (free Flux schnell)...');
  console.log('💡 You can get a free API key at: https://api.together.xyz/settings/api-keys');
  
  const togetherKey = process.env.TOGETHER_API_KEY;
  if (!togetherKey) {
    console.log('❌ No TOGETHER_API_KEY found');
    console.log('💡 Set it with: export TOGETHER_API_KEY="your-key"');
    return false;
  }

  try {
    const response = await axios.post('https://api.together.xyz/v1/images/generations', {
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: "Professional food photography of a delicious Italian pasta dish with cheese and herbs, restaurant quality, well-lit",
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1
    }, {
      headers: {
        'Authorization': `Bearer ${togetherKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data?.data?.[0]?.url) {
      console.log('✅ Together AI SUCCESS!');
      console.log('🔗 Image URL:', response.data.data[0].url);
      await downloadImage(response.data.data[0].url, 'together-generated.jpg');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Together AI failed:', error.response?.data?.error?.message || error.message);
  }
  
  return false;
}

// Download image helper
async function downloadImage(url, filename) {
  try {
    console.log('📥 Downloading image...');
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filename);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`✅ Image saved as: ${filename}`);
  } catch (error) {
    console.log('❌ Download failed:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Attempting image generation...\n');
  
  // Try fal.ai first
  const falSuccess = await tryFalAI();
  if (falSuccess) return;
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Try Together AI as backup
  const togetherSuccess = await tryTogetherAI();
  if (togetherSuccess) return;
  
  console.log('\n❌ All services failed');
  console.log('\n💡 Solutions:');
  console.log('1. Check your fal.ai API key: https://fal.ai/dashboard/keys');
  console.log('2. Get a free Together AI key: https://api.together.xyz/settings/api-keys');
  console.log('3. Or use Replicate: https://replicate.com/account/api-tokens');
}

if (require.main === module) {
  main().catch(console.error);
}
