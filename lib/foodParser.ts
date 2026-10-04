import { getFoodDatabase, FoodItem } from './data';

interface ParsedResult {
  items: FoodItem[];
  unmatched: string[];
}

export function parseNaturalFoodInput(input: string): ParsedResult {
  const db = getFoodDatabase();
  const lines = input
    .split(/[,;\n+]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const items: FoodItem[] = [];
  const unmatched: string[] = [];

  for (const line of lines) {
    // Regex for amounts: e.g. "200g", "200 g", "150 gram", "2 qua", "2 quả", "1 tô", "1 to", "1 bat", "1 bát"
    let amount_g = 100; // default 100g
    let cleanedName = line.toLowerCase();

    // Check special units
    const eggsMatch = cleanedName.match(/(\d+)\s*(?:quả|qua|trái)\s*(?:trứng|trung)?/);
    const toMatch = cleanedName.match(/(\d+)\s*(?:tô|to|bát|bat|suất|suat)/);
    const gramMatch = cleanedName.match(/(\d+)\s*(?:g|gram|gr)/);

    if (gramMatch) {
      amount_g = parseInt(gramMatch[1], 10);
      cleanedName = cleanedName.replace(/(\d+)\s*(?:g|gram|gr)/g, '').trim();
    } else if (eggsMatch) {
      const count = parseInt(eggsMatch[1], 10);
      amount_g = count * 55; // 1 quả trứng ~ 55g
      cleanedName = 'trứng gà';
    } else if (toMatch) {
      const count = parseInt(toMatch[1], 10);
      amount_g = count * 400; // 1 tô phở/bún ~ 400g
      cleanedName = cleanedName.replace(/(\d+)\s*(?:tô|to|bát|bat|suất|suat)/g, '').trim();
    } else {
      // Look for standalone leading/trailing numbers
      const numMatch = cleanedName.match(/^(\d+)\s+(.*)$/) || cleanedName.match(/^(.*)\s+(\d+)$/);
      if (numMatch) {
        if (!isNaN(Number(numMatch[1]))) {
          amount_g = parseInt(numMatch[1], 10);
          cleanedName = numMatch[2].trim();
        } else if (!isNaN(Number(numMatch[2]))) {
          amount_g = parseInt(numMatch[2], 10);
          cleanedName = numMatch[1].trim();
        }
      }
    }

    // Clean up filler words
    cleanedName = cleanedName
      .replace(/^(mình ăn|ăn|khoảng|tầm|hết|khoang|tam)\s+/i, '')
      .replace(/\s+(luộc|hấp|nướng|áp chảo|chiên|xào)$/i, '')
      .trim();

    // Search database
    let matchedEntry = db.find(entry => {
      const nameMatch = entry.name.toLowerCase().includes(cleanedName) || cleanedName.includes(entry.name.toLowerCase());
      const aliasMatch = entry.aliases.some(alias => cleanedName.includes(alias.toLowerCase()) || alias.toLowerCase().includes(cleanedName));
      return nameMatch || aliasMatch;
    });

    if (matchedEntry) {
      const factor = amount_g / 100;
      items.push({
        name: `${matchedEntry.name} (${amount_g}g)`,
        amount_g,
        calories: Math.round(matchedEntry.per_100g.calories * factor),
        protein_g: Math.round(matchedEntry.per_100g.protein_g * factor * 10) / 10,
        carbs_g: Math.round(matchedEntry.per_100g.carbs_g * factor * 10) / 10,
        fat_g: Math.round(matchedEntry.per_100g.fat_g * factor * 10) / 10,
      });
    } else {
      // Fallback: make best educated estimate based on average mixed meal (150 kcal/100g, 8g P, 15g C, 5g F)
      const factor = amount_g / 100;
      items.push({
        name: `${line.trim()} (~${amount_g}g ước tính)`,
        amount_g,
        calories: Math.round(150 * factor),
        protein_g: Math.round(8 * factor * 10) / 10,
        carbs_g: Math.round(15 * factor * 10) / 10,
        fat_g: Math.round(5 * factor * 10) / 10,
      });
      unmatched.push(line);
    }
  }

  return { items, unmatched };
}
