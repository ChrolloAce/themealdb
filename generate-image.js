#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Simple standalone Flux image generator
class FluxImageGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Try different API endpoints
    this.endpoints = [
      {
        name: 'fal.ai flux schnell',
        url: 'https://fal.run/fal-ai/flux/schnell',
        headers: { 'Authorization': `Key ${this.apiKey}` },
        payload: {
          prompt: '',
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true
        }
      },
      {
        name: 'fal.ai alternative',
        url: 'https://110602490-flux-schnell.gateway.alpha.fal.ai/',
        headers: { 'Authorization': `Key ${this.apiKey}` },
        payload: {
          prompt: '',
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1
        }
      }
    ];
  }

  async generateImage(prompt, filename = null) {
    console.log('🎨 Generating image with Flux.1 schnell...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    console.log('💰 Cost: ~$0.00252 (vs DALL-E 3 ~$0.04)');

    for (const endpoint of this.endpoints) {
      try {
        console.log(`🔄 Trying ${endpoint.name}...`);
        
        const payload = { ...endpoint.payload };
        payload.prompt = prompt;

        const response = await axios.post(endpoint.url, payload, {
          headers: {
            ...endpoint.headers,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        if (!response.data || !response.data.images || !response.data.images[0]) {
          throw new Error(`Invalid response from ${endpoint.name}`);
        }

        const imageUrl = response.data.images[0].url;
        console.log(`✅ Image generated successfully using ${endpoint.name}!`);
        console.log('🔗 Image URL:', imageUrl);

        // Download and save if filename provided
        if (filename) {
          await this.downloadImage(imageUrl, filename);
        }

        return imageUrl;

      } catch (error) {
        console.log(`❌ ${endpoint.name} failed:`, error.response?.status || error.message);
        if (endpoint === this.endpoints[this.endpoints.length - 1]) {
          // Last endpoint failed
          throw new Error(`All endpoints failed. Last error: ${error.message}`);
        }
        // Continue to next endpoint
        continue;
      }
    }
  }

  async downloadImage(imageUrl, filename) {
    try {
      console.log('📥 Downloading image...');
      
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(filename);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log('✅ Image saved to:', filename);
    } catch (error) {
      console.error('❌ Download failed:', error.message);
    }
  }
}

// CLI usage
async function main() {
  const apiKey = process.env.FAL_KEY || process.argv[2];
  const prompt = process.argv[3] || 'A delicious Italian pasta dish with cheese and herbs, professional food photography, restaurant quality';
  const filename = process.argv[4] || `flux-image-${Date.now()}.jpg`;

  if (!apiKey) {
    console.error('❌ Please provide FAL_KEY environment variable or as first argument');
    console.log('Usage: node generate-image.js [API_KEY] [PROMPT] [FILENAME]');
    console.log('Example: node generate-image.js "your-api-key" "delicious pizza" "pizza.jpg"');
    process.exit(1);
  }

  try {
    const generator = new FluxImageGenerator(apiKey);
    await generator.generateImage(prompt, filename);
    console.log('🎉 Done!');
  } catch (error) {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = FluxImageGenerator;

// Run if called directly
if (require.main === module) {
  main();
}
