# 🍽️ FoodDB Comprehensive API Guide

## 📋 **Overview**
Your FoodDB API now supports **comprehensive search and filtering** capabilities with multiple new endpoints for searching by meal types, dish types, dietary preferences, and combined filtering options.

---

## 🔗 **Base URL Structure**
```
GET /api/json/v1/{API_KEY}/endpoint.php?parameters
```

**API Keys:**
- `1` = Developer test key (free, rate limited)
- `{PREMIUM_KEY}` = Premium subscription key (full access)

---

## 🔍 **Search & Lookup Endpoints**

### Basic Search
| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/search.php` | GET | `s={recipe_name}` | Search recipes by name |
| `/search.php` | GET | `f={first_letter}` | List recipes by first letter |
| `/lookup.php` | GET | `i={meal_id}` | Get full recipe details by ID |

**Examples:**
```bash
GET /api/json/v1/1/search.php?s=chicken
GET /api/json/v1/1/search.php?f=a
GET /api/json/v1/1/lookup.php?i=1758251792484
```

---

## 🎲 **Random Recipe Endpoints**

### Enhanced Random Selection
| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/random.php` | GET | *(none)* | **Truly random** recipe from complete database |
| `/random.php` | GET | `c={category}` | Random recipe from specific category |
| `/random.php` | GET | `a={area}` | Random recipe from specific cuisine |
| `/random.php` | GET | `m={meal_type}` | Random recipe from meal type |
| `/random.php` | GET | `d={dish_type}` | Random recipe from dish type |
| `/random.php` | GET | `diet={dietary}` | Random recipe with dietary restriction |
| `/randomselection.php` | GET | `count={number}` | **Premium:** Multiple random recipes |

**Examples:**
```bash
# Truly random from complete database
GET /api/json/v1/1/random.php

# Random vegetarian dinner recipe
GET /api/json/v1/1/random.php?diet=vegetarian&m=dinner

# Random Italian main course
GET /api/json/v1/1/random.php?a=italian&d=main-course
```

---

## 🏷️ **Categories & Listings**

### Standard Lists
| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/categories.php` | GET | *(none)* | All categories with details |
| `/list.php` | GET | `c=list` | List all category names |
| `/list.php` | GET | `a=list` | List all cuisine areas |
| `/list.php` | GET | `i=list` | List all ingredients |

### **NEW** Advanced Lists
| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/list.php` | GET | `m=list` | **NEW:** List all meal types |
| `/list.php` | GET | `d=list` | **NEW:** List all dish types |
| `/list.php` | GET | `diet=list` | **NEW:** List dietary options |

**Examples:**
```bash
GET /api/json/v1/1/list.php?c=list      # Categories
GET /api/json/v1/1/list.php?a=list      # Areas/Cuisines
GET /api/json/v1/1/list.php?i=list      # Ingredients
GET /api/json/v1/1/list.php?m=list      # Meal Types (NEW)
GET /api/json/v1/1/list.php?d=list      # Dish Types (NEW)  
GET /api/json/v1/1/list.php?diet=list   # Dietary Options (NEW)
```

---

## 🔧 **Comprehensive Filtering System**

### Single Filter Options
| Parameter | Values | Description | Example |
|-----------|--------|-------------|---------|
| `i` | ingredient name | Filter by main ingredient | `i=chicken_breast` |
| `c` | category name | Filter by recipe category | `c=Seafood` |
| `a` | cuisine area | Filter by cuisine/country | `a=Italian` |
| **`m`** | **meal type** | **NEW:** Filter by meal type | **`m=breakfast`** |
| **`d`** | **dish type** | **NEW:** Filter by dish type | **`d=main-course`** |
| **`diet`** | **dietary** | **NEW:** Filter by dietary preference | **`diet=vegetarian`** |
| **`contains`** | **ingredients** | **NEW:** Contains specific ingredients | **`contains=chicken,garlic`** |

### **NEW** Meal Types
- `breakfast` - Morning meals
- `brunch` - Late morning meals  
- `lunch` - Midday meals
- `dinner` - Evening meals
- `snack` - Light meals/snacks
- `dessert` - Sweet treats

