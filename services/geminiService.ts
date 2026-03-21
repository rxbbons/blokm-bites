
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

  async *sendMessageStream(message: string, location?: LocationCoords) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          tenants: this.tenants,
          location,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from server");
      }

      const data = await response.json();
      
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
