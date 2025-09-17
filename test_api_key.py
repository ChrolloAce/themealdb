#!/usr/bin/env python3

import json
import urllib.request
import urllib.parse
import ssl

API_KEY = "key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw"

print("🔍 Testing FAL API Key with Python")
print("==================================")

# Validate key format
print(f"📋 Key Analysis:")
print(f"  Format: {'✅ Valid' if API_KEY.startswith('key-') else '❌ Invalid'}")
print(f"  Length: {len(API_KEY)} characters")
print(f"  Masked: {API_KEY[:15]}...{API_KEY[-10:]}")

# Test API call
print(f"\n🔄 Testing API call to fal.ai...")

try:
    # Prepare the request
    url = "https://fal.run/fal-ai/flux/schnell"
    
    data = {
        "prompt": "A simple test image of a delicious pizza, professional food photography",
        "image_size": "square_hd",
        "num_inference_steps": 4,
        "num_images": 1,
        "enable_safety_checker": True
    }
    
    # Convert to JSON
    json_data = json.dumps(data).encode('utf-8')
    
    # Create request
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Key {API_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.data = json_data
    
    print("📡 Making API request...")
    
    # Make the request
    with urllib.request.urlopen(req, timeout=30) as response:
        status_code = response.getcode()
        response_data = response.read().decode('utf-8')
        
        print(f"📊 Status Code: {status_code}")
        
        if status_code == 200:
            result = json.loads(response_data)
            if 'images' in result and len(result['images']) > 0:
                print("✅ SUCCESS! Your FAL API key works perfectly!")
                print(f"🖼️  Generated image URL: {result['images'][0]['url']}")
                print("💰 Cost: ~$0.00252")
                print("🎉 Image generation is ready for your FoodDB app!")
            else:
                print("⚠️  API responded but no images in response")
                print(f"📄 Response: {response_data[:200]}...")
        else:
            print(f"❌ API call failed with status {status_code}")
            print(f"📄 Response: {response_data[:200]}...")

except urllib.error.HTTPError as e:
    error_response = e.read().decode('utf-8')
    print(f"❌ HTTP Error {e.code}: {e.reason}")
    print(f"📄 Error response: {error_response[:200]}...")
    
    if e.code == 401:
        print("💡 This usually means the API key is invalid or expired")
    elif e.code == 429:
        print("💡 Rate limit exceeded - try again in a moment")
    elif e.code == 402:
        print("💡 Payment required - check your fal.ai account balance")

except Exception as e:
    print(f"❌ Request failed: {str(e)}")

print(f"\n🔧 Environment Variable Setup for Vercel:")
print(f"FAL_KEY={API_KEY}")
