const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class OpenAIManager {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  }

  // Generate a complete recipe based on input parameters
  async generateRecipe(params = {}) {
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
      }

      // Log API key status (masked for security)
      const apiKeyMasked = process.env.OPENAI_API_KEY ? 
        `${process.env.OPENAI_API_KEY.substring(0, 7)}...${process.env.OPENAI_API_KEY.slice(-4)}` : 
        'NOT_SET';
      console.log('🔑 OpenAI API Key status:', apiKeyMasked);
      console.log('🤖 Using model:', this.model);
      console.log('🧠 Starting AI recipe generation with params:', JSON.stringify(params, null, 2));

      const {
        cuisine = 'any',
        category = 'any',
        mainIngredient = '',
        difficulty = 'medium',
        cookingTime = '30-45 minutes',
        servings = 4,
        dietaryRestrictions = [],
        theme = ''
      } = params;

      const prompt = this.buildRecipePrompt({
        cuisine,
        category,
        mainIngredient,
        difficulty,
        cookingTime,
        servings,
        dietaryRestrictions,
        theme
      });

      console.log('📝 Generated prompt for OpenAI (first 200 chars):', prompt.substring(0, 200) + '...');

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef and recipe developer. Generate detailed, authentic recipes with precise measurements and clear instructions. CRITICAL: Return ONLY valid JSON format - no additional text, explanations, or markdown formatting. The response must be pure JSON that starts with { and ends with }.'
          },
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Respond with ONLY the JSON object, no other text.'
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      });

      console.log('✅ OpenAI API call successful, processing response...');
      console.log('🔍 OpenAI response structure:', JSON.stringify(completion, null, 2));
      
      // Validate OpenAI response structure
      if (!completion || !completion.choices || !completion.choices[0]) {
        throw new Error('Invalid OpenAI response: No choices returned');
      }
      
      if (!completion.choices[0].message || !completion.choices[0].message.content) {
        throw new Error('Invalid OpenAI response: No message content');
      }
      
      const recipeData = this.parseAIResponse(completion.choices[0].message.content);
      const formattedRecipe = this.formatRecipeForDatabase(recipeData);
      console.log('✅ Recipe generation completed successfully');
      return formattedRecipe;
    } catch (error) {
      console.error('❌ Recipe generation error:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Provide more specific error messages
      if (error.message?.includes('API key') || error.message?.includes('Incorrect API key')) {
        throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
      } else if (error.message?.includes('insufficient_quota') || error.message?.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing.');
      } else if (error.message?.includes('rate_limit') || error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network error: Unable to connect to OpenAI API. Please check your internet connection.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else if (error.status === 400) {
        throw new Error('Invalid request to OpenAI API. Please check your configuration.');
      } else {
        throw new Error(`Recipe generation failed: ${error.message}`);
      }
    }
  }

  // Robust JSON parsing with error handling and cleanup
  parseAIResponse(content) {
    try {
      // Clean up the response - remove markdown formatting and extra text
      let cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      
      // Find JSON object/array boundaries
      const startBrace = cleanContent.indexOf('{');
      const startBracket = cleanContent.indexOf('[');
      const endBrace = cleanContent.lastIndexOf('}');
      const endBracket = cleanContent.lastIndexOf(']');
      
      let jsonContent;
      
      // Determine if it's an object or array and extract accordingly
      if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
        // It's an object
        if (endBrace === -1) {
          throw new Error('Invalid JSON: No closing brace found');
        }
        jsonContent = cleanContent.substring(startBrace, endBrace + 1);
      } else if (startBracket !== -1) {
        // It's an array
        if (endBracket === -1) {
          throw new Error('Invalid JSON: No closing bracket found');
        }
        jsonContent = cleanContent.substring(startBracket, endBracket + 1);
      } else {
        throw new Error('No valid JSON object or array found in response');
      }
      
      // Parse the cleaned JSON
      const parsed = JSON.parse(jsonContent);
      console.log('✅ Successfully parsed AI response');
      return parsed;
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError.message);
      console.error('🔍 Raw content length:', content.length);
      console.error('🔍 Content preview:', content.substring(0, 200) + '...');
      
      // Try one more time with even more aggressive cleaning
      try {
        const fallbackContent = content
          .replace(/^[^{[\n]*/, '') // Remove everything before first { or [
          .replace(/[^}\]]*$/, '') // Remove everything after last } or ]
          .trim();
          
        const fallbackParsed = JSON.parse(fallbackContent);
        console.log('✅ Fallback parsing succeeded');
        return fallbackParsed;
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError.message);
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}. Content: ${content.substring(0, 200)}...`);
      }
    }
  }

  // Generate multiple recipe ideas
  async generateRecipeIdeas(params = {}) {
    try {
      const {
        count = 5,
        cuisine = 'any',
        category = 'any',
        trending = false,
        seasonal = false
      } = params;

      const prompt = `Generate ${count} creative recipe ideas for ${cuisine !== 'any' ? cuisine : 'various'} cuisine${category !== 'any' ? ` in the ${category} category` : ''}. ${trending ? 'Focus on current food trends. ' : ''}${seasonal ? 'Consider seasonal ingredients. ' : ''}

