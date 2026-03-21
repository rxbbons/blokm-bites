
import { Tenant } from "../types";

export class DatabaseService {
  async getTenants(): Promise<Tenant[]> {
    try {
      const response = await fetch('/api/tenants');
      
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
