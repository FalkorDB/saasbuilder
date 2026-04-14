import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

import { baseURL } from "src/axios";
import { PAGE_TITLE_MAP } from "src/constants/pageTitleMap";
import { getEnvironmentType } from "src/server/utils/getEnvironmentType";

const environmentType = getEnvironmentType();

const applyCrossOriginPolicyHeaders = (response) => {
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.headers.set("Cross-Origin-Opener-Policy", "unsafe-none");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  return response;
};

export async function middleware(request) {
  // Handle preflight requests early to avoid page-route OPTIONS failures.
  if (request.method === "OPTIONS") {
    return applyCrossOriginPolicyHeaders(new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers") || "*",
      },
    }));
  }

  const authToken = request.cookies.get("token");
  const path = request.nextUrl.pathname;

  if (path.startsWith("/signup") || path.startsWith("/reset-password") || path.startsWith("/change-password")) {
    if (environmentType === "PROD") return;
  }

  const redirectToSignIn = () => {
    const path = request.nextUrl.pathname;
    const search = request.nextUrl.search || "";

    // Prevent Redirecting to the Same Page
    if (path.startsWith("/signin")) return;
    const destination = path?.startsWith("/") ? path : "";

    const redirectPath = destination ? `/signin?destination=${encodeURIComponent(destination + search)}` : "/signin";

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.headers.set(`x-middleware-cache`, `no-cache`);
    return applyCrossOriginPolicyHeaders(response);
  };

  if (!authToken?.value || jwtDecode(authToken.value).exp < Date.now() / 1000) {
    return redirectToSignIn();
  }

  try {
    const userData = await fetch(`${baseURL}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken.value}`,
      },
    });

    if (userData?.status !== 200) {
      return redirectToSignIn();
    }

    if (request.nextUrl.pathname.startsWith("/signin") || request.nextUrl.pathname.startsWith("/redirect")) {
      let destination = request.nextUrl.searchParams.get("destination");

      if (!destination || !PAGE_TITLE_MAP[destination]) {
        destination = "/instances";
      }

      const response = NextResponse.redirect(new URL(destination, request.url));
      response.headers.set(`x-middleware-cache`, `no-cache`);
      return applyCrossOriginPolicyHeaders(response);
    }
  } catch (_error) {
    return redirectToSignIn();
  }

  const response = NextResponse.next();
  response.headers.set(`x-middleware-cache`, `no-cache`);
  return applyCrossOriginPolicyHeaders(response);
}

/*
 * Match all request paths except for the ones starting with:
 * - signup
 * - reset-password
 * - change-password
 * - validate-token
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 */

export const config = {
  matcher: [
    "/((?!api/action|api/signup|api/signin|api/reset-password|api/provider-details|idp-auth|api/sign-in-with-idp|privacy-policy|cookie-policy|terms-of-use|favicon.ico|_next/image|_next/static|static|validate-token|mail).*)",
  ],
};
