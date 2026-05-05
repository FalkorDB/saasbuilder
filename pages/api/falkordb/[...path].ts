import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken } from "src/server/utils/authCookie";

const baseURL = process.env.NEXT_PUBLIC_FALKORDB_API_BASE_URL;

/**
 * Catch-all proxy for the FalkorDB API.
 * Reads the httpOnly auth cookie and forwards the request with an Authorization header.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!baseURL) {
    return res.status(500).json({ message: "FalkorDB API base URL not configured" });
  }

  const { path } = req.query;
  const targetPath = Array.isArray(path) ? path.join("/") : path;

  // Rebuild query string without the catch-all path segments
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => queryParams.append(key, v));
    } else if (value !== undefined) {
      queryParams.append(key, value);
    }
  }

  const qs = queryParams.toString();
  const url = `${baseURL}/${targetPath}${qs ? `?${qs}` : ""}`;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type") || "";

    res.status(response.status);

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    }

    const text = await response.text();
    return res.send(text);
  } catch (error) {
    console.error("FalkorDB proxy error:", error);
    return res.status(502).json({ message: "Failed to reach FalkorDB API" });
  }
}
