import { getFirebaseAuth } from "@/lib/firebase/client";

export type TipPlayerResult = {
  success: boolean;
  error?: string;
  fromStack?: number;
  toStack?: number;
};

export async function tipPlayer(
  roomId: string,
  fromUid: string,
  toUid: string,
  amount: number,
): Promise<TipPlayerResult> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify that the current user is the sender
    if (user.uid !== fromUid) {
      return { success: false, error: "Unauthorized" };
    }

    const idToken = await user.getIdToken();

    const response = await fetch("/api/tip-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        fromUid,
        toUid,
        amount,
        idToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error || "Failed to send tip" 
      };
    }

    const result = await response.json();
    return {
      success: true,
      fromStack: result.fromStack,
      toStack: result.toStack,
    };
  } catch (error) {
    console.error("Error tipping player:", error);
    return { 
      success: false, 
      error: "Network error" 
    };
  }
}
