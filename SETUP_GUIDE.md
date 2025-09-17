# 🚀 FoodDB Setup Guide - Get Image Generation Working

Your FAL API key looks valid! Here's how to get everything working:

## ✅ **Your API Key Status**
- **FAL API Key**: `key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw`
- **Service**: fal.ai (Flux.1 schnell)
- **Cost**: ~$0.00252 per image (very cheap!)
- **Quality**: High-definition (1024x1024)

## 🔧 **Step 1: Install Node.js**

Since Node.js isn't installed on your system, you need to install it first:

### Option A: Download from Official Site (Recommended)
1. Go to https://nodejs.org/
2. Download the LTS version (Long Term Support)
3. Install the .pkg file
4. Restart your terminal

### Option B: Install via Homebrew
```bash
# Install Homebrew first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

### Option C: Install via NVM (Node Version Manager)
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then install Node.js
nvm install --lts
nvm use --lts
```

## 🔧 **Step 2: Test Your API Key**

After installing Node.js, test your API key:

```bash
cd /Users/ernestolopez/Downloads/themealdb-main
node test-api-key.js
```

You should see:
```
✅ SUCCESS! Your API key works!
🖼️ Generated image URL: https://...
💰 Approximate cost: $0.00252
```

## 🔧 **Step 3: Set Up Environment Variables**

Create a `.env` file with your API key:

```bash
# Copy the example file
cp environment.example .env

# The .env file should contain:
FAL_KEY=key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw
```

## 🔧 **Step 4: Install Dependencies**

```bash
npm install
```

## 🔧 **Step 5: Start the Server**

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

## 🔧 **Step 6: Test Image Generation**

1. **Open the admin panel**: http://localhost:3000/admin-panel
2. **Login**: 
   - Username: `admin`
   - Password: `fooddb_admin_2024`
3. **Go to "Generate Recipes" tab**
4. **Check "Generate AI Image"**
5. **Click "Generate & Save"**

You should see high-quality food images generated!

## 🎯 **What This Fixes**

✅ **Image Generation**: Your FAL API key enables Flux.1 schnell image generation
✅ **Cost Effective**: Only $0.00252 per image (vs DALL-E 3 at ~$0.04)
✅ **High Quality**: 1024x1024 professional food photography
✅ **Fast Generation**: Flux.1 schnell is optimized for speed

## 🔍 **Troubleshooting**

### If Node.js installation fails:
- Make sure you have admin privileges
- Try a different installation method
- Check your internet connection

### If API key doesn't work:
- Check your fal.ai account balance
- Verify the key hasn't expired
- Try the test script: `node test-api-key.js`

### If server won't start:
- Make sure port 3000 is available
- Check that all dependencies installed: `npm install`
- Look for error messages in the terminal

## 🎉 **Expected Results**

Once everything is working, you'll be able to:

1. **Generate recipes with AI** (if you add OpenAI API key later)
2. **Create stunning food images** with your FAL API key
3. **Manage recipes** through the admin panel
4. **Use the public API** for development

Your FAL API key should work perfectly for image generation!
