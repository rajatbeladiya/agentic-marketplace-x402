"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Store,
  Key,
  FileText,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useStore } from "@/store/useStore";
import { registerStore, syncProducts } from "@/lib/api";

const steps = [
  { id: 1, title: "Store Info", icon: Store },
  { id: 2, title: "API Access", icon: Key },
  { id: 3, title: "Description", icon: FileText },
  { id: 4, title: "Wallet", icon: Wallet },
];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { registrationForm, setRegistrationForm, setCurrentStore, setShopifyProducts } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!registrationForm.storeName.trim()) {
          newErrors.storeName = "Store name is required";
        }
        if (!registrationForm.storeUrl.trim()) {
          newErrors.storeUrl = "Store URL is required";
        } else if (!registrationForm.storeUrl.includes("myshopify.com") && !registrationForm.storeUrl.includes("shopify.com")) {
          newErrors.storeUrl = "Please enter a valid Shopify store URL";
        }
        break;
      case 2:
        if (!registrationForm.adminAccessToken.trim()) {
          newErrors.adminAccessToken = "Admin API access token is required";
        } else if (!registrationForm.adminAccessToken.startsWith("shpat_")) {
          newErrors.adminAccessToken = "Token should start with 'shpat_'";
        }
        break;
      case 3:
        if (!registrationForm.description.trim()) {
          newErrors.description = "Description is required";
        } else if (registrationForm.description.length < 20) {
          newErrors.description = "Description should be at least 20 characters";
        }
        break;
      case 4:
        if (!registrationForm.payToAddress.trim()) {
          newErrors.payToAddress = "Wallet address is required";
        } else if (!/^0x[a-fA-F0-9]{64}$/.test(registrationForm.payToAddress)) {
          newErrors.payToAddress = "Please enter a valid Movement wallet address (0x + 64 hex chars)";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      // Register the store
      const response = await registerStore({
        shopify_store_url: registrationForm.storeUrl,
        shopify_admin_access_token: registrationForm.adminAccessToken,
        description: registrationForm.description,
        agent_metadata: {
          name: registrationForm.storeName,
        },
        pay_to_address: registrationForm.payToAddress,
      });

      if (response.data) {
        setCurrentStore(response.data);
        toast({
          title: "Store registered successfully!",
          description: "Now let's sync your products from Shopify.",
        });

        // Sync products
        const syncResponse = await syncProducts(response.data.id);

        if (syncResponse.data) {
          toast({
            title: `${syncResponse.data.synced} products synced!`,
            description: "Redirecting to product selection...",
          });
        }

        router.push("/products");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">x402</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold mb-2">Connect Your Store</h1>
            <p className="text-muted-foreground">
              Fill in your store details to get started with AI-powered commerce
            </p>
          </motion.div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${
                    currentStep >= step.id
                      ? "text-purple-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep > step.id
                        ? "bg-purple-600 text-white"
                        : currentStep === step.id
                        ? "bg-purple-100 text-purple-600 border-2 border-purple-600"
                        : "bg-gray-100 text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline font-medium">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Form Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 1 && <Store className="w-5 h-5 text-purple-600" />}
                  {currentStep === 2 && <Key className="w-5 h-5 text-purple-600" />}
                  {currentStep === 3 && <FileText className="w-5 h-5 text-purple-600" />}
                  {currentStep === 4 && <Wallet className="w-5 h-5 text-purple-600" />}
                  {steps[currentStep - 1].title}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 && "Enter your Shopify store details"}
                  {currentStep === 2 && "Provide your Shopify Admin API access token"}
                  {currentStep === 3 && "Describe your store for AI agents"}
                  {currentStep === 4 && "Enter your Movement wallet address for payments"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Store Info */}
                {currentStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input
                        id="storeName"
                        placeholder="My Awesome Store"
                        value={registrationForm.storeName}
                        onChange={(e) =>
                          setRegistrationForm({ storeName: e.target.value })
                        }
                        className={errors.storeName ? "border-red-500" : ""}
                      />
                      {errors.storeName && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.storeName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeUrl">Shopify Store URL</Label>
                      <Input
                        id="storeUrl"
                        placeholder="your-store.myshopify.com"
                        value={registrationForm.storeUrl}
                        onChange={(e) =>
                          setRegistrationForm({ storeUrl: e.target.value })
                        }
                        className={errors.storeUrl ? "border-red-500" : ""}
                      />
                      {errors.storeUrl && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.storeUrl}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Example: my-store.myshopify.com
                      </p>
                    </div>
                  </>
                )}

                {/* Step 2: API Access */}
                {currentStep === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="adminAccessToken">Admin API Access Token</Label>
                    <Input
                      id="adminAccessToken"
                      type="password"
                      placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={registrationForm.adminAccessToken}
                      onChange={(e) =>
                        setRegistrationForm({ adminAccessToken: e.target.value })
                      }
                      className={errors.adminAccessToken ? "border-red-500" : ""}
                    />
                    {errors.adminAccessToken && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.adminAccessToken}
                      </p>
                    )}
                    <div className="p-4 bg-blue-50 rounded-lg mt-4">
                      <h4 className="font-medium text-blue-900 mb-2">
                        How to get your Admin API token:
                      </h4>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Go to your Shopify Admin panel</li>
                        <li>Navigate to Settings → Apps and sales channels</li>
                        <li>Click "Develop apps" → Create an app</li>
                        <li>Configure Admin API scopes (read_products required)</li>
                        <li>Install the app and copy the Admin API access token</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Step 3: Description */}
                {currentStep === 3 && (
                  <div className="space-y-2">
                    <Label htmlFor="description">Store Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your store and products. This helps AI agents understand what you sell and recommend your products to users..."
                      value={registrationForm.description}
                      onChange={(e) =>
                        setRegistrationForm({ description: e.target.value })
                      }
                      className={`min-h-[150px] ${errors.description ? "border-red-500" : ""}`}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Write a compelling description. AI agents use this to match
                      your products with user requests.
                    </p>
                  </div>
                )}

                {/* Step 4: Wallet */}
                {currentStep === 4 && (
                  <div className="space-y-2">
                    <Label htmlFor="payToAddress">Movement Wallet Address</Label>
                    <Input
                      id="payToAddress"
                      placeholder="0x1234567890abcdef..."
                      value={registrationForm.payToAddress}
                      onChange={(e) =>
                        setRegistrationForm({ payToAddress: e.target.value })
                      }
                      className={`font-mono text-sm ${errors.payToAddress ? "border-red-500" : ""}`}
                    />
                    {errors.payToAddress && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.payToAddress}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is where you&apos;ll receive MOVE token payments from AI
                      agents. Make sure it&apos;s correct!
                    </p>
                    <div className="p-4 bg-purple-50 rounded-lg mt-4">
                      <h4 className="font-medium text-purple-900 mb-2">
                        Payment Details
                      </h4>
                      <ul className="text-sm text-purple-800 space-y-1">
                        <li>• Payments are made in MOVE tokens</li>
                        <li>• Transactions settle instantly on Movement blockchain</li>
                        <li>• All payments are verified via x402 protocol</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  {currentStep < 4 ? (
                    <Button variant="gradient" onClick={handleNext}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      variant="gradient"
                      onClick={handleSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
