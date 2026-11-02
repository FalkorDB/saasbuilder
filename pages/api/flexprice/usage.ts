import type { NextApiRequest, NextApiResponse } from "next";

import { FLEXPRICE_USAGE_GROUP_BY_KEYS } from "src/constants/flexpriceUsage";
import {
  FlexpriceUsageWindowSize,
  getCustomerUserId,
  getFlexpriceUsage,
  isFlexpriceEnabled,
} from "src/server/api/flexprice";
import { getAuthToken } from "src/server/utils/authCookie";

const WINDOW_SIZES: FlexpriceUsageWindowSize[] = ["HOUR", "DAY"];
// Custom ranges can be up to a year (plus a day of room for time zones and leap years)
const MAX_RANGE_DAYS = 367;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
// Hourly points are only used for a single day; allow two to cover time zones and DST changes
const MAX_HOURLY_RANGE_MS = 2 * 24 * 60 * 60 * 1000;

function parseTime(value: unknown) {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? null : time;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!isFlexpriceEnabled()) {
    return res.status(404).json({ message: "Flexprice billing is not configured" });
  }

  const authToken = getAuthToken(req);
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { startTime, endTime, windowSize, groupBy } = req.body || {};
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (start === null || end === null || start >= end) {
    return res.status(400).json({ message: "Invalid time range" });
  }
  if (end - start > MAX_RANGE_MS) {
    return res.status(400).json({ message: "Choose a time range of up to a year" });
  }
  if (!WINDOW_SIZES.includes(windowSize)) {
    return res.status(400).json({ message: "Invalid window size" });
  }
  if (windowSize === "HOUR" && end - start > MAX_HOURLY_RANGE_MS) {
    return res.status(400).json({ message: "Hourly usage is only available for up to two days" });
  }
  // Only known properties are allowed, since the key is sent to Flexprice as a group_by path
  if (!FLEXPRICE_USAGE_GROUP_BY_KEYS.includes(groupBy)) {
    return res.status(400).json({ message: "Invalid group by" });
  }

  try {
    const userId = await getCustomerUserId(authToken);
    const usage = await getFlexpriceUsage(userId, {
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      windowSize,
      groupBy,
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(usage);
  } catch (error) {
    // Expected client errors (bad range, unknown customer) aren't logged; server-side failures are
    if (error?.name !== "FlexpriceError" || error.status >= 500) {
      console.error("Error loading Flexprice usage:", error);
    }

    return res.status(error?.status || 500).json({
      message: error?.name === "FlexpriceError" ? error.message : "Failed to load usage",
    });
  }
}