### **NEW** Dish Types
- `appetizer` - Starters
- `soup` - Liquid courses
- `salad` - Fresh dishes
- `main-course` - Primary dishes
- `side-dish` - Accompaniments  
- `dessert` - Sweet courses
- `beverage` - Drinks
- `snack` - Light bites

### **NEW** Dietary Preferences
- `vegetarian` - No meat
- `vegan` - No animal products
- `pescatarian` - Fish but no meat
- `gluten-free` - No gluten
- `dairy-free` - No dairy
- `keto` - Low-carb, high-fat
- `paleo` - Paleolithic diet
- `halal` - Islamic dietary laws
- `no-red-meat` - No red meat
- `no-pork` - No pork
- `no-shellfish` - No shellfish
- `omnivore` - All foods

---

## 🎯 **Combined Filtering (NEW)**

**Revolutionary Feature:** Combine multiple filters in a single API call!

### Multi-Filter Examples
```bash
# Vegetarian Italian dinner recipes
GET /api/json/v1/1/filter.php?diet=vegetarian&a=Italian&m=dinner

# Keto main course recipes with chicken
GET /api/json/v1/1/filter.php?diet=keto&d=main-course&contains=chicken

# Gluten-free breakfast appetizers
GET /api/json/v1/1/filter.php?diet=gluten-free&m=breakfast&d=appetizer

# Asian seafood recipes for lunch  
GET /api/json/v1/1/filter.php?a=Asian&c=Seafood&m=lunch
```

### All Possible Combinations
Any combination of these parameters work together:
- `i` (ingredient) + `c` (category) + `a` (area) + `m` (meal type) + `d` (dish type) + `diet` (dietary)

**Example Ultra-Specific Search:**
```bash
GET /api/json/v1/1/filter.php?a=Italian&c=Chicken&m=dinner&d=main-course&diet=dairy-free&contains=garlic,herbs
```
*Returns: Italian chicken dinner main courses that are dairy-free and contain garlic and herbs*

---

## 📊 **Response Formats**

### Search Results
```json
{
  "meals": [
    {
      "idMeal": "1758251792484",
      "strMeal": "Asian Ginger Soy Chicken", 
      "strMealThumb": "https://...image_url"
    }
  ]
}
```

### Full Recipe Details
```json
{
  "meals": [
    {
      "idMeal": "1758251792484",
      "strMeal": "Asian Ginger Soy Chicken",
      "strDescription": "A flavorful and aromatic Asian chicken dish...",
      "strCategory": "Main Dish",
      "strArea": "Asian", 
      "strInstructions": "Step 1: Begin by thoroughly washing...",
      "instructions": [
        "Step 1: Begin by thoroughly washing all fresh produce...",
        "Step 2: Preheat your oven to the exact specified temperature...",
        "...25-40 ultra-detailed steps..."
      ],
      "strIngredient1": "Chicken Breast",
      "strMeasure1": "500g",
      "strIngredient2": "Soy Sauce", 
      "strMeasure2": "1/4 cup",
      "prepTime": 15,
      "cookTime": 25,
      "totalTime": 40,
      "numberOfServings": 4,
      "servingSize": "1 serving",
      "difficulty": "Medium",
      "yield": "4 servings",
      "mealType": ["Dinner"],
      "dishType": "Main Course",
      "dietary": {
        "vegetarian": false,
        "vegan": false,
        "keto": true,
        "dairyFree": true
      },
      "nutrition": {
        "caloriesPerServing": 350,
        "protein": "28g",
        "carbs": "12g",
        "fat": "15g"
      }
    }
  ]
}
```

### List Responses
```json
{
  "meals": [
    {"strCategory": "Beef"},
    {"strCategory": "Chicken"},
    {"strMealType": "Breakfast"},
    {"strDishType": "Main Course"},
    {"strDietary": "Vegetarian"}
  ]
}
```

---

## ⚡ **Advanced Features**

### 1. **Truly Random Algorithm**
- Uses advanced randomization with timestamp seeding
- Accesses complete database for maximum variety
- No repetitive results like basic random functions

