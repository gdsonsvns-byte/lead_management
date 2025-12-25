import { login } from "@/src/lib/auth"
import { isRateLimited } from "@/src/lib/limiter"
import { loginSchema } from "@/src/types/auth"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown"
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many login attempts. Try again later." },
                { status: 429 }
            )
        }

        const ct = req.headers.get('content-type') || ''
        let body: any
        if (ct.includes('application/json')) {
            body = await req.json()
        } else if (ct.includes('form')) {
            const form = await req.formData()
            body = { email: form.get('email'), password: form.get('password') }
        } else {
            return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
        }

        const parsed = loginSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const email = parsed.data.email.toLowerCase().trim()

        const result = await login(email, parsed.data.password!)
        if (typeof result === "string") {
            return NextResponse.json({ error: result }, { status: 401 })
        }
        const { token } = result

        const cookieStore = await cookies()
        const ONE_DAY = 60 * 60 * 24
        cookieStore.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: ONE_DAY,
            expires: new Date(Date.now() + ONE_DAY * 1000),
        })

        return NextResponse.json({
            success: true,
            token: token,
        }, { status: 200 })

    } catch (err: any) {
        console.error("Login error:", err)
        return NextResponse.json({ error: err.message || "Invalid credentials" }, { status: 401 })
    }
}
