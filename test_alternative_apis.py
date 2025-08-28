#!/usr/bin/env python3

import json
import urllib.request
import urllib.parse

API_KEY = "key-1mJfmM0BOGNWPGimkjcPxJbiF9YJesDdg8CQCLiyDvQCmBuxS8Clp2O5qywLn1eN6SUJ8iwdCnVZ0qbbTa4AdPaMsvPT1VMw"

print("🔍 Testing Alternative FAL.AI Endpoints")
print("=======================================")

# Test different endpoints and auth formats
endpoints = [
    {
        "name": "fal.ai flux schnell (standard)",
        "url": "https://fal.run/fal-ai/flux/schnell",
        "auth": f"Key {API_KEY}"
    },
    {
        "name": "fal.ai flux schnell (alt endpoint)",
        "url": "https://fal.run/fal-ai/flux-schnell",
        "auth": f"Key {API_KEY}"
    },
    {
        "name": "fal.ai with Bearer token",
        "url": "https://fal.run/fal-ai/flux/schnell",
        "auth": f"Bearer {API_KEY}"
    }
]

for endpoint in endpoints:
    print(f"\n🔄 Testing {endpoint['name']}...")
    print(f"📍 URL: {endpoint['url']}")
    
    try:
        data = {
            "prompt": "A simple test image of a red apple",
            "image_size": "square_hd",
            "num_inference_steps": 4,
            "num_images": 1
        }
        
        json_data = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(endpoint['url'])
        req.add_header('Authorization', endpoint['auth'])
        req.add_header('Content-Type', 'application/json')
        req.data = json_data
        
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            response_data = response.read().decode('utf-8')
            
            print(f"✅ {endpoint['name']} SUCCESS!")
            print(f"📊 Status: {status_code}")
            
            result = json.loads(response_data)
            if 'images' in result:
                print(f"🖼️ Image URL: {result['images'][0]['url']}")
                print("🎉 This endpoint works! Use this configuration.")
                break
            
    except urllib.error.HTTPError as e:
        error_response = e.read().decode('utf-8') if e.code != 404 else "Not found"
        print(f"❌ {endpoint['name']} failed:")
        print(f"   Status: {e.code}")
        print(f"   Error: {error_response[:100]}...")
        
    except Exception as e:
        print(f"❌ {endpoint['name']} failed: {str(e)}")

print(f"\n💡 API Key Analysis:")
print(f"   - Format appears correct (starts with 'key-', proper length)")
print(f"   - But getting 401 Unauthorized from fal.ai")
print(f"   - This suggests the key is invalid, expired, or has no credits")

print(f"\n🔧 Alternative Solutions:")
print(f"1. Check your fal.ai account: https://fal.ai/dashboard")
print(f"2. Verify account has credits/balance")
print(f"3. Try generating a new API key")
print(f"4. Use alternative free services like Together AI")

print(f"\n🆓 Free Alternative - Together AI:")
print(f"   - Get free API key: https://api.together.xyz/settings/api-keys") 
print(f"   - Free Flux.1 schnell model available")
print(f"   - Set TOGETHER_API_KEY environment variable")
