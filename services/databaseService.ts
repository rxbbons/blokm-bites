
import { Tenant } from "../types";

export class DatabaseService {
  async getTenants(): Promise<Tenant[]> {
    try {
      const response = await fetch('/api/tenants');
      
      if (!response.ok) {
        throw new Error("Database connection failed. Please check your MONGODB_URI in settings.");
      }
      
      const data = await response.json();
      return data || [];

    } catch (error) {
      console.error("MongoDB Fetch Error:", error);
      return []; // Return empty array instead of fallback data
    }
  }
}
