import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const tokenHash = searchParams.get("token_hash")
  const otpType = searchParams.get("type") as EmailOtpType | null

  if (code || (tokenHash && otpType)) {
    const supabase = await createServerClient()
    const { data: existingSession } = await supabase.auth.getUser()
    if (existingSession?.user) {
      await supabase.auth.signOut()
    }
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
    } else if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      })
      if (error) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
    }

    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${next}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`)
    } else {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
