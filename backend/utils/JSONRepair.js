/**
 * JSONRepair - Fixes common JSON errors from AI responses
 * 
 * Handles:
 * - Trailing commas in arrays and objects
 * - Missing closing brackets
 * - Extra text before/after JSON
 * - Comments in JSON
 * - Single quotes instead of double quotes
 */

class JSONRepair {
  /**
   * Attempt to repair and parse malformed JSON
   */
  static repair(jsonString) {
    console.log('\n🔧 ═══════════════════════════════════════════');
    console.log('🔧 JSON REPAIR ATTEMPT');
    console.log('═══════════════════════════════════════════');
    console.log(`📏 Original length: ${jsonString.length} characters`);

    // Step 1: Remove everything before first { or [
    let cleaned = jsonString.replace(/^[^{[\n]*/, '').trim();
    console.log('✅ Step 1: Removed leading text');

    // Step 2: Remove everything after last } or ]
    cleaned = cleaned.replace(/[^}\]]*$/, '').trim();
    console.log('✅ Step 2: Removed trailing text');

    // Step 3: Remove comments (// and /* */)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\/\/.*/g, '');
    console.log('✅ Step 3: Removed comments');

    // Step 4: Fix trailing commas in arrays and objects
    // This is the most common AI error
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    console.log('✅ Step 4: Removed trailing commas');

    // Step 5: Replace single quotes with double quotes (except in strings)
    // Only do this if there are unescaped single quotes
    if (cleaned.includes("'") && !cleaned.includes('"')) {
      cleaned = cleaned.replace(/'/g, '"');
      console.log('✅ Step 5: Converted single quotes to double quotes');
    }

    // Step 6: Fix common typos
    cleaned = cleaned.replace(/True/g, 'true');
    cleaned = cleaned.replace(/False/g, 'false');
    cleaned = cleaned.replace(/None/g, 'null');
    cleaned = cleaned.replace(/Null/g, 'null');
    console.log('✅ Step 6: Fixed common typos (True/False/None)');

    // ✅ NEW Step 6.5: Fix unescaped control characters that cause "unexpected token" errors
    cleaned = cleaned.replace(/[\u0000-\u001F]+/g, ' ');
    console.log('✅ Step 6.5: Removed control characters');

    // ✅ NEW Step 6.6: Remove duplicate commas
    cleaned = cleaned.replace(/,+/g, ',');
    console.log('✅ Step 6.6: Removed duplicate commas');

    // ✅ NEW Step 6.7: Fix missing commas between objects/arrays
    cleaned = cleaned.replace(/}\s*{/g, '},{');
    cleaned = cleaned.replace(/]\s*\[/g, '],[');
    console.log('✅ Step 6.7: Fixed missing commas');

    // Step 7: Try to balance brackets
    const balanced = this.balanceBrackets(cleaned);
    console.log(`✅ Step 7: Balanced brackets (${balanced !== cleaned ? 'modified' : 'no change'})`);

    console.log(`📏 Repaired length: ${balanced.length} characters`);
    console.log('═══════════════════════════════════════════\n');

    return balanced;
  }

  /**
   * Balance opening and closing brackets
   */
  static balanceBrackets(str) {
    const stack = [];
    let inString = false;
    let escapeNext = false;

    // Count brackets
    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ']') {
        if (stack.length > 0) {
          stack.pop();
        }
      }
    }

    // Add missing closing brackets
    let result = str;
    while (stack.length > 0) {
      const opening = stack.pop();
      const closing = opening === '{' ? '}' : ']';
      result += closing;
      console.log(`  🔧 Added missing closing bracket: ${closing}`);
    }

