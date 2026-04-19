import { supabase } from "@/integrations/supabase/client";

type ZegoParticipantRole = "host" | "audience";

interface FetchZegoProductionTokenParams {
  roomId: string;
  role: ZegoParticipantRole;
  userName: string;
}

interface ZegoProductionTokenResponse {
  appId: number;
  token: string;
}

export const fetchZegoProductionToken = async ({
  roomId,
  role,
  userName,
}: FetchZegoProductionTokenParams): Promise<ZegoProductionTokenResponse> => {
  const { data, error } = await supabase.functions.invoke("generate-zego-token", {
    body: { roomId, role, userName },
  });

  if (error) {
    throw new Error(error.message || "Failed to fetch Zego token");
  }

  if (!data || typeof data.token !== "string" || typeof data.appId !== "number") {
    throw new Error("Invalid token response from backend");
  }

  return {
    appId: data.appId,
    token: data.token,
  };
};
