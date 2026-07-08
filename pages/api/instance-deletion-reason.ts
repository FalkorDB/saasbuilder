import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken } from "src/server/utils/authCookie";

const N8N_WEBHOOK_URL = process.env.N8N_DELETION_REASON_WEBHOOK_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!N8N_WEBHOOK_URL) {
    // Webhook not configured — silently succeed so deletion still proceeds
    return res.status(200).json({ message: "Webhook not configured" });
  }

  const { instanceId, reason, subscriptionId } = req.body || {};

  if (!instanceId || !reason) {
    return res.status(400).json({ message: "instanceId and reason are required" });
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceId,
        reason,
        subscriptionId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      // Log the failure server-side but don't block the deletion flow
      console.error(`N8N webhook call failed with status ${response.status}`);
    }

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    // Log the error server-side but don't block the deletion flow
    console.error("Failed to call N8N deletion reason webhook:", error instanceof Error ? error.message : "Unknown error");
    return res.status(200).json({ message: "Webhook call failed but proceeding" });
  }
}
