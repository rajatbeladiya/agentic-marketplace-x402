"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bot,
  ShoppingCart,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  Globe,
  CreditCard,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">x402</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="gradient" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl animate-pulse-slow delay-500" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            className="text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Powered by Movement Blockchain
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Make Your Products
              <br />
              <span className="text-gradient">Discoverable by AI</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Connect your Shopify store to the agentic marketplace. Let AI
              agents discover, browse, and purchase your products with secure
              blockchain payments.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register">
                <Button variant="gradient" size="xl" className="group">
                  Connect Your Store
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="xl">
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {[
                { value: "1000+", label: "AI Agents Active" },
                { value: "$2M+", label: "Transaction Volume" },
                { value: "500+", label: "Connected Stores" },
                { value: "99.9%", label: "Uptime" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-gradient-blue">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to make your Shopify products available to AI
              agents worldwide
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: ShoppingCart,
                title: "Connect Your Store",
                description:
                  "Link your Shopify store with a simple API integration. Your products sync automatically.",
              },
              {
                step: "02",
                icon: Bot,
                title: "AI Agents Discover",
                description:
                  "Our MCP server exposes your products to AI agents. They can search, browse, and make purchase decisions.",
              },
              {
                step: "03",
                icon: CreditCard,
                title: "Secure Payments",
                description:
                  "Transactions happen on Movement blockchain using the x402 protocol. Instant, secure, and transparent.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 bg-white/80 backdrop-blur">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-bl-full opacity-50" />
                  <CardContent className="p-8 relative">
                    <div className="text-7xl font-bold text-purple-100 absolute top-4 right-4">
                      {item.step}
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-gradient-to-b from-purple-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Shopify Owners{" "}
              <span className="text-gradient">Love Us</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join the future of commerce where AI agents drive sales 24/7
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "Global Reach",
                description:
                  "Your products become accessible to thousands of AI agents worldwide, expanding your market instantly.",
              },
              {
                icon: Zap,
                title: "Instant Payments",
                description:
                  "Receive payments in MOVE tokens instantly. No waiting for bank transfers or payment processors.",
              },
              {
                icon: Shield,
                title: "Secure & Transparent",
                description:
                  "Every transaction is verified on the blockchain. Full transparency and security guaranteed.",
              },
              {
                icon: TrendingUp,
                title: "Increased Sales",
                description:
                  "AI agents never sleep. Your store is always open for business, driving sales around the clock.",
              },
              {
                icon: Bot,
                title: "MCP Integration",
                description:
                  "Our Model Context Protocol server makes your products easily discoverable by any AI agent.",
              },
              {
                icon: CheckCircle2,
                title: "Zero Setup Hassle",
                description:
                  "Connect in minutes. We handle all the technical complexity so you can focus on your business.",
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 p-6 rounded-2xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* x402 Protocol Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
                x402 Protocol
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                HTTP 402: Payment Required
                <br />
                <span className="text-gradient">Made Simple</span>
              </h2>
              <p className="text-muted-foreground mb-6">
                The x402 protocol enables a two-phase payment system that
                integrates seamlessly with HTTP. AI agents can request products,
                receive payment requirements, sign transactions, and complete
                purchases - all in a standardized way.
              </p>
              <div className="space-y-4">
                {[
                  "Phase 1: Request products, receive 402 with payment details",
                  "Phase 2: Sign transaction, submit payment, get confirmation",
                  "Instant settlement on Movement blockchain",
                  "Full compatibility with any MCP-enabled AI agent",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-slate-900 rounded-3xl p-6 text-sm font-mono overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-green-400 overflow-x-auto">
{`// Phase 1: Request product
POST /api/checkout/initiate
Response: 402 Payment Required
{
  "accepts": [{
    "network": "movement",
    "payTo": "0x1a2b3c...",
    "amount": "100000000"
  }]
}

// Phase 2: Sign & pay
POST /api/checkout/finalize
Headers: X-PAYMENT: <signed_tx>
Response: 200 OK
{
  "status": "paid",
  "txHash": "0x..."
}`}
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-12 text-center text-white"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Join the AI Commerce Revolution?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Connect your Shopify store today and start reaching AI agents
                worldwide. Setup takes less than 5 minutes.
              </p>
              <Link href="/register">
                <Button
                  size="xl"
                  className="bg-white text-purple-600 hover:bg-white/90 shadow-xl"
                >
                  Connect Your Store Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">x402 Agentic Marketplace</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by Movement Labs | x402 Protocol
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition">
                Documentation
              </a>
              <a href="#" className="hover:text-foreground transition">
                GitHub
              </a>
              <a href="#" className="hover:text-foreground transition">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
