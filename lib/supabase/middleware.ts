import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            setRequestCookie(request, name, value, options)
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            setResponseCookie(supabaseResponse, name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPatterns = [/^\/dashboard/, /^\/api\/(files|folders|datarooms)/];
  const requiresAuth = protectedPatterns.some((pattern) => pattern.test(pathname));
  const isAuthRoute = pathname.startsWith("/auth");
  const isSharedRoute = pathname.startsWith("/shared");
  const isHome = pathname === "/";

  if (!user && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && (isAuthRoute || (!requiresAuth && !isSharedRoute && isHome))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

function setRequestCookie(
  request: NextRequest,
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  if (value === "" || options.maxAge === 0) {
    request.cookies.delete?.(name);
    return;
  }
  request.cookies.set(name, value);
}

function setResponseCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  response.cookies.set(name, value, normalizeCookieOptions(options));
}

function normalizeCookieOptions(options: CookieOptions = {}) {
  return {
    sameSite: "lax" as const,
    path: "/",
    ...options,
  };
}
