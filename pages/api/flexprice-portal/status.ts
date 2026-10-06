import type { NextApiRequest, NextApiResponse } from "next";

import { isFlexpriceEnabled } from "src/server/api/flexprice";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  return res.status(200).json({ enabled: isFlexpriceEnabled() });
}
