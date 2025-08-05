'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-slate-900">Rayfield Lease</span>
              <span className="text-2xl font-bold gradient-text-blue">AI</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-slate-600 hover:text-blue-600 transition-colors">
              Features
            </Link>
            <Link href="/get-started" className="text-slate-600 hover:text-blue-600 transition-colors">
              Get Started
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}