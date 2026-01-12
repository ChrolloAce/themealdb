/**
 * ImageGenerationManager - Handles AI image generation across multiple providers
 * Single Responsibility: Generate food photography images
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ImageGenerationManager {
  constructor(openai = null, imageModel = 'dall-e-3') {
    this.openai = openai;
    this.imageModel = imageModel;
  }

  /**
   * Generate image using best available API
   */
  async generateFluxImage(prompt) {
    console.log('🎯 Starting generateFluxImage with prompt:', prompt.substring(0, 100) + '...');
    console.log('🔑 Available API keys:', {
      getimg: !!process.env.GETIMG_API_KEY,
      together: !!process.env.TOGETHER_API_KEY,
      fal: !!process.env.FAL_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN
    });

    // Try multiple image generation APIs in order of preference
    const apis = [
      {
        name: 'GetImg.AI (Your Key)',
        condition: () => process.env.GETIMG_API_KEY,
        generate: () => this.generateGetImgAIImage(prompt)
      },
      {
        name: 'Together AI (FREE)',
        condition: () => process.env.TOGETHER_API_KEY,
        generate: () => this.generateTogetherAIImage(prompt)
      },
      {
        name: 'FAL.AI',
        condition: () => process.env.FAL_KEY,
        generate: () => this.generateFalAIImage(prompt)
      },
      {
        name: 'OpenAI DALL-E 3',
        condition: () => process.env.OPENAI_API_KEY && this.openai,
        generate: () => this.generateDalleImage(prompt)
      },
      {
        name: 'Replicate',
        condition: () => process.env.REPLICATE_API_TOKEN,
        generate: () => this.generateReplicateImage(prompt)
      }
    ];

    for (const api of apis) {
      if (api.condition()) {
        try {
          console.log(`🎯 Trying ${api.name} for image generation...`);
          const imageUrl = await api.generate();
          console.log(`✅ ${api.name} image generated successfully!`);
          return imageUrl;
        } catch (error) {
          console.error(`❌ ${api.name} failed: ${error.message}`);
          continue; // Try next API
        }
      }
    }

    throw new Error('All image generation APIs failed or no API keys configured');
  }

  /**
   * GetImg.AI - FLUX.1 schnell
   */
  async generateGetImgAIImage(prompt) {
    console.log('🎨 Using GetImg.AI for FLUX.1 schnell...');
    console.log('🔑 API Key status:', process.env.GETIMG_API_KEY ? 'SET' : 'NOT SET');

    try {
      const response = await axios.post('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
        prompt: prompt,
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
        timeout: 60000
      });

      if (!response.data?.url) {
        throw new Error('Invalid response from GetImg.AI - no URL returned');
      }

      console.log(`💰 Cost: $${response.data.cost || 'Unknown'}`);
      console.log(`🌱 Seed: ${response.data.seed || 'Unknown'}`);
      return response.data.url;

    } catch (error) {
      console.error('❌ GetImg.AI Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 402) {
        throw new Error('GetImg.AI: No credits available');
      } else if (error.response?.status === 401) {
        throw new Error('GetImg.AI: Invalid API key');
      } else {
        throw new Error(`GetImg.AI API error: ${error.message}`);
      }
    }
  }

  /**
   * Together AI - FREE Flux.1
   */
  async generateTogetherAIImage(prompt) {
    console.log('🆓 Using Together AI (FREE) for Flux.1 schnell...');

    const response = await axios.post('https://api.together.xyz/v1/images/generations', {
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: prompt,
      width: 1024,
      height: 1024,
      steps: 4,
      n: 1
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    if (!response.data?.data?.[0]?.url) {
      throw new Error('Invalid response from Together AI');
    }

    console.log('💰 Cost: FREE!');
    return response.data.data[0].url;
  }

  /**
   * FAL.AI Flux.1
   */
  async generateFalAIImage(prompt) {
    console.log('💸 Using FAL.AI for Flux.1 schnell...');

    const response = await axios.post('https://fal.run/fal-ai/flux/schnell', {
      prompt: prompt,
      image_size: "square_hd",
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true
    }, {
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data?.images?.[0]?.url) {
      throw new Error('Invalid response from FAL.AI');
    }

    console.log('💰 Cost: ~$0.00252');
    return response.data.images[0].url;
  }

  /**
   * OpenAI DALL-E 3
   */
  async generateDalleImage(prompt) {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    console.log('🎨 Using OpenAI DALL-E 3...');

    const response = await this.openai.images.generate({
      model: this.imageModel,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    });

    if (!response.data?.[0]?.url) {
      throw new Error('Invalid response from OpenAI DALL-E');
    }

    console.log('💰 Cost: ~$0.04');
    return response.data[0].url;
  }

  /**
   * Replicate Flux
   */
  async generateReplicateImage(prompt) {
    console.log('🔄 Using Replicate for Flux...');

    const response = await axios.post('https://api.replicate.com/v1/predictions', {
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: prompt,
        width: 1024,
        height: 1024,
        num_inference_steps: 4,
        num_outputs: 1
      }
    }, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data?.output?.[0]) {
      throw new Error('Invalid response from Replicate');
    }

    console.log('💰 Cost: ~$0.003');
    return response.data.output[0];
  }

  /**
   * Download and save image to local filesystem
   */
  async downloadAndSaveImage(imageUrl, recipeName, mealId = null) {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');

      const filename = this.sanitizeFilename(recipeName);
      const dir = mealId
        ? path.join(__dirname, '../../../uploads/images/meals', mealId)
        : path.join(__dirname, '../../../uploads/images/meals');

      await this.ensureDirectoryExists(dir);

      const filepath = path.join(dir, `${filename}.jpg`);
      await fs.writeFile(filepath, buffer);

      return filepath;
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Extract filename from URL
   */
  extractFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return path.basename(pathname);
    } catch {
      return 'image.jpg';
    }
  }
}

module.exports = ImageGenerationManager;

