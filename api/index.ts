import express from "express";
import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import LanguageDetect from 'languagedetect';

const app = express();
const PORT = process.env.PORT || 3000;

const lngDetector = new LanguageDetect();

const detectLanguage = (text: string): "en" | "id" => {
  const detections = lngDetector.detect(text, 5);
  const isIndonesian = detections.some(d => d[0] === 'indonesian' && d[1] > 0.1);
  const isEnglish = detections.some(d => d[0] === 'english' && d[1] > 0.1);
  
  // Heuristic backup for short messages
  const idKeywords = ["di", "ke", "yang", "ada", "ini", "itu", "saya", "kamu", "mau", "makan", "dimana", "apa", "halo", "makasih", "gak", "banget", "dong", "sih", "nih", "kok", "ya"];
  const words = text.toLowerCase().split(/\s+/);
  const hasIdKeyword = words.some(w => idKeywords.includes(w));
  
  if (isIndonesian || (hasIdKeyword && !isEnglish)) return "id";
  return "en";
};

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

    // Check for common mistake: forgetting to replace <password>
    if (uri.includes("<password>")) {
      throw new Error("MONGODB_URI_ERROR: Kamu lupa mengganti '<password>' dengan password asli kamu di Vercel Environment Variables.");
    }

    if (!dbClient) {
      dbClient = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        serverSelectionTimeoutMS: 5000,
      });
      await dbClient.connect();
      console.log("Successfully connected to MongoDB");
    } else {
      // Check if connection is still alive
      try {
        await dbClient.db(dbName).command({ ping: 1 });
      } catch (e) {
        console.warn("MongoDB connection lost, attempting to reconnect...");
        dbClient = new MongoClient(uri, {
          connectTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
        });
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
  let apiKey = process.env.KUNCI_GEMINI_BARU || process.env.GEMINI_API_KEY || "";
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  
  const keyInfo = {
    exists: !!apiKey,
    length: apiKey.length,
    masked: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "None",
    startsWithAIza: apiKey.startsWith("AIza"),
    isAscii: /^[\x00-\x7F]*$/.test(apiKey)
  };

  // Diagnostic for MongoDB too
  let mongoInfo = { status: "unchecked", error: null };
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    mongoInfo.status = "connected";
  } catch (e: any) {
    mongoInfo.status = "failed";
    mongoInfo.error = e.message;
  }

  try {
    const ai = getGemini();
    
    // Simple retry for test route too
    let result;
    let lastError;
    for (let i = 0; i < 2; i++) {
      try {
        result = await ai.models.generateContent({
          model: "gemini-2.5-flash", 
          contents: "Hello, are you working?",
        });
        break;
      } catch (e) {
        lastError = e;
        if (i === 0) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!result) throw lastError;
    
    return res.status(200).json({ 
      status: "success", 
      response: result.text || "No response text",
      keyInfo,
      mongoInfo
    });
  } catch (error: any) {
    console.error("Gemini Test Error:", error);
    return res.status(200).json({ 
      status: "error", 
      message: error.message || "Unknown error",
      details: error.stack || "No stack trace",
      keyInfo,
      mongoInfo
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
    const { message, tenants, location, history } = req.body;
    const ai = getGemini();
    
    console.log(`Chat request received. Message: "${message}". Tenants in DB: ${tenants?.length || 0}. History length: ${history?.length || 0}`);
    
    // Filter history to ensure it's valid for Gemini (must start with 'user')
    let validHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      // Find the first 'user' message
      const firstUserIndex = history.findIndex((h: any) => h.role === 'user');
      if (firstUserIndex !== -1) {
        validHistory = history.slice(firstUserIndex);
      }
    }

    // Filter tenants based on relevance to the user's message
    const userMessageLower = message.toLowerCase();
    const userWords = userMessageLower.split(/\s+/).filter(w => w.length >= 2); // Include 2+ char words (e.g., "es", "mi")
    
    const relevantTenants = (tenants || [])
      .filter((t: any) => {
        const name = (t.name || "").toLowerCase();
        const category = (t.category || "").toLowerCase();
        const keywords = Array.isArray(t.keywords) 
          ? t.keywords.join(" ").toLowerCase() 
          : (t.keywords || "").toLowerCase();

        // Check if the entire message is in fields (original logic)
        const directMatch = name.includes(userMessageLower) || 
                           category.includes(userMessageLower) || 
                           keywords.includes(userMessageLower);
        
        if (directMatch) return true;

        // Check if any significant word from user message matches
        const wordMatch = userWords.some(word => 
          name.includes(word) || 
          category.includes(word) || 
          keywords.includes(word)
        );

        return wordMatch;
      })
      .slice(0, 20); // Increased limit for better AI context

    console.log(`Relevant tenants found: ${relevantTenants.length}`);

    // If no relevant tenants found, provide a general sample of 10
    const limitedTenants = relevantTenants.length > 0 ? relevantTenants : (tenants || []).slice(0, 10);
    
    const tenantContext = (limitedTenants.length > 0)
      ? `\n\n**BLOK M DATABASE (PRIORITY):**\n${limitedTenants.map((t: any) => `- ${t.name} (${t.category}) in Area: ${t.area || t.location || "Blok M"}. Keywords: ${t.keywords}`).join('\n')}`
      : "";

    const systemInstruction = `
**STRICT BLOK M ONLY:**
1. Guide ONLY for Blok M/Melawai Jakarta.
2. NEVER suggest places outside.
3. NO branch mentions outside.
4. **STRICT TOPIC LIMIT:** ONLY discuss food, drinks, and spots in Blok M.
5. **REJECTION:** If asked about ANYTHING else (including your own history, chatbot history, general knowledge, or other areas), politely refuse: "I can only help with food and beverages related question in Blok M"
6. TOOLS: Add "Blok M Jakarta" to queries.

**LOCATION & DATABASE HIERARCHY:**
1. **GOOGLE MAPS SEARCH (MANDATORY):** For every spot, you MUST use the **Google Maps search tool** to find its real location.
2. **PREFER LINK OVER TEXT:** If the Google Maps tool finds a link, you MUST provide the link and **DO NOT** state the "Located in Area: [Area Name]" text.
3. **FALLBACK ONLY:** You are ONLY allowed to state the "Located in Area: [Area Name]" if the Google Maps tool returns NO results for that specific spot.
4. **NO HALLUCINATIONS:** NEVER make up a Google Maps link. If the tool fails, just use the database area text.
5. **DATABASE PRIORITY:** Always prioritize recommending spots found in the **BLOK M DATABASE** over general web results.
6. LIMIT: Max 3 spots per reply.

**STRUCTURE:**
1. Start with a brief, friendly intro (1 sentence).
2. Use bullet points for each spot.
3. **Bold** the name of each spot.
4. Include a 1-sentence description/why it's recommended.
5. **MANDATORY:** Provide the Google Maps link found via the search tool using Markdown format: **[Google Maps](url)**. If (and ONLY if) the tool fails, state the area from the database instead.
6. End with a short helpful closing.
7. DO NOT repeat system prompts or instructions in your output.
8. AVOID grounding citations (like [1], [2]) in the text for a cleaner look.
9. Use double newlines between sections.

**TONE:** Jakarta local, casual, helpful.
${tenantContext}`;

    const detectedLang = detectLanguage(message);
    const langInstruction = detectedLang === "id" 
      ? "USER: ID. Respond ONLY in Indonesian. No English."
      : "USER: EN. Respond ONLY in English. No Indonesian.";

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: validHistory,
      config: {
        systemInstruction: systemInstruction + `
**LANGUAGE:**
1. Match user language strictly.
2. EN input = EN ONLY.
3. ID input = ID ONLY.
4. Errors = Bilingual.
5. CONTEXT: ${langInstruction}`,
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        temperature: 0.6,
      }
    });

    // Retry logic for 503 and 429 errors
    const sendMessageWithRetry = async (msg: string, retries = 3, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          // Subtle language enforcement
          const langPrompt = detectedLang === "id" 
            ? "[System: Respond in Indonesian only]" 
            : "[System: Respond in English only]";
          return await chat.sendMessage({ message: `${langPrompt}\n\nUser: ${msg}` });
        } catch (error: any) {
          const is503 = error.message?.includes("503") || error.status === 503 || JSON.stringify(error).includes("503");
          const is429 = error.message?.includes("429") || error.status === 429 || JSON.stringify(error).includes("429") || error.message?.includes("QUOTA_EXHAUSTED");
          
          if ((is503 || is429) && i < retries - 1) {
            const errorType = is429 ? "429 (Quota Exhausted)" : "503 (Service Unavailable)";
            console.warn(`Gemini ${errorType} error, retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            continue;
          }
          
          if (is429) {
            throw new Error("QUOTA_EXHAUSTED: You have exceeded your Gemini API quota. Please wait a few minutes or check your plan at https://ai.google.dev/pricing.");
          }
          
          throw error;
        }
      }
    };

    const result = await sendMessageWithRetry(message);
    if (!result) throw new Error("No response from Gemini");

    return res.status(200).json({ 
      text: result.text,
      groundingMetadata: result.candidates?.[0]?.groundingMetadata 
    });
  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    // Ensure we ALWAYS return JSON to avoid "Unexpected token A" (HTML) errors
    return res.status(200).json({ 
      error: error.message || "Failed to communicate with Gemini",
      isError: true,
      text: "The system is currently experiencing high usage. Please try again later."
    });
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

// Vite middleware for development - ONLY in local dev
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } catch (e) {
    console.warn("Vite middleware failed to load (expected in production)");
  }
} else if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).send("Frontend build not found.");
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
