# 🍽️ FoodDB - Free Recipe API

A comprehensive REST API for recipes, ingredients, and meal information, built with Node.js and SQLite. Similar to TheMealDB but with modern architecture and extensible design.

## ✨ Features

- **Free API Access** - Use test API key "1" for development and educational purposes
- **Comprehensive Recipe Database** - Recipes with detailed ingredients, instructions, and metadata
- **Advanced Search & Filtering** - Search by name, ingredient, category, area, and more
- **Image Management** - Automatic image processing and thumbnail generation
- **Premium Features** - Multi-ingredient filtering, latest meals, random selections
- **Modern Architecture** - Object-oriented design following SOLID principles
- **Rate Limiting** - Built-in protection against abuse
- **RESTful Design** - Clean, predictable API endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd FoodDB
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**
   ```bash
   npm start      # Production
   npm run dev    # Development with auto-reload
   ```

4. **Visit the API**
   - API Documentation: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Example API Call: http://localhost:3000/api/json/v1/1/random.php

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api/json/v1/{API_KEY}
```

### Authentication
- **Test Key**: `1` (free, rate-limited)
- **Premium Key**: Contact us for premium access

### Endpoints

#### 🔍 Search & Lookup

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /search.php?s={name}` | Search meals by name | `/search.php?s=Arrabiata` |
| `GET /search.php?f={letter}` | List meals by first letter | `/search.php?f=a` |
| `GET /lookup.php?i={id}` | Get meal details by ID | `/lookup.php?i=52771` |
| `GET /random.php` | Get random meal | `/random.php` |

#### 📋 Categories & Lists

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /categories.php` | Get all categories | `/categories.php` |
| `GET /list.php?c=list` | List all categories | `/list.php?c=list` |
| `GET /list.php?a=list` | List all areas | `/list.php?a=list` |
| `GET /list.php?i=list` | List all ingredients | `/list.php?i=list` |

#### 🎯 Filtering

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /filter.php?i={ingredient}` | Filter by ingredient | `/filter.php?i=chicken_breast` |
| `GET /filter.php?c={category}` | Filter by category | `/filter.php?c=Seafood` |
| `GET /filter.php?a={area}` | Filter by area | `/filter.php?a=Italian` |

#### 🌟 Premium Features

| Endpoint | Description | Requirements |
|----------|-------------|--------------|
| `GET /randomselection.php` | Get 10 random meals | Premium Key |
| `GET /latest.php` | Get latest meals | Premium Key |
| `GET /filter.php?i=ing1,ing2` | Multi-ingredient filter | Premium Key |
| `POST /meals` | Add new recipe | Premium Key |
| `PUT /meals/{id}` | Update recipe | Premium Key |
| `DELETE /meals/{id}` | Delete recipe | Premium Key |

### Example Responses

#### Search Results
```json
{
  "meals": [
    {
      "idMeal": "52771",
      "strMeal": "Spicy Arrabiata Penne",
      "strCategory": "Vegetarian",
      "strArea": "Italian",
      "strInstructions": "Bring a large pot of water to a boil...",
      "strMealThumb": "/images/meals/52771.jpg",
      "strTags": "Pasta,Spicy,Vegetarian",
      "strYoutube": "https://www.youtube.com/watch?v=1IszT_guI08",
      "strIngredient1": "penne rigate",
      "strMeasure1": "1 pound",
      "strIngredient2": "olive oil",
      "strMeasure2": "1/4 cup"
    }
  ]
}
```

#### Categories
```json
{
  "categories": [
    {
      "idCategory": "1",
      "strCategory": "Beef",
      "strCategoryThumb": "/images/categories/beef.png",
      "strCategoryDescription": "Beef is the culinary name for meat from cattle..."
    }
  ]
}
```

## 🏗️ Architecture

The project follows object-oriented principles with clear separation of concerns:

### Directory Structure
```
FoodDB/
├── backend/
│   ├── managers/          # Business logic classes
│   │   ├── DatabaseManager.js
│   │   ├── RecipeManager.js
│   │   ├── ImageManager.js
│   │   └── CategoryManager.js
│   ├── models/            # Data models
│   │   └── Recipe.js
│   ├── routes/            # API route handlers
│   │   └── ApiRoutes.js
│   ├── middleware/        # Express middleware
│   │   ├── rateLimitMiddleware.js
│   │   └── errorHandler.js
│   ├── utils/             # Utility functions
│   │   └── sampleData.js
│   └── server.js          # Main server file
├── frontend/              # Web interface
│   └── public/
│       ├── index.html
│       ├── styles.css
│       └── script.js
├── data/                  # SQLite database
├── uploads/               # Image storage
└── package.json
```

