import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken } from "src/server/utils/authCookie";

const N8N_WEBHOOK_URL =
  process.env.N8N_DELETION_REASON_WEBHOOK_URL ||
  "https://n8n.falkordb.cloud/webhook/0b68c9dc-f7d6-4231-ba02-db57f184459c";

// Shorter than the client-side timeout so the API normally answers before the browser gives up
const N8N_WEBHOOK_TIMEOUT_MS = 5000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { instanceId, reason, userId } = req.body || {};

  if (!instanceId || !reason) {
    return res.status(400).json({ message: "instanceId and reason are required" });
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Bound the webhook call so a hung n8n endpoint can't stall the deletion flow
      signal: AbortSignal.timeout(N8N_WEBHOOK_TIMEOUT_MS),
      body: JSON.stringify({
        instance_id: instanceId,
        delete_reason: reason,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      // Log the failure server-side but don't block the deletion flow
      console.error(`N8N webhook call failed with status ${response.status}`);
    }

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    // Log the error server-side but don't block the deletion flow
    console.error(
      "Failed to call N8N deletion reason webhook:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return res.status(200).json({ message: "Webhook call failed but proceeding" });
  }
}
