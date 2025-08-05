"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Zap, FileText, Bot, Download, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Navbar } from "@/components/navbar"

export default function HomePage() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Blue Gradient Rings */}
        <div className="gradient-ring-1 absolute top-20 -right-40 w-96 h-96 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-20"></div>
        <div className="gradient-ring-2 absolute bottom-20 -left-40 w-80 h-80 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-15"></div>
        <div className="gradient-ring-3 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-2 border-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 opacity-10"></div>

        {/* Floating Blue Orbs */}
        <div className="gradient-orb absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
        <div
          className="gradient-orb absolute top-3/4 right-1/4 w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="gradient-orb absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="glass-light sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-slate-900">Rayfield Lease</span>
                <span className="text-xl font-bold gradient-text-blue">AI</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Features
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                asChild
              >
                <Link href="/get-started">Get Started</Link>
              </Button>
              {user ? (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-0"
                  asChild
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-0"
                  asChild
                >
                  <Link href="/auth/login">Log In</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-20">
          <Badge variant="outline" className="mb-8 border-blue-200 text-blue-700 bg-blue-50 backdrop-blur-sm">
            <Zap className="w-4 h-4 mr-2" />
            Breakthrough AI Technology
          </Badge>

          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            <span className="text-slate-900">Lease Review in</span>
            <br />
            <span className="gradient-text-blue">Seconds, Not Days</span>
          </h1>

          <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Rayfield Lease AI delivers breakthrough analysis of complex lease agreements—transforming weeks of manual
            legal review into seconds of intelligent extraction for energy and legal teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-8 py-4 text-lg border-0 shadow-2xl shadow-blue-500/25"
            >
              <Link href="/upload">
                Upload a Lease
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 px-8 py-4 text-lg bg-white backdrop-blur-sm"
            >
              <Link href="/features">Explore Features</Link>
            </Button>
          </div>

        </div>

        {/* How It Works Section */}
        <section className="glass-light rounded-3xl p-12 md:p-16 border border-slate-200 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-16 text-center">
              How It <span className="gradient-text-blue">Works</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-blue-500/25">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">1. Upload</h3>
                  <p className="text-slate-600">Drop your lease PDF or DOCX file and watch the magic happen.</p>
                </div>
              </div>

              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-blue-500/25">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">2. AI Analyzes</h3>
                  <p className="text-slate-600">Advanced AI extracts every detail and flags critical clauses.</p>
                </div>
              </div>

              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-blue-500/25">
                  <Download className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">3. Export</h3>
                  <p className="text-slate-600">Get structured data as CSV or connect directly to your API.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 mt-20 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="font-bold text-slate-900">Rayfield Lease AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 Rayfield Lease AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
