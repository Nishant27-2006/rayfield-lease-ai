"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import {
  Bot,
  FileSearch,
  Database,
  AlertTriangle,
  Calendar,
  Scale,
  CheckCircle,
  ArrowRight,
  Zap,
} from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI-Powered Clause Extraction",
    description:
      "Advanced machine learning algorithms automatically identify and categorize lease clauses by phase and type.",
    benefits: ["99.2% accuracy rate", "Processes 100+ page documents in seconds", "Learns from legal precedents"],
    category: "Core AI",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: FileSearch,
    title: "Smart Document Analysis",
    description:
      "Comprehensive analysis of PDF and DOCX files with intelligent text recognition and structure mapping.",
    benefits: ["OCR for scanned documents", "Multi-format support", "Preserves document structure"],
    category: "Processing",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    icon: Database,
    title: "Structured Data Extraction",
    description:
      "Automatically pulls key metadata including parcel IDs, acreage, legal descriptions, and contact information.",
    benefits: ["API-ready JSON output", "Custom field mapping", "Bulk data processing"],
    category: "Data",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: AlertTriangle,
    title: "Risk & Deviation Detection",
    description:
      "Compares lease terms against standard templates and flags unusual or potentially problematic clauses.",
    benefits: ["Legal risk assessment", "Deviation highlighting", "Compliance checking"],
    category: "Analysis",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: Calendar,
    title: "Timeline & Renewal Tracking",
    description: "Auto-detects critical dates, renewal periods, and generates timeline visualizations with alerts.",
    benefits: ["Automated date extraction", "Renewal notifications", "Timeline visualization"],
    category: "Management",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    icon: Scale,
    title: "Obligations Matrix",
    description: "Breaks down obligations by party and phase, creating enforceable timeline matrices.",
    benefits: ["Party responsibility mapping", "Phase-based organization", "Enforceability scoring"],
    category: "Legal",
    gradient: "from-blue-600 to-cyan-600",
  },
]

export default function FeaturesPage() {
  const { user } = useAuth()
  
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-ring-1 absolute top-20 -right-40 w-96 h-96 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-15"></div>
        <div className="gradient-ring-2 absolute bottom-20 -left-40 w-80 h-80 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-10"></div>
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
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-blue-200 text-blue-700 bg-blue-50">
            <Zap className="w-4 h-4 mr-2" />
            Powered by Advanced AI
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-slate-900">
            Features That Transform
            <br />
            <span className="gradient-text-blue">Lease Analysis</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Discover how our breakthrough AI platform revolutionizes lease document processing, turning complex legal
            documents into actionable insights in seconds.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-8 py-3 border-0 shadow-2xl shadow-blue-500/25"
            asChild
          >
            <Link href="/get-started">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              Comprehensive <span className="gradient-text-blue">Feature Set</span>
            </h2>
            <p className="text-slate-600 text-lg">Everything you need for intelligent lease analysis</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="glass-light border-slate-200 hover:border-slate-300 transition-all duration-300 group hover:shadow-xl"
                >
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs bg-slate-50">
                        {feature.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-slate-900 text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-6">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-slate-700">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

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
