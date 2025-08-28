# 🗄️ Database Setup Guide - Persistent Storage

Your FoodDB API now supports **persistent database storage** using PostgreSQL (via Supabase) for production and SQLite for local development.

## 🎯 **Why You Need This**

Currently your database is **temporary** (in-memory) and loses all data when the serverless function restarts. With persistent storage:

✅ **Data persists** between deployments
✅ **Real API performance** - no re-seeding delays  
✅ **Scalable** - handle thousands of recipes
✅ **Production-ready** - like a real API service

---

## 🚀 **Option 1: Supabase (Recommended)**

**Free Tier**: 500MB storage + 2 million API calls/month

### **Step 1: Create Supabase Account**
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (recommended)
3. Click **"New Project"**

### **Step 2: Create Project**
1. **Organization**: Choose or create one
2. **Project Name**: `fooddb-api` 
3. **Database Password**: Generate a strong password (save it!)
4. **Region**: Choose closest to your users
5. Click **"Create new project"**

### **Step 3: Get Database URL**
1. After project creation, go to **Settings** → **Database**
2. Scroll to **"Connection string"**
3. Select **"URI"** format
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijk.supabase.co:5432/postgres
   ```

### **Step 4: Add to Vercel**
1. Go to your **Vercel dashboard**
2. Open your **themealdb project** 
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string
   - **Environments**: Production, Preview, Development (all three)
5. Click **"Save"**

### **Step 5: Deploy**
Your next deployment will automatically:
- ✅ Use PostgreSQL instead of in-memory database
- ✅ Create all necessary tables
- ✅ Seed initial data (categories, areas)
- ✅ Store recipes permanently

---

## 🎯 **Option 2: PlanetScale (Alternative)**

**Free Tier**: 1 database, 1 billion row reads/month

### **Setup PlanetScale**:
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up and create database
3. Get connection string from dashboard
4. Add `DATABASE_URL` to Vercel environment variables

---

## 🎯 **Option 3: Neon (Alternative)**

**Free Tier**: 3 projects, 0.5 GB storage each

### **Setup Neon**:
1. Go to [neon.tech](https://neon.tech)
2. Sign up and create database
3. Get connection string
4. Add `DATABASE_URL` to Vercel environment variables

---

## 🔧 **How It Works**

Your database manager automatically detects the environment:

```javascript
// Production with DATABASE_URL → PostgreSQL (persistent)
if (process.env.DATABASE_URL) {
  console.log('🐘 Using PostgreSQL database (persistent storage)');
  return new PostgresDatabaseManager();
}

// Local development → SQLite (file-based)
// Serverless without DATABASE_URL → SQLite (in-memory)
```

---

## 📊 **Database Schema**

Your database will have these tables:

### **recipes** - Main recipe data
- `idMeal` (Primary Key)
- `strMeal` (Recipe name)
- `strCategory`, `strArea` (Classification)
- `strInstructions` (Cooking steps)
- `strMealThumb` (Image URL)
- `strIngredient1-20`, `strMeasure1-20` (Ingredients)
- `dateModified` (Timestamp)

### **categories** - Recipe categories
- `idCategory`, `strCategory`, `strCategoryDescription`

### **areas** - Cuisine regions  
- `idArea`, `strArea`

### **ingredients** - Ingredient reference
- `idIngredient`, `strIngredient`, `strDescription`

---

## ✅ **Verification Steps**

After setting up DATABASE_URL:

1. **Check Vercel logs**:
   - Go to Vercel project → Functions → View logs
   - Look for: `🐘 Using PostgreSQL database (persistent storage)`

2. **Test API endpoints**:
   - `GET /recipes` - Should return seeded data
   - Generate recipes via admin panel - Should persist

3. **Check Supabase dashboard**:
   - Go to Table Editor
   - You should see `recipes`, `categories`, `areas`, `ingredients` tables
   - Data should be visible and persist between deployments

---

## 🎉 **Benefits of Persistent Database**

- ✅ **Real API performance** - no startup delays
- ✅ **Data accumulation** - build a comprehensive recipe database
- ✅ **User experience** - consistent data across visits
- ✅ **AI recipe generation** - all generated recipes are saved
- ✅ **Scalability** - handle production traffic
- ✅ **Analytics** - track recipe popularity, usage patterns

---

## 🆘 **Troubleshooting**

### **"Database connection failed"**
- Check your `DATABASE_URL` format
- Ensure Supabase project is running
- Verify password in connection string

### **"SSL required"**
- Make sure `ssl: { rejectUnauthorized: false }` is set (already configured)

### **"Permission denied"**
- Check Supabase database settings
- Ensure connection string includes correct credentials

### **Still using in-memory database**
- Verify `DATABASE_URL` is set in Vercel environment variables
- Check Vercel function logs for database connection messages
- Redeploy after adding environment variables

---

**🚀 Ready to set up persistent storage? Start with Supabase - it's the easiest option and perfect for your FoodDB API!**