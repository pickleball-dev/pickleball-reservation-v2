import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate the admin area: only staff/admin profiles get past this point.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login?next=/admin", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Personal data and financial reports are administrator-only, even when a
    // staff member enters the URL directly.
    const adminOnlyPaths = ["/admin/customers", "/admin/team", "/admin/sales"];
    if (adminOnlyPaths.some((path) => request.nextUrl.pathname.startsWith(path)) && profile.role !== "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/my-bookings") && !user) {
    return NextResponse.redirect(new URL("/login?next=/my-bookings", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/my-bookings/:path*"],
};
