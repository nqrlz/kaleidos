export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-profile-id',
};

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 500): Response {
  return corsResponse({ error: message }, status);
}

interface ClaudeItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ClaudeCalorieResult {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  items: ClaudeItem[];
}

async function estimateCalories(
  description: string,
  apiKey: string,
  imageBase64?: string,
  mediaType?: string,
): Promise<ClaudeCalorieResult> {
  const prompt = `You are a nutritionist assistant. Estimate the calories and macronutrients, return ONLY valid JSON with no additional text.

IMPORTANT: If the user explicitly states specific calorie or macro values (e.g. "117 kcal", "30g Kohlenhydrate", "25g Protein"), use those EXACT values. Do not override explicitly stated nutritional data.

Return this exact JSON structure:
{
  "totalCalories": <number>,
  "totalProtein": <grams as number>,
  "totalCarbs": <grams as number>,
  "totalFat": <grams as number>,
  "items": [
    {"name": "<item name>", "calories": <number>, "protein": <grams>, "carbs": <grams>, "fat": <grams>},
    ...
  ]
}

Be realistic with estimates. Return only the JSON object, nothing else.`;

  const userContent = imageBase64 && mediaType
    ? [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        { type: 'text', text: `Analyze this food photo and estimate the calories for each visible item.\n\n${prompt}` },
      ]
    : `Given this meal description: "${description}"\n\n${prompt}`;

  const body = JSON.stringify({
    model: imageBase64 ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userContent }],
  });

  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, Math.min(attempt * 3000, 12000)));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isOverloaded = response.status === 529 || response.status === 503 ||
        errorText.includes('overloaded_error');
      if (isOverloaded) {
        lastError = `status ${response.status} (attempt ${attempt + 1}/5)`;
        continue;
      }
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content[0].text.trim();
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    return JSON.parse(jsonText) as ClaudeCalorieResult;
  }

  throw new Error(`Claude API ist momentan überlastet. Bitte in 30 Sekunden erneut versuchen. (${lastError})`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const profileId = request.headers.get('x-profile-id');
    if (!profileId) {
      return errorResponse('x-profile-id header is required', 400);
    }

    try {
      // GET /api/settings
      if (method === 'GET' && path === '/api/settings') {
        const result = await env.DB.prepare(
          'SELECT * FROM settings WHERE profile_id = ?'
        ).bind(profileId).first();

        if (!result) {
          await env.DB.prepare(
            'INSERT INTO settings (profile_id, daily_calories, deficit, protein_goal) VALUES (?, 2000, 500, 150)'
          ).bind(profileId).run();
          return corsResponse({ profile_id: profileId, daily_calories: 2000, deficit: 500, protein_goal: 150 });
        }

        return corsResponse(result);
      }

      // PUT /api/settings
      if (method === 'PUT' && path === '/api/settings') {
        const body = await request.json() as {
          daily_calories?: number;
          deficit?: number;
          protein_goal?: number;
        };

        if (body.daily_calories === undefined || body.deficit === undefined) {
          return errorResponse('daily_calories and deficit are required', 400);
        }

        const proteinGoal = body.protein_goal ?? 150;

        await env.DB.prepare(
          'INSERT INTO settings (profile_id, daily_calories, deficit, protein_goal) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id) DO UPDATE SET daily_calories = excluded.daily_calories, deficit = excluded.deficit, protein_goal = excluded.protein_goal'
        ).bind(profileId, body.daily_calories, body.deficit, proteinGoal).run();

        return corsResponse({ profile_id: profileId, daily_calories: body.daily_calories, deficit: body.deficit, protein_goal: proteinGoal });
      }

      // POST /api/meals
      if (method === 'POST' && path === '/api/meals') {
        const body = await request.json() as {
          date?: string;
          description?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          imageBase64?: string;
          mediaType?: string;
        };

        if (!body.date || !body.description) {
          return errorResponse('date and description are required', 400);
        }

        let calorieResult: ClaudeCalorieResult;

        if (typeof body.calories === 'number') {
          calorieResult = { totalCalories: body.calories, totalProtein: body.protein ?? 0, totalCarbs: body.carbs ?? 0, totalFat: body.fat ?? 0, items: [] };
        } else {
          if (!env.ANTHROPIC_API_KEY) {
            return errorResponse('ANTHROPIC_API_KEY not configured. Please set it in wrangler.toml', 500);
          }
          try {
            calorieResult = await estimateCalories(body.description, env.ANTHROPIC_API_KEY, body.imageBase64, body.mediaType);
          } catch (err) {
            return errorResponse(
              `Failed to estimate calories: ${err instanceof Error ? err.message : String(err)}`, 500
            );
          }
        }

        const itemsJson = JSON.stringify(calorieResult.items);
        // For image-based entries, use the first detected item as description
        const finalDescription = body.imageBase64 && calorieResult.items.length > 0
          ? calorieResult.items.map(i => i.name).join(', ')
          : body.description;

        const insertResult = await env.DB.prepare(
          `INSERT INTO meals (profile_id, date, description, calories, protein, carbs, fat, items, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           RETURNING *`
        ).bind(
          profileId, body.date, finalDescription,
          calorieResult.totalCalories, calorieResult.totalProtein, calorieResult.totalCarbs, calorieResult.totalFat,
          itemsJson
        ).first();

        if (!insertResult) {
          return errorResponse('Failed to insert meal', 500);
        }

        return corsResponse({ ...insertResult, items: calorieResult.items }, 201);
      }

      // GET /api/meals
      if (method === 'GET' && path === '/api/meals') {
        const date = url.searchParams.get('date');
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let results: D1Result<Record<string, unknown>>;

        if (date) {
          results = await env.DB.prepare(
            'SELECT * FROM meals WHERE profile_id = ? AND date = ? ORDER BY created_at ASC'
          ).bind(profileId, date).all();
        } else if (start && end) {
          results = await env.DB.prepare(
            'SELECT * FROM meals WHERE profile_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, created_at ASC'
          ).bind(profileId, start, end).all();
        } else {
          return errorResponse('Either date or start+end parameters are required', 400);
        }

        const meals = results.results.map((meal) => ({
          ...meal,
          items: JSON.parse(meal.items as string) as ClaudeItem[],
        }));

        return corsResponse(meals);
      }

      // PUT /api/meals/:id
      const putMatch = path.match(/^\/api\/meals\/(\d+)$/);
      if (method === 'PUT' && putMatch) {
        const id = parseInt(putMatch[1], 10);
        const body = await request.json() as {
          description?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        };

        const existing = await env.DB.prepare(
          'SELECT id FROM meals WHERE id = ? AND profile_id = ?'
        ).bind(id, profileId).first();

        if (!existing) return errorResponse('Meal not found', 404);

        const result = await env.DB.prepare(
          `UPDATE meals SET description = COALESCE(?, description), calories = COALESCE(?, calories),
           protein = COALESCE(?, protein), carbs = COALESCE(?, carbs), fat = COALESCE(?, fat)
           WHERE id = ? AND profile_id = ? RETURNING *`
        ).bind(body.description ?? null, body.calories ?? null, body.protein ?? null, body.carbs ?? null, body.fat ?? null, id, profileId).first();

        if (!result) return errorResponse('Failed to update meal', 500);

        return corsResponse({ ...result, items: JSON.parse(result.items as string) });
      }

      // DELETE /api/meals/:id
      const deleteMatch = path.match(/^\/api\/meals\/(\d+)$/);
      if (method === 'DELETE' && deleteMatch) {
        const id = parseInt(deleteMatch[1], 10);

        const existing = await env.DB.prepare(
          'SELECT id FROM meals WHERE id = ? AND profile_id = ?'
        ).bind(id, profileId).first();

        if (!existing) {
          return errorResponse('Meal not found', 404);
        }

        await env.DB.prepare('DELETE FROM meals WHERE id = ? AND profile_id = ?').bind(id, profileId).run();

        return corsResponse({ success: true, id });
      }

      return errorResponse('Not found', 404);
    } catch (err) {
      console.error('Worker error:', err);
      return errorResponse(
        `Internal server error: ${err instanceof Error ? err.message : String(err)}`,
        500
      );
    }
  },
};