Return a JSON array with each idea containing:
- name: Recipe name
- description: Brief description
- cuisine: Cuisine type
- category: Food category
- estimatedTime: Cooking time
- difficulty: easy/medium/hard
- keyIngredients: Array of 3-5 main ingredients
- uniqueFeature: What makes this recipe special

Format as valid JSON array.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a creative chef specializing in innovative recipe development. Generate diverse, interesting recipe ideas. CRITICAL: Return ONLY valid JSON format - no additional text, explanations, or markdown formatting. The response must be pure JSON that starts with [ and ends with ].'
          },
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Respond with ONLY the JSON array, no other text.'
          }
        ],
        temperature: 0.9,
        max_tokens: 1500
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      throw new Error(`Recipe ideas generation failed: ${error.message}`);
    }
  }

  // Generate ultra-high quality recipe image using AI-enhanced prompts
  async generateRecipeImage(recipeName, description = '', mealId = null) {
    try {
      console.log('🧠 AI is crafting professional photography prompt...');
      
      // Step 1: Generate ultra-detailed photography prompt with AI
      const enhancedPrompt = await this.generatePhotographyPrompt(recipeName, description);
      
      console.log('🎨 Generating ULTRA-HIGH QUALITY image with DALL-E 3...');
      console.log('📸 Enhanced Prompt:', enhancedPrompt.substring(0, 150) + '...');
      
      // Step 2: Generate image with maximum quality settings
      const response = await this.openai.images.generate({
        model: this.imageModel,
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',      // Maximum square resolution
        quality: 'hd',          // HIGHEST quality setting
        style: 'natural'        // Most photorealistic style
      });

      const dalleUrl = response.data[0].url;
      console.log('✅ ULTRA-HIGH QUALITY image generated, downloading...');

      // Download and save the image
      const localImageData = await this.downloadAndSaveImage(dalleUrl, recipeName, mealId);

      return {
        url: localImageData.url,
        localPath: localImageData.localPath,
        dalleUrl: dalleUrl,
        prompt: enhancedPrompt,
        basicPrompt: `${recipeName} ${description}`,
        quality: 'hd',
        saved: true
      };
    } catch (error) {
      console.error('❌ Ultra-high quality image generation failed:', error.message);
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  // AI generates its own professional photography prompt
  async generatePhotographyPrompt(recipeName, description = '') {
    try {
      const promptGenerationRequest = `As a world-class food photographer and prompt engineer, create an ultra-detailed DALL-E prompt for photographing "${recipeName}". ${description ? `Context: ${description}.` : ''}

Create a prompt that will produce a photograph indistinguishable from reality. Include:

🔸 CAMERA SPECIFICATIONS:
- Professional camera model (Canon R5, Sony A7R IV, etc.)
- Premium lens specifications (85mm f/1.4, 100mm macro, etc.)
- Aperture, ISO, shutter speed details

🔸 LIGHTING SETUP:
- PERFECT ILLUMINATION: Bright, even, professional studio lighting
- WELL-LIT BACKGROUND: Soft, bright background lighting eliminates shadows
- FOOD-FOCUSED LIGHTING: Key light positioned to make the plated food luminous and appealing
- MULTIPLE LIGHT SOURCES: Key light, fill light, and background light for complete coverage
- GOLDEN RATIO LIGHTING: Warm, inviting light temperature (3000K-3500K)
- NO DARK SHADOWS: Gentle fill lighting ensures every detail is beautifully visible

🔸 COMPOSITION & STYLING:
- PERFECT FRAMING: Dish fills 75-85% of frame, hero-centered composition
- STUNNING DISHWARE: Exquisite, museum-quality plates/bowls that elevate the food
- CAMERA ANGLE: Top-down (overhead) or 45-degree side angle for maximum visual impact
- BEAUTIFUL WELL-LIT BACKGROUND: Bright, luminous natural surfaces (light wood, bright marble, or warm stone)
- BRIGHT & INVITING: Well-illuminated backgrounds that make everything glow beautifully
- FOOD IS THE STAR: Every element designed to make the plated food irresistibly beautiful
- ARTISTIC PLATING: Michelin-star level food presentation with perfect color harmony
- VISUAL PERFECTION: Every grain, texture, and color optimized for maximum beauty
- PRISTINE CLEANLINESS: Spotless dishware and surfaces reflecting professional standards
- APPETIZING APPEAL: Food styled to trigger immediate hunger and desire

🔸 TECHNICAL QUALITY:
- CRYSTAL-CLEAR SHARPNESS: Every detail razor-sharp and perfectly in focus
- LUMINOUS COLOR PALETTE: Vibrant, saturated colors that make food look irresistible
- PERFECT EXPOSURE: Bright, well-exposed image with no dark areas or harsh shadows
- TEXTURE MASTERY: Every surface texture enhanced - from crispy edges to smooth sauces
- APPETIZING GLOW: Food appears to emit its own warm, inviting light
- PROFESSIONAL COLOR GRADING: Colors enhanced to maximum visual appeal

🔸 ARTISTIC ELEMENTS:
- MOUTHWATERING APPEAL: Food styled to be irresistibly beautiful and appetizing
- PERFECT COLOR HARMONY: Colors balanced for maximum visual pleasure and appetite appeal
- LUXURIOUS ATMOSPHERE: High-end restaurant ambiance with premium presentation
- VISUAL STORYTELLING: Every element tells the story of culinary perfection
- EMOTIONAL CONNECTION: Image evokes immediate desire and hunger for the dish

Generate a single, comprehensive prompt (max 400 words) that would create a photograph so realistic it could be published in a Michelin-starred restaurant's cookbook.

CRITICAL STYLING REQUIREMENTS:
- HERO FOCUS: The plated dish is the absolute star - everything serves to make it beautiful
- STUNNING DISHWARE: Museum-quality, elegant plates/bowls that complement the food perfectly
- PERFECT BRIGHT LIGHTING: Well-lit, luminous scene with no dark shadows anywhere
- BEAUTIFUL BACKGROUNDS: Bright, warm, natural surfaces that glow softly (light wood, bright marble, warm stone)
- APPETIZING PERFECTION: Food styled to be irresistibly beautiful and immediately hunger-inducing
- CAMERA ANGLE: Top-down or 45-degree angle that showcases the food's beauty maximally
- PRISTINE PRESENTATION: Every element polished to perfection
- COLOR MASTERY: Rich, vibrant colors that make the food look absolutely delicious
- PROFESSIONAL LIGHTING: Bright, even illumination that makes everything glow beautifully
- VISUAL FEAST: Create an image so beautiful it's impossible to look away from the food

Return ONLY the prompt, no explanation.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a world-renowned food photographer and DALL-E prompt specialist. You create prompts that generate photorealistic, magazine-quality food photography that is indistinguishable from reality.'
          },
          {
            role: 'user',
            content: promptGenerationRequest
          }
        ],
        temperature: 0.9,  // High creativity for diverse prompts
        max_tokens: 500
      });

      const enhancedPrompt = completion.choices[0].message.content.trim();
      
      // Add final technical specifications for maximum realism
      const finalPrompt = `${enhancedPrompt}

TECHNICAL SPECIFICATIONS: Ultra-high resolution, professional food photography, shot with Canon EOS R5, 100mm macro lens, f/4 for perfect depth of field, ISO 100 for pristine quality, PREMIUM LIGHTING SETUP with multiple professional lights - bright key light, soft fill light, and background lighting for complete illumination, meticulously styled, Michelin-star restaurant quality, photorealistic, ultra-sharp details, vibrant color accuracy, commercial photography standard. LUMINOUS PERFECTION: Exquisite dishware, bright well-lit natural surface background, dish perfectly centered as the hero element, top-down or 45-degree angle, museum-quality plating that looks irresistibly delicious, every detail optimized for maximum beauty and appetite appeal.`;

      return finalPrompt;

    } catch (error) {
      console.error('❌ Photography prompt generation failed, using fallback:', error.message);
      
      // Fallback to professional prompt if AI fails
      return this.getFallbackPhotographyPrompt(recipeName, description);
    }
  }

  // Fallback ultra-detailed prompt if AI generation fails
  getFallbackPhotographyPrompt(recipeName, description) {
    return `Ultra-high resolution professional food photography of ${recipeName}. ${description ? description + '. ' : ''}Shot with Canon EOS R5, 100mm f/2.8L macro lens, aperture f/4 for perfect depth of field, ISO 100, 1/60s shutter speed. PREMIUM STUDIO LIGHTING SETUP: Multiple professional lights - large softbox key light, bright fill light, dedicated background lighting for complete illumination, warm color temperature 3200K. Food meticulously styled by world-class food stylist, artfully plated on EXQUISITE, MUSEUM-QUALITY dishware that elevates the food's beauty. CAMERA ANGLE: Top-down (overhead) or 45-degree side angle for maximum visual impact. HERO FRAMING: dish centered and fills 80% of frame as the absolute star. LUMINOUS BACKGROUND: Bright, well-lit natural surface (light wood, bright marble, or warm stone) that glows softly. PERFECT ILLUMINATION: Every detail brilliantly lit with no dark shadows anywhere. Ultra-sharp macro details showing every appetizing texture, glistening surfaces, natural steam, vibrant colors. Commercial food photography quality, Michelin-starred restaurant presentation, magazine cover worthy, photorealistic, indistinguishable from reality. APPETIZING PERFECTION: Colors enhanced for maximum visual appeal, perfect bright exposure, food appears irresistibly delicious. CRITICAL: Show only the finished plated dish on stunning dishware, bright well-lit scene, natural surface background, perfect camera angle, focused entirely on making the food look absolutely beautiful and mouth-watering.`;
  }

  // Download image from DALL-E URL and save locally
  async downloadAndSaveImage(dalleUrl, recipeName, mealId = null) {
    try {
      // Create filename
      const timestamp = Date.now();
      const safeName = this.sanitizeFilename(recipeName);
      const filename = mealId ? `${mealId}-${safeName}.jpg` : `ai-${timestamp}-${safeName}.jpg`;
      
      // Ensure directories exist
      const mealsDir = path.join(process.cwd(), 'uploads', 'images', 'meals');
      await this.ensureDirectoryExists(mealsDir);
      
      const localPath = path.join(mealsDir, filename);
      const publicUrl = `/images/meals/${filename}`;

      console.log(`📥 Downloading image to: ${localPath}`);

      // Download image with extended timeout for HD quality
      const imageResponse = await axios({
        method: 'GET',
        url: dalleUrl,
        responseType: 'stream',
        timeout: 60000, // 60 second timeout for HD images
        maxContentLength: 50000000, // 50MB max for HD images
        headers: {
          'User-Agent': 'FoodDB-AI-ImageDownloader/1.0'
        }
      });

      // Save to file
      const writer = require('fs').createWriteStream(localPath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log('✅ Image saved successfully!');

      return {
        url: publicUrl,
        localPath: localPath,
        filename: filename
      };
    } catch (error) {
      console.error('❌ Image download failed:', error.message);
      throw new Error(`Image download failed: ${error.message}`);
    }
  }

  // Utility methods
  sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50); // Limit length
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Improve existing recipe with AI suggestions
  async improveRecipe(existingRecipe) {
    try {
      const prompt = `Analyze and improve this recipe. Provide suggestions for:
1. Enhanced flavor combinations
2. Better cooking techniques  
3. Additional ingredients that would complement
4. Presentation improvements
5. Nutritional enhancements

Existing Recipe:
Name: ${existingRecipe.strMeal}
Category: ${existingRecipe.strCategory}
Area: ${existingRecipe.strArea}
Instructions: ${existingRecipe.strInstructions}
Ingredients: ${this.getIngredientsText(existingRecipe)}

Return JSON with:
- improvedName: Enhanced recipe name
- suggestions: Array of improvement suggestions
- enhancedInstructions: Improved cooking instructions
- additionalIngredients: Suggested new ingredients
- tips: Cooking tips and tricks`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a culinary expert focused on recipe improvement and optimization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('❌ Recipe improvement error:', error.message);
      throw new Error(`Recipe improvement failed: ${error.message}`);
    }
  }

  // Generate seasonal recipe suggestions
  async generateSeasonalRecipes(season, count = 5) {
    try {
      const seasonalIngredients = {
        spring: 'asparagus, peas, artichokes, strawberries, rhubarb, spring onions',
        summer: 'tomatoes, corn, zucchini, berries, stone fruits, herbs',
        fall: 'pumpkin, squash, apples, pears, brussels sprouts, sweet potatoes',
        winter: 'root vegetables, citrus, pomegranates, cranberries, cabbage, leeks'
      };

      const ingredients = seasonalIngredients[season.toLowerCase()] || 'seasonal ingredients';

      const prompt = `Generate ${count} delicious ${season} recipes featuring seasonal ingredients like ${ingredients}. 

For each recipe, return JSON format with:
- strMeal: Recipe name
- strCategory: Food category
- strArea: Cuisine origin
- strInstructions: Detailed cooking instructions
- ingredients: Object with strIngredient1-20 and strMeasure1-20
- strTags: Comma-separated tags
- seasonalHighlight: Why this recipe is perfect for ${season}

Return as JSON array.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a seasonal cooking expert specializing in ${season} cuisine.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      });

      return this.parseAIResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('❌ Seasonal recipe generation error:', error.message);
      throw new Error(`Seasonal recipe generation failed: ${error.message}`);
    }
  }

  // Helper methods - COMPREHENSIVE RECIPE DATA GENERATION
  buildRecipePrompt(params) {
    const restrictionsText = params.dietaryRestrictions.length > 0 
      ? ` The recipe must accommodate these dietary restrictions: ${params.dietaryRestrictions.join(', ')}.`
      : '';

    const allowedEquipment = [
      "Air fryer", "Broiler pan", "Dutch oven", "Grill", "Grill pan", "Microwave", "Oven", 
      "Pressure cooker", "Rice cooker", "Saucepan", "Baking sheet", "Frying pan", "Slow cooker", 
      "Small pot", "Medium pot", "Large pot", "Stovetop", "Wok", "Bench scraper", "Chef's knife", 
      "Citrus juicer", "Citrus zester", "Cutting board", "Dough scraper", "Egg separator", 
      "Fish spatula", "Food tweezers", "Garlic press", "Jar opener", "Kitchen scissors", "Ladle", 
      "Mandoline slicer", "Meat tenderizer", "Spray bottle", "Paring knife", "Pastry blender", 
      "Pastry brush", "Pasta spoon", "Peeler", "Pizza cutter", "Rolling pin", "Spatula (rubber)", 
      "Spatula (metal)", "Tongs", "Vegetable peeler", "Whisk", "Zester", "Glass measuring cup", 
      "Kitchen scale", "Large mixing bowl", "Medium mixing bowl", "Small mixing bowl", 
      "Measuring cups", "Measuring spoons", "Mortar and pestle", "Piping bag", "Plate", "Bowl", 
      "Salad bowl", "Serving bowl", "Tamper (for blender)", "Timer", "Toothpicks", 
      "Tweezers (plating)", "Fork", "Spoon", "Knife (table)", "Serving spoon", "Slotted spoon", 
      "Baking dish", "Baking ramekin", "Cake pan", "Cooling rack", "Cookie cutters", "Loaf pan", 
      "Muffin tin", "Parchment paper", "Pie dish", "Silicone baking mat", "Springform pan", 
      "Stand mixer", "Whipped cream siphon", "Can opener", "Colander", "Funnel", "Salad spinner", 
      "Sieve", "Skewers", "Strainer", "Storage container", "Bottle opener", "Corkscrew", 
      "Ice cube mold", "Ice cream scoop", "Cocktail shaker", "Aluminum foil", "Apron", 
      "Dish towel", "Oven mitts", "Paper towels", "Plastic wrap", "Trivet", "Chopsticks", 
      "Food processor", "Hand mixer", "Sous vide wand"
    ];

    return `Create an extremely detailed, comprehensive recipe with the following specifications:
- Cuisine: ${params.cuisine}
- Category: ${params.category}
- Main ingredient: ${params.mainIngredient || 'chef\'s choice'}
- Difficulty: ${params.difficulty}
- Cooking time: ${params.cookingTime}
- Servings: ${params.servings}
- Theme: ${params.theme || 'traditional'}${restrictionsText}

🚨 ABSOLUTE CRITICAL REQUIREMENTS - FAILURE TO FOLLOW = REJECTED:
1. 🚫 NEVER EVER use "N/A", "TBD", "Unknown", or any placeholder text
2. 🚫 ALL fields must have REAL, SPECIFIC values - no generic descriptions
3. 🚫 ONLY use equipment from this list: ${allowedEquipment.join(', ')}
4. ✅ Instructions must be ACTUAL cooking steps (not descriptions)
5. ✅ All times must be specific numbers (15 min, 25 min, etc.)
6. ✅ All measurements must be precise (2 cups, 1 tbsp, etc.)
7. ✅ Generate complete ingredient slots 1-20

⚠️ IF YOU USE "N/A" ANYWHERE, THE ENTIRE RESPONSE IS INVALID ⚠️

Return ONLY valid JSON with this COMPLETE structure:

{
  "strMeal": "Creative Recipe Name (never generic)",
  "strDrinkAlternate": "",
  "strCategory": "${params.category}",
  "strArea": "${params.cuisine}",
  "strInstructions": "Complete detailed cooking instructions",
  "strMealThumb": "PLACEHOLDER_FOR_IMAGE",
  "strTags": "comma,separated,relevant,tags",
  "strYoutube": "",
  "strSource": "AI Generated",
  "strImageSource": "",
  "strCreativeCommonsConfirmed": "",
  "dateModified": "${new Date().toISOString()}",
  
  "instructionsArray": [
    "Step 1: Detailed first instruction with specific techniques",
    "Step 2: Detailed second instruction with temperatures/times",
    "Step 3: Continue with specific steps..."
  ],
  
  "ingredientsArray": [
    {
      "name": "specific ingredient name",
      "amount": "precise amount",
      "unit": "cups/tbsp/oz/etc",
      "notes": "preparation notes if needed"
    }
  ],
  
  "strIngredient1": "First ingredient name",
  "strMeasure1": "Precise measurement",
  "strIngredient2": "Second ingredient name", 
  "strMeasure2": "Precise measurement",
  "strIngredient3": "Third ingredient name",
  "strMeasure3": "Precise measurement",
  "strIngredient4": "Fourth ingredient name",
  "strMeasure4": "Precise measurement",
  "strIngredient5": "Fifth ingredient name",
  "strMeasure5": "Precise measurement",
  "strIngredient6": "Sixth ingredient name",
  "strMeasure6": "Precise measurement",
  "strIngredient7": "Seventh ingredient name",
  "strMeasure7": "Precise measurement",
  "strIngredient8": "Eighth ingredient name",
  "strMeasure8": "Precise measurement",
  "strIngredient9": "",
  "strMeasure9": "",
  "strIngredient10": "",
  "strMeasure10": "",
  "strIngredient11": "",
  "strMeasure11": "",
  "strIngredient12": "",
  "strMeasure12": "",
  "strIngredient13": "",
  "strMeasure13": "",
  "strIngredient14": "",
  "strMeasure14": "",
  "strIngredient15": "",
  "strMeasure15": "",
  "strIngredient16": "",
  "strMeasure16": "",
  "strIngredient17": "",
  "strMeasure17": "",
  "strIngredient18": "",
  "strMeasure18": "",
  "strIngredient19": "",
  "strMeasure19": "",
  "strIngredient20": "",
  "strMeasure20": "",
  
  "nutrition": {
    "calories": "350",
    "protein": "28g",
    "carbs": "45g",
    "fat": "12g",
    "fiber": "4g",
    "sugar": "6g",
    "sodium": "580mg"
  },
  
  "cookingInfo": {
    "prepTime": "15 minutes",
    "cookTime": "25 minutes", 
    "totalTime": "40 minutes",
    "servings": ${params.servings},
    "difficulty": "${params.difficulty}",
    "equipment": ["Large pot", "Chef's knife", "Cutting board"],
    "yield": "Serves ${params.servings}"
  }
}

🚨 ABSOLUTE REQUIREMENTS - ZERO TOLERANCE FOR N/A:
- Fill ALL ingredient slots (1-20) - use empty string "" for unused slots, NEVER null or undefined
- Create 6-12 detailed COOKING STEPS (not descriptions) - "Heat oil in pan", "Add chicken and cook 5 minutes"
- Use ONLY the allowed equipment list provided above
- 🚫 BANNED WORDS: "N/A", "TBD", "Unknown", "Various", "As needed", "To taste"
- ✅ REQUIRED: Specific times (15 min, 25 min), specific amounts (2 cups, 1 tbsp)
- ✅ REQUIRED: Real nutritional values (350 calories, 28g protein)
- ✅ REQUIRED: Specific recipe names (Tuscan Herb Chicken Pasta, not "Pasta Dish")
- ✅ REQUIRED: Actual cooking instructions with temperatures (350°F, medium heat)
- ✅ REQUIRED: Precise measurements for ALL ingredients

🔥 VALIDATION CHECK: Scan your entire response and replace ANY "N/A" with real values before returning!`;
  }

  formatRecipeForDatabase(recipeData) {
    // Handle the new simplified format
    const formatted = {
      // Core TheMealDB format - directly from AI response
      strMeal: recipeData.strMeal || 'Unnamed Recipe',
      strDrinkAlternate: recipeData.strDrinkAlternate || '',
      strCategory: recipeData.strCategory || 'Miscellaneous',
      strArea: recipeData.strArea || 'Unknown',
      strInstructions: recipeData.strInstructions || '',
      strMealThumb: recipeData.strMealThumb || '',
      strTags: recipeData.strTags || '',
      strYoutube: recipeData.strYoutube || '',
      strSource: recipeData.strSource || 'AI Generated',
      strImageSource: recipeData.strImageSource || '',
      strCreativeCommonsConfirmed: recipeData.strCreativeCommonsConfirmed || '',
      dateModified: recipeData.dateModified || new Date().toISOString(),

      // Enhanced arrays for better data access
      instructionsArray: recipeData.instructionsArray || [],
      ingredientsArray: recipeData.ingredientsArray || [],

      // Nutritional information
      nutrition: recipeData.nutrition || {},
      
      // Cooking information
      cookingInfo: recipeData.cookingInfo || {}
    };

    // Add all 20 ingredient slots from AI response
    for (let i = 1; i <= 20; i++) {
      formatted[`strIngredient${i}`] = recipeData[`strIngredient${i}`] || '';
      formatted[`strMeasure${i}`] = recipeData[`strMeasure${i}`] || '';
    }

    // 🚨 CRITICAL: Remove ALL N/A values and replace with realistic data
    const cleanedFormatted = this.eliminateNAValues(formatted);

    return cleanedFormatted;
  }

  // 🚨 CRITICAL: Eliminate ALL N/A values from recipe data
  eliminateNAValues(recipeData) {
    const cleaned = { ...recipeData };
    
    // Replace N/A values with realistic defaults
    const naReplacements = {
      'N/A': '',
      'n/a': '',
      'NA': '',
      'na': '',
      'TBD': '',
      'tbd': '',
      'Unknown': '',
      'unknown': '',
      'Various': '',
      'various': '',
      'As needed': '1 tsp',
      'To taste': '1/2 tsp'
    };
    
    // Specific field replacements
    const fieldDefaults = {
      prepTime: '15 minutes',
      cookTime: '25 minutes',
      totalTime: '40 minutes',
      yield: `Serves ${cleaned.cookingInfo?.servings || 4}`,
      mealType: 'dinner',
      dishType: 'main dish',
      mainIngredient: cleaned.strCategory?.toLowerCase() || 'mixed',
      occasion: 'weeknight dinner',
      timeCategory: 'under 1 hour'
    };
    
    // Clean all string values
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string') {
        let value = cleaned[key];
        
        // Replace N/A variations
        Object.keys(naReplacements).forEach(na => {
          if (value === na || value.includes(na)) {
            value = naReplacements[na];
          }
        });
        
        // Apply field-specific defaults
        if (fieldDefaults[key] && (!value || value === '')) {
          value = fieldDefaults[key];
        }
        
        cleaned[key] = value;
      }
    });
    
    // Clean nested objects
    if (cleaned.cookingInfo) {
      Object.keys(cleaned.cookingInfo).forEach(key => {
        if (typeof cleaned.cookingInfo[key] === 'string') {
          let value = cleaned.cookingInfo[key];
          Object.keys(naReplacements).forEach(na => {
            if (value === na || value.includes(na)) {
              value = fieldDefaults[key] || naReplacements[na];
            }
          });
          cleaned.cookingInfo[key] = value;
        }
      });
    }

    if (cleaned.nutrition) {
      Object.keys(cleaned.nutrition).forEach(key => {
        if (typeof cleaned.nutrition[key] === 'string' && (cleaned.nutrition[key] === 'N/A' || cleaned.nutrition[key] === '')) {
          const nutritionDefaults = {
            calories: '350',
            protein: '25g',
            carbs: '40g',
            fat: '12g',
            fiber: '4g',
            sugar: '8g',
            sodium: '580mg'
          };
          cleaned.nutrition[key] = nutritionDefaults[key] || '0g';
        }
      });
    }

    return cleaned;
  }

  getIngredientsText(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure || ''} ${ingredient}`.trim());
      }
    }
    return ingredients.join(', ');
  }
}

module.exports = OpenAIManager;