    return result;
  }

  /**
   * Parse with multiple repair strategies
   */
  static parseWithRepair(jsonString, attempts = 3) {
    console.log('\n📦 ═══════════════════════════════════════════');
    console.log('📦 SMART JSON PARSING');
    console.log('═══════════════════════════════════════════\n');

    // Attempt 1: Try parsing as-is
    try {
      console.log('🔄 Attempt 1: Parse without repair');
      const parsed = JSON.parse(jsonString);
      console.log('✅ SUCCESS: JSON was already valid!\n');
      return { success: true, data: parsed, repairs: 0 };
    } catch (error1) {
      console.log(`❌ Attempt 1 failed: ${error1.message}`);
    }

    // Attempt 2: Basic repair
    try {
      console.log('\n🔄 Attempt 2: Parse with basic repair');
      const repaired = this.repair(jsonString);
      const parsed = JSON.parse(repaired);
      console.log('✅ SUCCESS: Basic repair worked!\n');
      return { success: true, data: parsed, repairs: 1 };
    } catch (error2) {
      console.log(`❌ Attempt 2 failed: ${error2.message}`);
    }

    // Attempt 3: Aggressive repair (fix truncated JSON)
    try {
      console.log('\n🔄 Attempt 3: Parse with aggressive repair');
      const repaired = this.repair(jsonString);
      const completed = this.completeTruncatedJSON(repaired);
      const parsed = JSON.parse(completed);
      console.log('✅ SUCCESS: Aggressive repair worked!\n');
      return { success: true, data: parsed, repairs: 2 };
    } catch (error3) {
      console.log(`❌ Attempt 3 failed: ${error3.message}`);
    }

    // Attempt 4: Extract partial data
    try {
      console.log('\n🔄 Attempt 4: Extract partial data');
      const partial = this.extractPartialData(jsonString);
      console.log('⚠️ PARTIAL SUCCESS: Extracted what we could\n');
      return { success: false, data: partial, repairs: 3, partial: true };
    } catch (error4) {
      console.log(`❌ Attempt 4 failed: ${error4.message}`);
    }

    console.log('❌ ALL PARSING ATTEMPTS FAILED\n');
    return { success: false, data: null, repairs: -1, error: 'All repair attempts failed' };
  }

  /**
   * Complete truncated JSON by closing open objects/arrays
   */
  static completeTruncatedJSON(jsonString) {
    // Find the last complete key-value pair
    const lines = jsonString.split('\n');
    let validJSON = '';
    let braceCount = 0;
    let bracketCount = 0;

    for (const line of lines) {
      validJSON += line + '\n';

      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }

    // Close any open structures
    while (bracketCount > 0) {
      validJSON += ']';
      bracketCount--;
    }
    while (braceCount > 0) {
      validJSON += '}';
      braceCount--;
    }

    return validJSON;
  }

  /**
   * Extract whatever data we can from malformed JSON
   */
  static extractPartialData(jsonString) {
    console.log('🔍 Attempting to extract partial data...');
    
    const extracted = {};

    // Extract string fields using regex
    const stringFields = [
      'strMeal', 'strCategory', 'strArea', 'strDescription',
      'strInstructions', 'strMealThumb', 'strTags', 'strYoutube',
      'strSource', 'mainIngredient', 'dishType', 'servingSize',
      'yield', 'difficulty', 'timeCategory'
    ];

    for (const field of stringFields) {
      const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
      const match = jsonString.match(regex);
      if (match && match[1]) {
        extracted[field] = match[1];
        console.log(`  ✅ Extracted ${field}: ${match[1].substring(0, 50)}...`);
      }
    }

    // Extract numeric fields
    const numericFields = [
      'prepTime', 'cookTime', 'totalTime', 'numberOfServings'
    ];

    for (const field of numericFields) {
      const regex = new RegExp(`"${field}"\\s*:\\s*(\\d+)`, 'i');
      const match = jsonString.match(regex);
      if (match && match[1]) {
        extracted[field] = parseInt(match[1]);
        console.log(`  ✅ Extracted ${field}: ${match[1]}`);
      }
    }

    // Extract ingredients array
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredientRegex = new RegExp(`"strIngredient${i}"\\s*:\\s*"([^"]*)"`, 'i');
      const measureRegex = new RegExp(`"strMeasure${i}"\\s*:\\s*"([^"]*)"`, 'i');
      
      const ingMatch = jsonString.match(ingredientRegex);
      const measMatch = jsonString.match(measureRegex);
      
      if (ingMatch && ingMatch[1] && ingMatch[1].trim()) {
        extracted[`strIngredient${i}`] = ingMatch[1];
        extracted[`strMeasure${i}`] = measMatch && measMatch[1] ? measMatch[1] : '';
        ingredients.push(ingMatch[1]);
      }
    }

    if (ingredients.length > 0) {
      console.log(`  ✅ Extracted ${ingredients.length} ingredients`);
    }

    // Extract instructions array if present
    const instructionsMatch = jsonString.match(/"instructions"\s*:\s*\[([\s\S]*?)\]/);
    if (instructionsMatch) {
      try {
        const instructionsArray = JSON.parse('[' + instructionsMatch[1] + ']');
        extracted.instructions = instructionsArray;
        console.log(`  ✅ Extracted ${instructionsArray.length} instruction steps`);
      } catch (e) {
        // Try to extract individual steps
        const steps = instructionsMatch[1].match(/"([^"]+)"/g);
        if (steps) {
          extracted.instructions = steps.map(s => s.replace(/"/g, ''));
          console.log(`  ✅ Extracted ${steps.length} instruction steps (manual)`);
        }
      }
    }

    console.log(`  📊 Total fields extracted: ${Object.keys(extracted).length}`);
    return extracted;
  }
}

module.exports = JSONRepair;
