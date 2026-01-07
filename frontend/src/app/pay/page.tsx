"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { SimpleTransaction, Deserializer, AccountAuthenticator } from "@aptos-labs/ts-sdk";
import { buildAptosLikePaymentHeader } from "x402plus";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Wallet,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { truncateAddress } from "@/lib/utils";

// Payment requirements type for x402
type PaymentRequirements = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
};

const MOVEMENT_ASSET = "0x1::aptos_coin::AptosCoin";
const MOVEMENT_NETWORK = "movement-testnet";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4402/api";

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Wallet state
  const {
    connect,
    disconnect,
    account,
    connected,
    wallet,
    wallets,
    signTransaction,
  } = useWallet();

  // Form state
  const [payTo, setPayTo] = useState(searchParams.get("payTo") || "");
  const [amountMove, setAmountMove] = useState(
    searchParams.get("amount") || ""
  );
  const [orderIntentId, setOrderIntentId] = useState(
    searchParams.get("orderId") || ""
  );

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [xPaymentHeader, setXPaymentHeader] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form from URL params
  useEffect(() => {
    const payToParam = searchParams.get("payTo");
    const amountParam = searchParams.get("amount");
    const orderIdParam = searchParams.get("orderId");

    if (payToParam) setPayTo(payToParam);
    if (amountParam) setAmountMove(amountParam);
    if (orderIdParam) setOrderIntentId(orderIdParam);
  }, [searchParams]);

  // Find Nightly wallet
  const nightlyWallet = wallets.find((w) =>
    w.name.toLowerCase().includes("nightly")
  );

  const handleConnect = async () => {
    try {
      setError(null);
      if (nightlyWallet) {
        await connect(nightlyWallet.name);
      } else if (wallets.length > 0) {
        await connect(wallets[0].name);
      } else {
        setError("No wallet found. Please install Nightly wallet extension.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setXPaymentHeader(null);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const validateInputs = (): boolean => {
    if (!payTo) {
      setError("Pay-to address is required");
      return false;
    }

    if (!payTo.match(/^0x[a-fA-F0-9]{64}$/)) {
      setError("Invalid address format (must be 0x + 64 hex characters)");
      return false;
    }

    if (!amountMove || parseFloat(amountMove) <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }

    return true;
  };

  const handleGeneratePayment = async () => {
    setError(null);
    setXPaymentHeader(null);

    if (!connected || !account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!validateInputs()) {
      return;
    }

    setIsGenerating(true);

    try {
      // Convert MOVE amount to base units (8 decimals)
      const amountBaseUnits = BigInt(
        Math.round(parseFloat(amountMove) * 100_000_000)
      ).toString();

      // Step 1: Build transaction on backend (avoids CORS issues with Movement RPC)
      const buildResponse = await fetch(`${BACKEND_URL}/build-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: account.address.toString(),
          payTo: payTo,
          amount: amountBaseUnits,
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        throw new Error(errorData.error || "Failed to build transaction");
      }

      const { transactionBcsBase64: builtTxBcs } = await buildResponse.json();

      // Step 2: Deserialize the transaction to pass to wallet
      const txBytes = Uint8Array.from(atob(builtTxBcs), c => c.charCodeAt(0));
      const deserializer = new Deserializer(txBytes);
      const rawTransaction = SimpleTransaction.deserialize(deserializer);

      // Step 3: Sign with wallet (sign only, don't submit)
      const signResult = await signTransaction({
        transactionOrPayload: rawTransaction,
      });

      // Step 4: Extract authenticator BCS bytes
      let signatureBcsBase64: string;

      if (signResult instanceof AccountAuthenticator) {
        signatureBcsBase64 = btoa(
          String.fromCharCode(...signResult.bcsToBytes())
        );
      } else {
        const result = signResult as Record<string, unknown>;
        if (result.authenticator && typeof (result.authenticator as AccountAuthenticator).bcsToBytes === "function") {
          signatureBcsBase64 = btoa(
            String.fromCharCode(...((result.authenticator as AccountAuthenticator).bcsToBytes()))
          );
        } else if (typeof (result as { bcsToBytes?: () => Uint8Array }).bcsToBytes === "function") {
          signatureBcsBase64 = btoa(
            String.fromCharCode(...((result as { bcsToBytes: () => Uint8Array }).bcsToBytes()))
          );
        } else {
          throw new Error("Could not extract signature from wallet response");
        }
      }

      // Step 5: Build the X-PAYMENT header with proper BCS bytes
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network: MOVEMENT_NETWORK,
        maxAmountRequired: amountBaseUnits,
        resource: orderIntentId || "manual-payment",
        description: `Payment of ${amountMove} MOVE`,
        mimeType: "application/json",
        payTo: payTo,
        maxTimeoutSeconds: 600,
        asset: MOVEMENT_ASSET,
      };

      const header = buildAptosLikePaymentHeader(paymentRequirements, {
        signatureBcsBase64,
        transactionBcsBase64: builtTxBcs,
      });

      setXPaymentHeader(header);

      toast({
        title: "Payment Header Generated",
        description: "Copy the header and provide it to the AI agent",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate payment";
      setError(message);
      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!xPaymentHeader) return;

    try {
      await navigator.clipboard.writeText(xPaymentHeader);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "X-PAYMENT header copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text",
        variant: "destructive",
      });
    }
  };

  // Calculate USD equivalent (1 MOVE = 2 USD)
  const usdEquivalent = amountMove
    ? (parseFloat(amountMove) * 2).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">x402 Payment</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Sign Payment Transaction
            </h1>
            <p className="text-white/60">
              Generate an X-PAYMENT header for AI agent checkout
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            {/* Wallet Connection */}
            <div className="space-y-3">
              <Label className="text-white/80">Wallet Connection</Label>
              {connected && account ? (
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {wallet?.name || "Connected"}
                      </p>
                      <p className="text-white/60 text-sm font-mono">
                        {truncateAddress(account.address.toString())}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnect}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-6"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Nightly Wallet
                </Button>
              )}
            </div>

            {/* Pay To Address */}
            <div className="space-y-2">
              <Label htmlFor="payTo" className="text-white/80">
                Pay To Address
              </Label>
              <Input
                id="payTo"
                value={payTo}
                onChange={(e) => {
                  setPayTo(e.target.value);
                  setError(null);
                }}
                placeholder="0x..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono"
              />
              <p className="text-white/40 text-xs">
                Movement wallet address (0x + 64 hex characters)
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white/80">
                Amount (MOVE)
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountMove}
                  onChange={(e) => {
                    setAmountMove(e.target.value);
                    setError(null);
                  }}
                  placeholder="5.00"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                  MOVE
                </div>
              </div>
              <p className="text-white/40 text-xs">
                Equivalent: ~${usdEquivalent} USD (Rate: 1 MOVE = $2 USD)
              </p>
            </div>

            {/* Order Intent ID (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-white/80">
                Order Intent ID{" "}
                <span className="text-white/40">(optional)</span>
              </Label>
              <Input
                id="orderId"
                value={orderIntentId}
                onChange={(e) => setOrderIntentId(e.target.value)}
                placeholder="507fc564-1843-4ba5-84fd-03558d90f76f"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
              />
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePayment}
              disabled={!connected || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-6 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing Transaction...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Sign & Generate X-PAYMENT Header
                </>
              )}
            </Button>
          </div>

          {/* X-PAYMENT Header Output */}
          {xPaymentHeader && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">
                    X-PAYMENT Header Generated
                  </h3>
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-auto">
                <code className="text-green-400 text-xs break-all font-mono">
                  {xPaymentHeader}
                </code>
              </div>

              <div className="space-y-2 text-sm text-white/60">
                <p className="font-medium text-white/80">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Copy the X-PAYMENT header above</li>
                  <li>Go back to your AI agent conversation</li>
                  <li>Provide the header when asked to finalize checkout</li>
                  <li>
                    The agent will submit the transaction and confirm your order
                  </li>
                </ol>
              </div>
            </motion.div>
          )}

          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-blue-400 font-medium">How does this work?</p>
                <p className="text-white/60">
                  This page helps you sign a payment transaction without
                  submitting it to the blockchain. The signed transaction is
                  encoded into an X-PAYMENT header that you can give to AI
                  agents. The agent&apos;s backend will verify and submit the
                  transaction securely.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Loading component for Suspense
function PaymentPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-white/60">Loading payment page...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function PaymentPage() {
  return (
    <Suspense fallback={<PaymentPageLoading />}>
      <PaymentPageContent />
    </Suspense>
  );
}
