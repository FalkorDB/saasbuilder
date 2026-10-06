import type { NextApiRequest, NextApiResponse } from "next";

import { createFlexpricePortalSession, getCustomerUserId, isFlexpriceEnabled } from "src/server/api/flexprice";
import { getAuthToken } from "src/server/utils/authCookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!isFlexpriceEnabled()) {
    return res.status(404).json({ message: "Billing portal is not configured" });
  }

  const authToken = getAuthToken(req);
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userId = await getCustomerUserId(authToken);
    const session = await createFlexpricePortalSession(userId);

    // The session URL carries a token that grants access to the customer's billing data
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ url: session.url, expiresAt: session.expires_at });
  } catch (error) {
    if (error?.name !== "FlexpriceError") {
      console.error("Error creating billing portal session:", error);
    }

    return res.status(error?.status || 500).json({
      message: error?.name === "FlexpriceError" ? error.message : "Failed to create billing portal session",
    });
  }
}