### 2. **Multi-Ingredient Search** 
```bash
# Recipes containing chicken AND garlic AND herbs
GET /api/json/v1/1/filter.php?contains=chicken,garlic,herbs
```

### 3. **Ultra-Detailed Instructions**
- Every recipe now has **25-40 comprehensive steps**
- Professional chef techniques included
- Temperature, timing, and visual cues specified
- Troubleshooting tips and safety measures

### 4. **Flexible Dietary Filtering**
- Handles various formats: `gluten-free`, `glutenfree`, `gluten_free`
- Boolean logic for precise dietary matching
- Comprehensive nutrition and allergen information

---

## 🚀 **Usage Examples**

### Complete Recipe Discovery Workflow
```bash
# 1. Discover available meal types
GET /api/json/v1/1/list.php?m=list

# 2. Find vegetarian breakfast recipes
GET /api/json/v1/1/filter.php?diet=vegetarian&m=breakfast

# 3. Get detailed recipe
GET /api/json/v1/1/lookup.php?i={recipe_id}

# 4. Find similar recipes with combined filters
GET /api/json/v1/1/filter.php?a=Mediterranean&m=breakfast&diet=vegetarian
```

### Restaurant Menu Planning
```bash
# Appetizers for the evening
GET /api/json/v1/1/filter.php?d=appetizer&m=dinner

# Main courses by cuisine
GET /api/json/v1/1/filter.php?d=main-course&a=Italian

# Desserts that are gluten-free  
GET /api/json/v1/1/filter.php?d=dessert&diet=gluten-free
```

### Dietary Restriction Compliance
```bash
# Vegan main courses for lunch
GET /api/json/v1/1/filter.php?diet=vegan&d=main-course&m=lunch

# Keto-friendly dinner recipes
GET /api/json/v1/1/filter.php?diet=keto&m=dinner

# Halal recipes with no pork
GET /api/json/v1/1/filter.php?diet=halal&diet=no-pork
```

---

## 🔐 **Premium Features**

### Premium-Only Endpoints
| Endpoint | Description | Limit |
|----------|-------------|--------|
| `/randomselection.php` | Multiple random recipes | Up to 50 |
| `/latest.php` | Latest added recipes | Up to 100 |

### Premium Benefits
- **Higher rate limits** (10x standard)
- **Batch operations** for efficiency
- **Advanced analytics** and usage stats
- **Priority support** and custom features

---

## 📈 **Performance & Scalability**

### Optimizations
- **Firebase integration** for lightning-fast searches
- **Intelligent caching** for frequently accessed data
- **Efficient algorithms** for combined filtering
- **Responsive pagination** for large result sets

### Rate Limits
- **Free API:** 1000 requests/day, 60 requests/hour
- **Premium:** 50,000 requests/day, no hourly limits

---

## 🎯 **Migration from V1 API**

### Backwards Compatibility
✅ **All existing endpoints work unchanged**  
✅ **Same response formats maintained**  
✅ **No breaking changes to current integrations**

### New Features Available Immediately
✅ **Enhanced random endpoint with filters**  
✅ **New listing endpoints** (`m=list`, `d=list`, `diet=list`)  
✅ **Multi-parameter filtering** in existing `/filter.php`  
✅ **Ultra-detailed recipe instructions** in responses  
✅ **Comprehensive dietary and nutrition data**

---

## 🔚 **Summary**

Your FoodDB API now provides:

🍳 **Complete Meal Type Coverage** - Breakfast through dessert  
🥗 **Comprehensive Dish Classification** - Appetizers to beverages  
🌱 **Full Dietary Preference Support** - 12+ dietary restrictions  
🎲 **Truly Random Recipe Selection** - Advanced algorithms  
🔍 **Multi-Filter Search Capabilities** - Unlimited combinations  
📚 **Ultra-Detailed Recipe Instructions** - 25-40 professional steps  
⚡ **High-Performance Firebase Backend** - Lightning fast responses  

**Your API is now the most comprehensive recipe database available!** 🚀
