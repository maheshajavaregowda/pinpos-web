import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    CreditCard,
    Crown,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Lock,
    Unlock,
    Phone,
    Mail,
    IndianRupee,
    Calendar,
    Receipt,
    Loader2,
    Shield,
    Sparkles,
    ArrowRight,
} from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function Billing() {
    const userId = localStorage.getItem("pinpos_user_id") as Id<"users"> | null;

    const orgId = useQuery(
        api.subscription.getOrgForUser,
        userId ? { userId } : "skip"
    );
    const subscription = useQuery(
        api.subscription.getSubscriptionStatus,
        orgId ? { orgId } : "skip"
    );
    const payments = useQuery(
        api.subscription.getPaymentHistory,
        orgId ? { orgId } : "skip"
    );

    const createOrder = useAction(api.subscription.createRazorpayOrder);
    const verifyPayment = useAction(api.subscription.verifyRazorpayPayment);
    const applyCode = useMutation(api.subscription.applyUnlockCode);

    const [planType, setPlanType] = useState<"monthly" | "yearly">("monthly");
    const [unlockCode, setUnlockCode] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isApplyingCode, setIsApplyingCode] = useState(false);

    const handleSubscribe = async () => {
        if (!orgId) return;
        setIsProcessing(true);
        try {
            const order = await createOrder({ orgId, planType });

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "PinPos",
                description: `${planType === "monthly" ? "Monthly" : "Yearly"} Subscription`,
                order_id: order.orderId,
                handler: async (response: any) => {
                    try {
                        await verifyPayment({
                            orgId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            planType,
                            amount: order.amount,
                        });
                        toast.success("Payment successful! Your subscription is now active.");
                    } catch {
                        toast.error("Payment verification failed. Contact support if amount was debited.");
                    }
                },
                prefill: {},
                theme: { color: "#7c3aed" },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                toast.error(`Payment failed: ${response.error.description}`);
                setIsProcessing(false);
            });
            rzp.open();
        } catch (err: any) {
            toast.error(err.message || "Failed to create payment order");
            setIsProcessing(false);
        }
    };

    const handleApplyCode = async () => {
        if (!orgId || !unlockCode.trim()) return;
        setIsApplyingCode(true);
        try {
            const result = await applyCode({ orgId, code: unlockCode.trim() });
            toast.success(`Subscription extended by ${result.extensionDays} days!`);
            setUnlockCode("");
        } catch (err: any) {
            toast.error(err.message || "Invalid unlock code");
        } finally {
            setIsApplyingCode(false);
        }
    };

    if (!userId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please log in to view billing.</p>
            </div>
        );
    }

    if (orgId === undefined || subscription === undefined) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!orgId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No organization found for your account.</p>
            </div>
        );
    }

    const statusConfig = {
        active: { label: "Active", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
        trialing: { label: "Free Trial", variant: "secondary" as const, icon: Clock, color: "text-blue-600" },
        expired: { label: "Expired", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600" },
        past_due: { label: "Past Due", variant: "destructive" as const, icon: AlertTriangle, color: "text-orange-600" },
        cancelled: { label: "Cancelled", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600" },
    };

    const currentStatus = statusConfig[subscription.status as keyof typeof statusConfig] || statusConfig.expired;
    const StatusIcon = currentStatus.icon;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="w-7 h-7 text-primary" />
                    Billing & Subscription
                </h1>
                <p className="text-muted-foreground mt-1">Manage your PinPos subscription and payments</p>
            </div>

            {/* Subscription Status Card */}
            <Card className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Crown className="w-6 h-6 text-yellow-500" />
                            <h2 className="text-xl font-semibold">{subscription.planName} Plan</h2>
                            <Badge variant={currentStatus.variant}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1" />
                                {currentStatus.label}
                            </Badge>
                        </div>

                        {subscription.isTrialing && (
                            <p className="text-sm text-blue-600 flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                Free trial - {subscription.daysRemaining} days remaining
                            </p>
                        )}
                        {subscription.isActive && !subscription.isTrialing && (
                            <p className="text-sm text-green-600 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Active until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}
                                {" "}({subscription.daysRemaining} days remaining)
                            </p>
                        )}
                        {subscription.isExpired && (
                            <p className="text-sm text-red-600 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                Your subscription has expired. Renew to continue using PinPos.
                            </p>
                        )}
                    </div>

                    {subscription.isActive && !subscription.isExpired && (
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{subscription.daysRemaining}</div>
                            <div className="text-xs text-muted-foreground">days left</div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Plan Selection & Subscribe */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {subscription.isExpired ? "Renew Your Subscription" : "Subscription Plans"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Monthly Plan */}
                    <div
                        className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                            planType === "monthly"
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/40"
                        }`}
                        onClick={() => setPlanType("monthly")}
                    >
                        {planType === "monthly" && (
                            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                Selected
                            </div>
                        )}
                        <div className="flex items-baseline gap-1 mb-2">
                            <IndianRupee className="w-5 h-5" />
                            <span className="text-3xl font-bold">{subscription.priceMonthly}</span>
                            <span className="text-muted-foreground">/month</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Billed monthly. Cancel anytime.</p>
                        <ul className="mt-3 space-y-1.5 text-sm">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Full POS access</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Online order integration</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Real-time dashboard</li>
                        </ul>
                    </div>

                    {/* Yearly Plan */}
                    <div
                        className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                            planType === "yearly"
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/40"
                        }`}
                        onClick={() => setPlanType("yearly")}
                    >
                        <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                            Save 17%
                        </div>
                        {planType === "yearly" && (
                            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                Selected
                            </div>
                        )}
                        <div className="flex items-baseline gap-1 mb-2">
                            <IndianRupee className="w-5 h-5" />
                            <span className="text-3xl font-bold">{subscription.priceYearly}</span>
                            <span className="text-muted-foreground">/year</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            <span className="line-through text-muted-foreground/60">
                                {subscription.priceMonthly * 12}
                            </span>{" "}
                            Save {subscription.priceMonthly * 12 - subscription.priceYearly}/yr
                        </p>
                        <ul className="mt-3 space-y-1.5 text-sm">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Everything in Monthly</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Priority support</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Best value</li>
                        </ul>
                    </div>
                </div>

                <Button
                    className="w-full mt-5 h-12 text-base gap-2"
                    size="lg"
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="w-5 h-5" />
                            {subscription.isExpired ? "Renew Now" : "Subscribe Now"} - {planType === "monthly" ? `₹${subscription.priceMonthly}/mo` : `₹${subscription.priceYearly}/yr`}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Secure payment powered by Razorpay. UPI, Cards, Netbanking accepted.
                </p>
            </Card>

            {/* Unlock Code Section */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Unlock className="w-5 h-5 text-primary" />
                    Have an Unlock Code?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Enter an unlock code provided by PinPos support to extend your subscription.
                </p>
                <div className="flex gap-3">
                    <Input
                        placeholder="Enter unlock code (e.g. ABCD1234)"
                        value={unlockCode}
                        onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
                        className="font-mono text-lg tracking-widest uppercase"
                        maxLength={8}
                    />
                    <Button
                        onClick={handleApplyCode}
                        disabled={!unlockCode.trim() || isApplyingCode}
                        className="gap-2 shrink-0"
                    >
                        {isApplyingCode ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Lock className="w-4 h-4" />
                        )}
                        Apply Code
                    </Button>
                </div>
            </Card>

            {/* Payment History */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Payment History
                </h3>

                {!payments || payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>No payment history yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">Date</th>
                                    <th className="pb-2 font-medium">Plan</th>
                                    <th className="pb-2 font-medium">Amount</th>
                                    <th className="pb-2 font-medium">Status</th>
                                    <th className="pb-2 font-medium">Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment._id} className="border-b last:border-0">
                                        <td className="py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                                {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-3 capitalize">{payment.planType}</td>
                                        <td className="py-3 font-medium">
                                            ₹{(payment.amount / 100).toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-3">
                                            <Badge
                                                variant={
                                                    payment.status === "captured" ? "default" :
                                                    payment.status === "created" ? "secondary" :
                                                    "destructive"
                                                }
                                                className="text-xs"
                                            >
                                                {payment.status === "captured" ? "Paid" :
                                                 payment.status === "created" ? "Pending" :
                                                 payment.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 font-mono text-xs text-muted-foreground">
                                            {payment.receipt || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Support Section */}
            <Card className="p-6 bg-muted/30">
                <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Contact PinPos support for billing inquiries, unlock codes, or any subscription-related questions.
                </p>
                <div className="flex flex-wrap gap-4">
                    <a href="tel:+919876543210" className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Phone className="w-4 h-4" />
                        +91 98765 43210
                    </a>
                    <a href="mailto:support@pinpos.app" className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Mail className="w-4 h-4" />
                        support@pinpos.app
                    </a>
                </div>
            </Card>
        </div>
    );
}
