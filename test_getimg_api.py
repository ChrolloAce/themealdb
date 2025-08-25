#!/usr/bin/env python3

import json
import urllib.request
import urllib.parse

API_KEY = "key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw"

print("🔍 Testing GetImg.AI API Key")
print("============================")
print(f"📋 Key: {API_KEY[:15]}...{API_KEY[-10:]}")

# Test GetImg.AI API with correct format
try:
    url = "https://api.getimg.ai/v1/flux-schnell/text-to-image"
    
    data = {
        "prompt": "A delicious pizza with cheese and herbs, professional food photography, restaurant quality",
        "width": 1024,
        "height": 1024,
        "steps": 4,
        "output_format": "jpeg",
        "response_format": "url"
    }
    
    # Convert to JSON
    json_data = json.dumps(data).encode('utf-8')
    
    # Create request with Bearer token (not Key like FAL.AI)
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {API_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    req.data = json_data
    
    print("📡 Making API request to GetImg.AI...")
    
    with urllib.request.urlopen(req, timeout=30) as response:
        status_code = response.getcode()
        response_data = response.read().decode('utf-8')
        
        print(f"📊 Status Code: {status_code}")
        
        if status_code == 200:
            result = json.loads(response_data)
            print("✅ SUCCESS! Your GetImg.AI API key works perfectly!")
            print(f"🖼️  Generated image URL: {result.get('url', 'No URL')}")
            print(f"💰 Cost: ${result.get('cost', 'Unknown')}")
            print(f"🌱 Seed: {result.get('seed', 'Unknown')}")
            print("🎉 GetImg.AI FLUX.1 schnell is working!")
        else:
            print(f"❌ API call failed with status {status_code}")
            print(f"📄 Response: {response_data}")

except urllib.error.HTTPError as e:
    error_response = e.read().decode('utf-8')
    print(f"❌ HTTP Error {e.code}: {e.reason}")
    print(f"📄 Error response: {error_response}")
    
    if e.code == 401:
        print("💡 API key might be invalid or expired")
        print("💡 Check your GetImg.AI dashboard: https://dashboard.getimg.ai/api-keys")
    elif e.code == 429:
        print("💡 Rate limit exceeded - try again in a moment")
    elif e.code == 402:
        print("💡 Payment required - check your GetImg.AI account balance")

except Exception as e:
    print(f"❌ Request failed: {str(e)}")

print(f"\n🔧 Environment Variable for Vercel:")
print(f"GETIMG_API_KEY={API_KEY}")
print(f"\n📖 GetImg.AI Documentation: https://docs.getimg.ai/")
