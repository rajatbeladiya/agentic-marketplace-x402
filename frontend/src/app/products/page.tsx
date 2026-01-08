"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Search,
  Package,
  CheckCircle2,
  Loader2,
  ImageIcon,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getProducts, syncProducts } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}

function ProductsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const {
    currentStore,
    shopifyProducts,
    setShopifyProducts,
    selectedProductIds,
    toggleProductSelection,
    selectAllProducts,
    clearSelection,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentStore) {
        router.push("/register");
        return;
      }

      try {
        const response = await getProducts(currentStore.id, { limit: 100 });
        if (response.data) {
          setShopifyProducts(response.data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch products";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentStore, router, setShopifyProducts, toast]);

  const filteredProducts = shopifyProducts.filter(
    (product) =>
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      clearSelection();
    } else {
      selectAllProducts(filteredProducts.map((p) => p.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedProductIds.size === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, you would send the selected products to the marketplace
      toast({
        title: "Products added to marketplace!",
        description: `${selectedProductIds.size} products are now discoverable by AI agents.`,
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit products";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentStore) {
    return null;
  }

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
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/register">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Registration
            </Button>
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Select Your Products</h1>
                <p className="text-muted-foreground">
                  Choose which products to make available to AI agents
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm py-1.5 px-4">
                  <Package className="w-4 h-4 mr-2" />
                  {shopifyProducts.length} products
                </Badge>
                <Badge
                  variant={selectedProductIds.size > 0 ? "default" : "outline"}
                  className="text-sm py-1.5 px-4"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {selectedProductIds.size} selected
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Search and Select All */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSelectAll}
              className="whitespace-nowrap"
            >
              {selectedProductIds.size === filteredProducts.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
              <p className="text-muted-foreground">Loading your products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="py-20">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery
                    ? "Try a different search term"
                    : "It looks like there are no products in your Shopify store yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProductIds.has(product.id)}
                  onToggle={() => toggleProductSelection(product.id)}
                  index={index}
                />
              ))}
            </motion.div>
          )}

          {/* Action Bar */}
          {!isLoading && filteredProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-white/10"
            >
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {selectedProductIds.size}
                  </span>{" "}
                  products selected for the marketplace
                </p>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedProductIds.size === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Publish to Marketplace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function ProductCard({ product, isSelected, onToggle, index }: ProductCardProps) {
  const firstImage = product.images?.[0];
  const firstVariant = product.variants?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
          isSelected
            ? "ring-2 ring-purple-600 shadow-lg shadow-purple-100"
            : "hover:ring-1 hover:ring-purple-200"
        }`}
        onClick={onToggle}
      >
        <div className="relative aspect-square bg-gray-100">
          {firstImage ? (
            <Image
              src={firstImage.src}
              alt={firstImage.alt || product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}

          {/* Selection Overlay */}
          <div
            className={`absolute inset-0 bg-purple-600/10 transition-opacity ${
              isSelected ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Checkbox */}
          <div className="absolute top-3 right-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-purple-600 text-white"
                  : "bg-white/90 text-gray-400 group-hover:bg-white"
              }`}
            >
              <Checkbox
                checked={isSelected}
                className="pointer-events-none border-0 data-[state=checked]:bg-transparent data-[state=checked]:text-white"
              />
            </div>
          </div>

          {/* Price Badge */}
          {firstVariant && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
                {formatPrice(firstVariant.price)}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description || "No description available"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {product.variants?.length || 0} variant
              {product.variants?.length !== 1 ? "s" : ""}
            </span>
            {product.vendor && (
              <Badge variant="secondary" className="text-xs">
                {product.vendor}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