### Key Classes

#### DatabaseManager
- Handles SQLite database connections
- Manages schema creation and migrations
- Provides generic query methods

#### RecipeManager  
- Contains all recipe-related business logic
- Handles CRUD operations for recipes
- Implements search and filtering logic

#### ImageManager
- Processes and manages recipe images
- Generates thumbnails in multiple sizes
- Handles file uploads and validation

#### CategoryManager
- Manages categories, areas, and ingredients
- Provides listing and statistics functionality

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration  
DB_PATH=./data/recipes.db

# API Configuration
API_VERSION=v1
API_TEST_KEY=1
API_PREMIUM_KEY=your_premium_key_here

# Image Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5000000
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🖼️ Image Handling

The API automatically processes uploaded images into multiple formats:

### Meal Images
- **Original**: Full-size image
- **Large**: 800x600px
- **Medium**: 400x400px  
- **Small**: 200x200px

### Image URLs
```
/images/meals/{mealId}.jpg          # Original/medium
/images/meals/{mealId}-small.jpg    # Small thumbnail
/images/meals/{mealId}-large.jpg    # Large image
```

### Ingredient Images
```
/images/ingredients/{ingredient}.png
/images/ingredients/{ingredient}-small.png
/images/ingredients/{ingredient}-medium.png
/images/ingredients/{ingredient}-large.png
```

## 🚦 Rate Limiting

- **Standard**: 100 requests per 15 minutes
- **Premium**: Unlimited (with valid premium key)
- **Uploads**: 10 uploads per 15 minutes

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing
Use the built-in web interface at http://localhost:3000 to test endpoints interactively.

### API Examples
```bash
# Get random meal
curl "http://localhost:3000/api/json/v1/1/random.php"

# Search for pasta recipes
curl "http://localhost:3000/api/json/v1/1/search.php?s=pasta"

# Filter by category
curl "http://localhost:3000/api/json/v1/1/filter.php?c=Vegetarian"
```

## 📱 Adding Recipes

### Via API (Premium Required)
```bash
curl -X POST "http://localhost:3000/api/v1/meals" \
  -H "x-api-key: YOUR_PREMIUM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "strMeal": "My Amazing Recipe",
    "strCategory": "Dessert",
    "strArea": "American",
    "strInstructions": "Mix ingredients and bake...",
    "strIngredient1": "flour",
    "strMeasure1": "2 cups"
  }'
```

### With Image Upload
```bash
curl -X POST "http://localhost:3000/api/v1/meals" \
  -H "x-api-key: YOUR_PREMIUM_KEY" \
  -F "image=@recipe-photo.jpg" \
  -F "strMeal=My Recipe" \
  -F "strCategory=Dessert"
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection  
- **Rate Limiting** - Prevents abuse
- **Input Validation** - Joi schema validation
- **File Upload Security** - Type and size validation
- **SQL Injection Protection** - Parameterized queries

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a proper database (PostgreSQL recommended for production)
3. Set up reverse proxy (nginx)
4. Enable HTTPS
5. Configure proper logging
6. Set up monitoring

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards (OOP, <500 lines per file)
4. Write tests for new features
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 📧 Support

- Email: contact@fooddb.com
- Documentation: Built-in web interface
- Issues: GitHub Issues

---

## 🤖 **NEW: AI-Powered Features**

### **✨ OpenAI Integration:**
- **GPT-4** recipe generation with custom parameters
- **DALL-E 3** professional food photography
- Batch recipe creation (generate 10+ recipes at once)
- Recipe ideas engine and improvement suggestions
- Secure admin panel for AI content management

### **🔐 Admin Panel:**
- **URL**: http://localhost:3000/admin-panel
- **Login**: admin / fooddb_admin_2024
- Full-featured web interface for AI recipe generation
- Dashboard with analytics and content management
- Batch generation templates and custom configurations

### **🎯 AI Capabilities:**
- Generate recipes by cuisine, category, ingredients
- Create seasonal and trending recipe collections  
- Automatic image generation for recipes
- Recipe improvement suggestions with AI
- Mass content creation for rapid database growth

**See [AI_ADMIN_GUIDE.md](./AI_ADMIN_GUIDE.md) for complete AI features documentation.**

---

Built with ❤️ using Node.js, Express, SQLite, and OpenAI. Following object-oriented principles and modern best practices.# Deployment trigger Thu Sep 18 01:34:41 EDT 2025
