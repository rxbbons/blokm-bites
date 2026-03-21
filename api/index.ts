import express from "express";
import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Setup
let uri = process.env.MONGODB_URI || "";
// Sanitize URI (remove quotes and whitespace)
uri = uri.trim().replace(/^["']|["']$/g, '');

const dbName = process.env.MONGODB_DB_NAME || "blokm_bites";
const collectionName = process.env.MONGODB_COLLECTION || "tenants";

let dbClient: MongoClient | null = null;

async function getDb() {
  try {
    if (!uri) {
      console.error("MONGODB_URI is not defined in environment variables.");
      throw new Error("MONGODB_URI is missing. Please add it to your Vercel Environment Variables.");
    }

    if (!dbClient) {
      dbClient = new MongoClient(uri, {
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
      });
      await dbClient.connect();
      console.log("Successfully connected to MongoDB");
    } else {
      // Check if connection is still alive
      try {
        await dbClient.db(dbName).command({ ping: 1 });
      } catch (e) {
        console.warn("MongoDB connection lost, attempting to reconnect...");
        dbClient = new MongoClient(uri);
        await dbClient.connect();
      }
    }
    return dbClient.db(dbName);
  } catch (error: any) {
    console.error("MongoDB Connection Error Details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      codeName: error.codeName
    });
    
    if (error.message.includes("authentication failed") || error.code === 18) {
      throw new Error("MONGODB_AUTH_FAILED: Username or password in MONGODB_URI is incorrect. Please check your credentials in Settings > Secrets.");
    }
    
    dbClient = null; // Reset client on failure
    throw error;
  }
}

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    config: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      dbName: dbName,
      collection: collectionName
    }
  });
});

// Test Gemini Connection
app.get("/api/test-gemini", async (req, res) => {
  try {
    const ai = getGemini();
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: "Hello, are you working?",
    });
    
    res.json({ 
      status: "success", 
      response: result.text
    });
  } catch (error: any) {
    console.error("Gemini Test Error:", error);
    res.status(500).json({ 
      status: "error", 
      message: error.message,
      details: error.stack
    });
  }
});

// Gemini Setup
const getGemini = () => {
  // Priority check for the new custom secret to bypass stuck platform keys
  let apiKey = process.env.KUNCI_GEMINI_BARU || process.env.GEMINI_API_KEY || "";
  
  // Sanitize key (remove quotes and whitespace)
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    console.error("GEMINI_API_KEY is missing or using placeholder");
    throw new Error("API Key Gemini tidak ditemukan. Silakan tambahkan 'KUNCI_GEMINI_BARU' di Settings > Secrets.");
  }
  
  return new GoogleGenAI({ apiKey });
};

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, tenants, location } = req.body;
    const ai = getGemini();
    
    const tenantContext = (tenants && tenants.length > 0)
      ? `\n\n**VERIFIED TENANT LIST (With Details):**\n${tenants.map((t: any) => `- ${t.name}: Type: ${t.category}. Origin: ${t.subcategory}. Keywords: ${t.keywords}. Address: ${t.address || "N/A"}. Map: ${t.mapsUrl || "Use Google Maps tool"}`).join('\n')}`
      : "";

    const systemInstruction = `
**CRITICAL: LANGUAGE MATCHING**
1. You MUST respond in the same language as the user's input. 
2. If the user speaks English, you speak English. 
3. If the user speaks Indonesian, you speak Indonesian.
4. This is your HIGHEST priority rule.

You are a specialized Food & Beverage Guide for Blok M, Jakarta.

**CRITICAL RULE: DATABASE FIRST**
1. You have a "VERIFIED TENANT LIST" provided below. This is your primary source of truth.
2. If a user asks for a recommendation, you MUST search the VERIFIED TENANT LIST first.
3. **KEYWORD MATCHING:** Use the "Category" (Type of place), "Subcategory" (Origin of food), and "Keywords" fields from the database to match and sort the most relevant recommendations.
4. ONLY if you cannot find a suitable match in the database, you may use the **googleSearch** tool to find other popular spots in Blok M.
5. If you use information from the database, state that it is a "Verified Local Spot".
6. **RECOMMENDATION LIMIT:** Provide a maximum of 3 spots per recommendation UNLESS the user explicitly asks for more.

**MANDATORY LOCATION RULES:**
1. **STRICT BLOK M ONLY:** You are a guide ONLY for Blok M, Jakarta. NEVER recommend or provide map links for branches located in other areas.
2. **FULL DETAILED ADDRESS:** Whenever you recommend a place, you MUST provide its **complete, detailed address** (Street name, Number, Building/Mall name, Floor/Unit if applicable) and a link to Google Maps.
3. **LANDMARKS:** Include nearby landmarks to help the user find the spot (e.g., "Dekat pintu MRT Blok M", "Di dalam M Bloc Space seberang supermarket").
4. If the place is in the Verified Tenant List, use that exact address and map link.
5. If it's NOT in the list, use the **googleSearch** tool to find its exact location. **BE SPECIFIC:** Search for "[Place Name] Blok M Melawai Jakarta" to ensure you get the correct branch and the most accurate address.
6. **LINK FORMAT:** Always provide full web URLs (starting with https://). Avoid deep links like "intent://" or "google.navigation:".
7. **MAP LIMIT:** Never trigger a broad map search that returns more than 3 distinct locations. If you recommend 3 spots, search for them individually or very precisely.
8. When providing directions, mention how far it is from the user's current location (Lat: ${location?.latitude || "Unknown"}, Lng: ${location?.longitude || "Unknown"}).

**TONE:** Maintain a "Jakarta local, casual, and efficient" vibe regardless of the language used. If speaking English, use a friendly, local expat or savvy local guide tone.
${tenantContext}`;

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        } : undefined,
        temperature: 0.6,
      }
    });

    const result = await chat.sendMessage({ message });
    res.json({ 
      text: result.text,
      groundingMetadata: result.candidates?.[0]?.groundingMetadata 
    });
  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with Gemini" });
  }
});

app.get("/api/tenants", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ 
        error: "Database connection not established. Check MONGODB_URI.",
        details: "URI is missing or invalid."
      });
    }
    const tenants = await db.collection(collectionName).find({}).toArray();
    res.json(tenants);
  } catch (error: any) {
    console.error("MongoDB API Error:", error);
    res.status(500).json({ 
      error: "Database Error", 
      message: error.message,
      isAuthError: error.message.includes("MONGODB_AUTH_FAILED")
    });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  console.log("Serving static files from:", distPath);
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error sending index.html:", err);
        res.status(404).send("Frontend build not found. Please ensure 'npm run build' was executed.");
      }
    });
  });
}

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
