"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, ArrowRight, User, Zap, FileText, Download, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small teams getting started with AI lease analysis",
    features: [
      "Up to 50 documents/month",
      "Standard clause extraction",
      "CSV export",
      "Email support",
      "Basic analytics",
    ],
    popular: false,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    name: "Professional",
    price: "$299",
    period: "/month",
    description: "Advanced features for growing legal and energy teams",
    features: [
      "Up to 200 documents/month",
      "All analysis modes",
      "API access",
      "Priority support",
      "Advanced analytics",
      "Team collaboration",
    ],
    popular: true,
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored solutions for large organizations",
    features: [
      "Unlimited documents",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
      "Custom training",
      "White-label options",
    ],
    popular: false,
    gradient: "from-indigo-600 to-purple-600",
  },
]

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up with your business email and get instant access to our platform.",
    icon: User,
  },
  {
    number: "02",
    title: "Choose Your Plan",
    description: "Select the perfect plan for your team size and document volume needs.",
    icon: Zap,
  },
  {
    number: "03",
    title: "Upload & Analyze",
    description: "Start uploading lease documents and experience AI-powered analysis.",
    icon: FileText,
  },
  {
    number: "04",
    title: "Export Results",
    description: "Download structured data or integrate with your existing workflows.",
    icon: Download,
  },
]

export default function GetStartedPage() {
  const [user, setUser] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState("Professional")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    teamSize: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkAuth()
  }, [supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.company) {
      setError('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          selectedPlan,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6 border-blue-200 text-blue-700 bg-blue-50">
            <Zap className="w-4 h-4 mr-2" />
            Start Your AI Journey
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Get Started with <span className="gradient-text-blue">Rayfield Lease AI</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Join hundreds of legal and energy professionals who are transforming their lease analysis workflow with AI.
            Get up and running in minutes.
          </p>
        </div>

        {/* How to Get Started Steps */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">
            How to <span className="gradient-text-blue">Get Started</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card
                  key={index}
                  className="glass-light border-slate-200 text-center group hover:shadow-lg transition-all"
                >
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-sm font-bold text-blue-600 mb-2">{step.number}</div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600 text-sm">{step.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Choose Your <span className="gradient-text-blue">Plan</span>
            </h2>
            <p className="text-slate-600 text-lg">Select the perfect plan for your team and document volume</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`glass-light border-slate-200 relative cursor-pointer transition-all hover:shadow-xl ${
                  selectedPlan === plan.name ? "ring-2 ring-blue-500 border-blue-300" : ""
                } ${plan.popular ? "scale-105" : ""}`}
                onClick={() => setSelectedPlan(plan.name)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold gradient-text-blue">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 text-sm">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section className="max-w-2xl mx-auto">
          {isSubmitted ? (
            <Card className="glass-light border-slate-200">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Thank You!</h2>
                <p className="text-slate-600 mb-6">
                  Your message has been sent successfully. Our team will get back to you within 24 hours.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/">Back to Home</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/features">Learn More</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-light border-slate-200">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-slate-900">Contact Us</CardTitle>
                <p className="text-slate-600">Get started with Rayfield Lease AI today</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-slate-700">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="border-slate-300 focus:border-blue-500 h-12"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-slate-700">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="border-slate-300 focus:border-blue-500 h-12"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-700">
                      Business Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="border-slate-300 focus:border-blue-500 h-12"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company" className="text-slate-700">
                      Company Name *
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      className="border-slate-300 focus:border-blue-500 h-12"
                      placeholder="Your company name"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-slate-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="border-slate-300 focus:border-blue-500 h-12"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamSize" className="text-slate-700">
                        Team Size
                      </Label>
                      <select
                        id="teamSize"
                        name="teamSize"
                        value={formData.teamSize}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 h-12 border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none bg-white"
                      >
                        <option value="">Select team size</option>
                        <option value="1-5">1-5 people</option>
                        <option value="6-20">6-20 people</option>
                        <option value="21-50">21-50 people</option>
                        <option value="51-100">51-100 people</option>
                        <option value="100+">100+ people</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-slate-700">
                      How can we help you?
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your lease analysis needs, questions about our platform, or how we can help streamline your lease review process..."
                      rows={4}
                      className="border-slate-300 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-0 shadow-lg shadow-blue-500/25"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          Send Message 
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-sm text-slate-500 mt-4">
                      By submitting this form, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
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
