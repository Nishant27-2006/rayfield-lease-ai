"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Sun, Wind, Zap, FileText, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/auth-context"

const leaseTypes = [
  {
    id: "solar",
    name: "Solar Lease",
    icon: Sun,
    description:
      "Best for ground and rooftop solar: triggers analysis of technical, easement, and step-in rights typical in solar development.",
    selected: true,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "wind",
    name: "Wind Lease",
    icon: Wind,
    description: "Optimized for wind energy projects and related land agreements.",
    selected: false,
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "bess",
    name: "BESS Lease",
    icon: Zap,
    description: "Battery energy storage system lease analysis.",
    selected: false,
    gradient: "from-indigo-600 to-blue-600",
  },
  {
    id: "generic",
    name: "Generic Land Lease",
    icon: FileText,
    description: "General land lease analysis for various purposes.",
    selected: false,
    gradient: "from-cyan-500 to-blue-500",
  },
]

const analysisModes = [
  {
    id: "standard",
    name: "Standard Clause Extraction",
    description:
      "Extracts clauses grouped by phase (General, Development, Construction, Operational). Outputs structured tables with summaries, categories, and tags.",
    selected: true,
    highlighted: true,
  },
  {
    id: "parsing",
    name: "Data Parsing & Mapping",
    description: "Pulls metadata (Parcel ID, Acreage, Legal, Contacts) for clean tables or API-ready JSON.",
    selected: false,
    highlighted: false,
  },
  {
    id: "redlining",
    name: "Redlining / Deviation Detection",
    description:
      "Compares lease to standard templates. Highlights additions, removals, and deviations for legal review.",
    selected: false,
    highlighted: false,
  },
  {
    id: "obligations",
    name: "Obligations Matrix",
    description: "Breaks obligations by party/phase. Outputs a timeline-ready matrix of enforceability.",
    selected: false,
    highlighted: false,
  },
  {
    id: "renewal",
    name: "Renewal & Expiry Timeline",
    description: "Auto-detects dates/renewals. Generates timeline and setup alerts.",
    selected: false,
    highlighted: false,
  },
  {
    id: "legal",
    name: "Legal Review Risk Flagging",
    description: "Flags vague/unusual clauses and explains risks — trained on typical disputes.",
    selected: false,
    highlighted: true,
  },
]

export default function UploadPage() {
  const [selectedLeaseType, setSelectedLeaseType] = useState("solar")
  const [selectedModes, setSelectedModes] = useState(["standard", "legal"])
  const { user } = useAuth()

  const handleModeToggle = (modeId: string) => {
    setSelectedModes((prev) => (prev.includes(modeId) ? prev.filter((id) => id !== modeId) : [...prev, modeId]))
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-ring-1 absolute top-20 -right-40 w-96 h-96 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-10"></div>
        <div className="gradient-ring-2 absolute bottom-20 -left-40 w-80 h-80 rounded-full border-4 border-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 opacity-8"></div>
      </div>

      {/* Header */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            What kind of lease analysis do you want to perform?
          </h1>
          <p className="text-slate-600">Choose one or more processing types below:</p>
        </div>

        {/* Lease Type Selection */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">LEASE TYPE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {leaseTypes.map((type) => {
              const Icon = type.icon
              return (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg glass-light border-slate-200",
                    selectedLeaseType === type.id
                      ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300"
                      : "hover:bg-slate-50 hover:border-slate-300",
                  )}
                  onClick={() => setSelectedLeaseType(type.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className={`w-8 h-8 mx-auto mb-2 bg-gradient-to-r ${type.gradient} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-medium text-slate-900">{type.name}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {selectedLeaseType === "solar" && (
            <div className="glass-blue border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Best for ground and rooftop solar: triggers analysis of technical, easement, and step-in rights typical
                in solar development.
              </p>
            </div>
          )}
        </section>

        {/* Analysis Modes */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">ANALYSIS MODES</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {analysisModes.map((mode) => (
              <Card
                key={mode.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg glass-light border-slate-200",
                  selectedModes.includes(mode.id)
                    ? mode.highlighted
                      ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300"
                      : "ring-2 ring-slate-300 bg-slate-50 border-slate-300"
                    : "hover:bg-slate-50 hover:border-slate-300",
                  mode.highlighted && !selectedModes.includes(mode.id) && "border-blue-200",
                )}
                onClick={() => handleModeToggle(mode.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedModes.includes(mode.id)}
                      onChange={() => handleModeToggle(mode.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{mode.name}</h3>
                        <Info className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-600">{mode.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 px-8 py-3 border-0 shadow-2xl shadow-blue-500/25"
            asChild
          >
            <Link href={`/upload/file?leaseType=${selectedLeaseType}&modes=${selectedModes.join(',')}`}>Continue to Upload & Analyze Lease</Link>
          </Button>
          <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
