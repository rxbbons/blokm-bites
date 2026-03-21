
import { Tenant } from "../types";

export class DatabaseService {
  async getTenants(): Promise<Tenant[]> {
    try {
      const response = await fetch('/api/tenants');
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. This usually means a Vercel Serverless Function crashed or timed out. Check your MongoDB connection and Atlas IP allowlist.`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Database connection failed. Check your MONGODB_URI in Vercel.");
      }
      
      const data = await response.json();
      return data || [];

    } catch (error: any) {
      console.error("MongoDB Fetch Error:", error);
      throw error; // Throw error to be caught by App.tsx
    }
  }
}
