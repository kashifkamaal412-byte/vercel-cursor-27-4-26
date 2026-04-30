import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://shortly.lovable.app",
  "https://id-preview--03dda6d1-e2fa-4e50-a1bd-5e8508198fa1.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "https://profitmadia.vercel.app",
  "https://profitmadia.vercel.app/"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const TOKEN_EFFECTIVE_TIME_SECONDS = 7200;
const IV_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const encoder = new TextEncoder();

type ParticipantRole = "host" | "audience";

interface TokenRequestBody {
  roomId?: unknown;
  role?: unknown;
  sessionKey?: unknown;
}

/** Remove all non-alphanumeric chars (keep underscore) */
function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

/** Sanitize room ID — remove hyphens from UUID */
function sanitizeRoomId(roomId: string): string {
  return roomId.replace(/[^a-zA-Z0-9]/g, "");
}

function buildZegoUserId(authUserId: string, role: ParticipantRole, sessionKey?: string): string {
  const base = sanitize(authUserId).slice(0, 40) || "user";
  const roleSuffix = role === "host" ? "h" : "a";
  const sessionSuffix = sanitize(sessionKey ?? "").slice(0, 10);
  const composed = sessionSuffix
    ? `${base}_${roleSuffix}_${sessionSuffix}`
    : `${base}_${roleSuffix}`;
  return composed.slice(0, 64);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function packInt64(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(value), false);
  return new Uint8Array(buffer);
}

function packString(value: Uint8Array): Uint8Array {
  if (value.length > 0xffff) throw new Error("Packed string exceeds uint16 size");
  const lenBuffer = new ArrayBuffer(2);
  const lenView = new DataView(lenBuffer);
  lenView.setUint16(0, value.length, false);
  return concatBytes([new Uint8Array(lenBuffer), value]);
}

function pkcs5Padding(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padding);
  padded.set(data);
  padded.fill(padding, data.length);
  return padded;
}

function makeNonce(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function makeRandomIv(): Uint8Array {
  const iv = new Uint8Array(16);
  for (let i = 0; i < iv.length; i++) {
    iv[i] = IV_CHARS.charCodeAt(Math.floor(Math.random() * IV_CHARS.length));
  }
  return iv;
}

async function aesEncrypt(plainText: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, pkcs5Padding(plainText, 16));
  return new Uint8Array(encrypted);
}

function bytesToBinaryString(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return result;
}

function buildPayload(roomId: string, role: ParticipantRole): string {
  const canPublish = role === "host" ? 1 : 0;
  return JSON.stringify({
    room_id: roomId,
    privilege: { 1: 1, 2: canPublish },
    stream_id_list: role === "host" ? [`${roomId}_main`] : [],
  });
}

/** Convert hex string to Uint8Array (32 bytes from 64-char hex) */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length !== 64) throw new Error("Invalid hex string length");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function generateToken04(
  appId: number,
  userId: string,
  serverSecretHex: string,
  payload: string,
  effectiveTimeInSeconds = TOKEN_EFFECTIVE_TIME_SECONDS,
): Promise<string> {
  if (!appId || !Number.isFinite(appId)) throw new Error("Invalid ZEGO app id");
  if (!userId) throw new Error("Invalid user id");

  const serverSecretBytes = hexToBytes(serverSecretHex);

  const now = Math.floor(Date.now() / 1000);
  const expire = now + effectiveTimeInSeconds;

  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    ctime: now,
    expire,
    nonce: makeNonce(),
    payload,
  };

  const plainText = encoder.encode(JSON.stringify(tokenInfo));
  const iv = makeRandomIv();
  const encrypted = await aesEncrypt(plainText, serverSecretBytes, iv);

  const packed = concatBytes([packInt64(expire), packString(iv), packString(encrypted)]);
  return `04${btoa(bytesToBinaryString(packed))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const userToken = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    const { data: authData, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !authData?.user) {
      console.error("[generate-zego-token] Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Parse body
    let parsedBody: TokenRequestBody = {};
    try {
      parsedBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { roomId, role, sessionKey } = parsedBody;
    const normalizedRole: ParticipantRole = role === "host" ? "host" : "audience";

    if (!roomId || typeof roomId !== "string" || roomId.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid roomId" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (sessionKey !== undefined && (typeof sessionKey !== "string" || sessionKey.length > 32)) {
      return new Response(JSON.stringify({ error: "Invalid sessionKey" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verify stream ownership for host role
    if (normalizedRole === "host") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      );
      const { data: stream } = await serviceClient
        .from("live_streams")
        .select("creator_id")
        .eq("id", roomId as string)
        .maybeSingle();

      if (!stream || stream.creator_id !== authData.user.id) {
        console.error("[generate-zego-token] Host role denied: not stream creator");
        return new Response(JSON.stringify({ error: "Not authorized as host for this stream" }), {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // Read Zego secrets
    const appIdStr = Deno.env.get("ZEGO_APP_ID") || "";
    const serverSecretHex = Deno.env.get("ZEGO_SERVER_SECRET") || "";

    console.log(`[generate-zego-token] AppID present: ${!!appIdStr}, Secret length: ${serverSecretHex.length}, Role: ${normalizedRole}`);

    const appId = parseInt(appIdStr, 10);
    if (!appId || !Number.isFinite(appId)) {
      console.error("[generate-zego-token] Invalid ZEGO_APP_ID:", appIdStr);
      return new Response(JSON.stringify({ error: "Zego not configured: invalid app ID" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!serverSecretHex || serverSecretHex.length !== 64) {
      console.error("[generate-zego-token] Invalid ZEGO_SERVER_SECRET length:", serverSecretHex.length);
      return new Response(JSON.stringify({ error: "Zego not configured: invalid server secret" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // CRITICAL: Sanitize roomId — Zego requires alphanumeric only
    const sanitizedRoomId = sanitizeRoomId(roomId);

    const zegoUserId = buildZegoUserId(
      authData.user.id,
      normalizedRole,
      typeof sessionKey === "string" ? sessionKey : undefined,
    );

    console.log(`[generate-zego-token] Sanitized roomId: ${sanitizedRoomId}, zegoUserId: ${zegoUserId}`);

    const payload = buildPayload(sanitizedRoomId, normalizedRole);
    const token = await generateToken04(appId, zegoUserId, serverSecretHex, payload);

    return new Response(
      JSON.stringify({ token, appId, zegoUserId, sanitizedRoomId }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[generate-zego-token] error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
