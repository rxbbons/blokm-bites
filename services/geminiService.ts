
import { GroundingMetadata, Tenant } from "../types";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export class GeminiService {
  private tenants: Tenant[] = [];

  public setTenants(tenants: Tenant[]) {
    this.tenants = tenants;
  }

  async *sendMessageStream(message: string, history: any[] = [], location?: LocationCoords) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
          tenants: this.tenants,
          location,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 200));
        throw new Error("Server returned HTML instead of JSON. This usually means a Vercel Serverless Function crashed or timed out. Check your Gemini API Key in Vercel.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from server");
      }

      const data = await response.json();
      
      if (data.isError) {
        throw new Error(data.error || "Gemini API Error");
      }
      
      // Since we are not streaming from the server yet for simplicity, 
      // we just yield the whole result as one "chunk"
      yield { 
        text: data.text, 
        groundingMetadata: data.groundingMetadata as GroundingMetadata | undefined 
      };
    } catch (error) {
      console.error("Gemini Service Error:", error);
      throw error;
    }
  }
}
