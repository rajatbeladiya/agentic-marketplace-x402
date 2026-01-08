"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bot,
  Package,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getOrderIntents, getOrders, getProducts } from "@/lib/api";
import { formatMoveAmount, formatDate, truncateAddress } from "@/lib/utils";
import type { OrderIntent, Product } from "@/types";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const { signOut, user } = useAuth();

  const [orderIntents, setOrderIntents] = useState<OrderIntent[]>([]);
  const [paidOrders, setPaidOrders] = useState<OrderIntent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentStore) return;

    try {
      const [intentsRes, ordersRes, productsRes] = await Promise.all([
        getOrderIntents(currentStore.id),
        getOrders(currentStore.id),
        getProducts(currentStore.id),
      ]);

      if (intentsRes.data) setOrderIntents(intentsRes.data);
      if (ordersRes.data) setPaidOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch data";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentStore, toast]);

  useEffect(() => {
    fetchData();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Calculate stats
  const pendingIntents = orderIntents.filter((o) => o.status === "pending");
  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + BigInt(order.total_amount),
    BigInt(0)
  );

  // Render status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="pending" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!currentStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-purple-50/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Bot className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Store Connected</h2>
            <p className="text-muted-foreground mb-6">
              Connect your Shopify store to view your dashboard
            </p>
            <Link href="/register">
              <Button variant="gradient">Connect Your Store</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
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
              <Link href="/products">
                <Button variant="ghost" size="sm">
                  Products
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your store performance and orders in real-time
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Products
                    </p>
                    <p className="text-3xl font-bold">{products.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Paid Orders
                    </p>
                    <p className="text-3xl font-bold">{paidOrders.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Pending Intents
                    </p>
                    <p className="text-3xl font-bold">{pendingIntents.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-pink-500 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold">
                      {formatMoveAmount(totalRevenue.toString())}
                    </p>
                    <p className="text-sm text-white/60">MOVE</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Orders & Intents Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All Intents</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {pendingIntents.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingIntents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid Orders
                  {paidOrders.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {paidOrders.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <OrderList
                  orders={orderIntents}
                  isLoading={isLoading}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>

              <TabsContent value="pending">
                <OrderList
                  orders={pendingIntents}
                  isLoading={isLoading}
                  getStatusBadge={getStatusBadge}
                  emptyMessage="No pending payment intents"
                />
              </TabsContent>

              <TabsContent value="paid">
                <OrderList
                  orders={paidOrders}
                  isLoading={isLoading}
                  getStatusBadge={getStatusBadge}
                  emptyMessage="No paid orders yet"
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface OrderListProps {
  orders: OrderIntent[];
  isLoading: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  emptyMessage?: string;
}

function OrderList({
  orders,
  isLoading,
  getStatusBadge,
  emptyMessage = "No orders found",
}: OrderListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="py-20">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground max-w-md">
            Orders from AI agents will appear here once they start purchasing
            your products.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order, index) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(order.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-muted-foreground mb-2">
                    {order.id}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {item.title} x{item.quantity}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gradient">
                      {formatMoveAmount(order.total_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">MOVE</p>
                  </div>
                  {order.payment_proof?.transaction_hash && (
                    <a
                      href={`https://explorer.movementnetwork.xyz/txn/${order.payment_proof.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
                    >
                      View Transaction
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="mt-4 pt-4 border-t grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Pay To</p>
                  <p className="font-mono">{truncateAddress(order.pay_to_address)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Network</p>
                  <p className="capitalize">{order.network}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p>{formatDate(order.expires_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
