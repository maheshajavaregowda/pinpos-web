import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Brain,
  Calendar as CalendarIcon,
  Sparkles,
  AlertTriangle,
  Target,
  ChefHat,
  Coffee,
  Bell,
  Settings,
  Bike,
  Car,
  Utensils,
  MapPin,
  Monitor,
  CreditCard,
  Banknote,
  Wallet,
  ShoppingCart,
  Timer,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { BusinessType } from "@/types/business";
import { format, formatDistanceToNow } from "date-fns";

interface DashboardProps {
  businessMode?: BusinessType;
}

export default function Dashboard({ businessMode = "all-in-one" }: DashboardProps) {
  const [dateRange, setDateRange] = useState("today");
  const [customDate, setCustomDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Device Verification State
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [mappingCode, setMappingCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyDevice = useMutation(api.devices.verifyCode);

  // Get store
  const store = useQuery(api.seed.getFirstStore);

  // Live data from Convex dashboard queries
  const analytics = useQuery(
    api.dashboard.getAnalytics,
    store ? { storeId: store._id, dateRange } : "skip"
  );

  const recentTransactions = useQuery(
    api.dashboard.getRecentTransactions,
    store ? { storeId: store._id, limit: 5 } : "skip"
  );

  const topProducts = useQuery(
    api.dashboard.getTopProducts,
    store ? { storeId: store._id, dateRange, limit: 6 } : "skip"
  );

  const customerStats = useQuery(
    api.dashboard.getCustomerStats,
    store ? { storeId: store._id, dateRange } : "skip"
  );

  const pendingOrders = useQuery(
    api.dashboard.getPendingOrders,
    store ? { storeId: store._id } : "skip"
  );

  const hourlySales = useQuery(
    api.dashboard.getHourlySales,
    store ? { storeId: store._id, dateRange } : "skip"
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const handleVerifyDevice = async () => {
      if (!mappingCode || !store) return;
      setIsVerifying(true);
      try {
          await verifyDevice({ code: mappingCode, storeId: store._id });
          toast.success("Device linked successfully!", {
              description: `Device is now connected to ${store.name}`
          });
          setIsVerifyOpen(false);
          setMappingCode("");
      } catch (error: any) {
          toast.error("Verification failed", {
              description: error.message
          });
      } finally {
          setIsVerifying(false);
      }
  };

  const isLoading = !analytics || !recentTransactions || !topProducts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {store?.name || "Loading store..."}
            {store && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                <Monitor className="w-4 h-4" />
                Link Device
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Link a New Device</DialogTitle>
                <DialogDescription>
                  Enter the 6-character code displayed on your POS or KDS device.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="code" className="sr-only">
                    Mapping Code
                  </Label>
                  <Input
                    id="code"
                    placeholder="ABC1234"
                    className="text-center font-mono text-2xl uppercase tracking-widest"
                    value={mappingCode}
                    onChange={(e) => setMappingCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter className="sm:justify-start">
                <Button
                  type="button"
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleVerifyDevice}
                  disabled={isVerifying || mappingCode.length < 6}
                >
                  {isVerifying ? "Verifying..." : "Verify & Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pending Orders Badge */}
          {pendingOrders && pendingOrders.count > 0 && (
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-2 border-orange-300 bg-orange-50">
                <Bell className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-orange-600">{pendingOrders.count} Pending</span>
              </Button>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
            </div>
          )}

          <Button variant="outline" size="sm" asChild>
            <a href="/kitchen">
              <ChefHat className="mr-2 h-4 w-4" />
              Kitchen Display
            </a>
          </Button>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 gap-2 text-white shadow-md">
            <Brain className="w-4 h-4" />
            AI Insights
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* Main Layout: Order Analytics Left, Revenue Performance Right */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Left Side - Order Analytics */}
            <Card className="xl:col-span-2 p-6 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-orange-950/20 dark:via-background dark:to-orange-950/10 border-orange-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <PieChartIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Order Distribution</h3>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.totalOrders || 0} orders today
                  </p>
                </div>
              </div>

              {analytics?.orderTypeDistribution && analytics.orderTypeDistribution.some(d => d.value > 0) ? (
                <ChartContainer
                  config={{
                    "dine-in": { label: "Dine-in", color: "#3b82f6" },
                    "takeaway": { label: "Takeaway", color: "#10b981" },
                    "delivery": { label: "Delivery", color: "#ff6b35" }
                  }}
                  className="h-64 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.orderTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => value > 0 ? `${value}%` : ''}
                      >
                        {analytics.orderTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No orders yet today</p>
                  </div>
                </div>
              )}

              {/* Order Type Summary Cards */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                  <Utensils className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {analytics?.dineIn.orders || 0}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Dine-in</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                  <Package className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {analytics?.takeaway.orders || 0}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">Takeaway</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                  <Bike className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {analytics?.delivery.orders || 0}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Delivery</p>
                </div>
              </div>
            </Card>

            {/* Right Side - Revenue Performance Container */}
            <div className="xl:col-span-3 space-y-6">
              {/* Total Revenue Card */}
              <Card className="p-6 shadow-lg bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white/80">Total Revenue</span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      (analytics?.revenueChange || 0) >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'
                    }`}>
                      {(analytics?.revenueChange || 0) >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span className="text-xs font-medium">
                        {(analytics?.revenueChange || 0) >= 0 ? '+' : ''}{analytics?.revenueChange || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-4xl font-black">
                        {formatCurrency(analytics?.totalRevenue || 0)}
                      </span>
                      <p className="text-sm text-white/70 mt-1">
                        {analytics?.totalOrders || 0} orders • Avg {formatCurrency(analytics?.avgOrderValue || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <DollarSign className="w-12 h-12 text-white/20" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Revenue Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dine-in */}
                <Card className="p-4 shadow-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">Dine-in</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Table service</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(analytics?.dineIn.revenue || 0)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {analytics?.dineIn.orders || 0} orders
                    </p>
                  </div>
                </Card>

                {/* Takeaway */}
                <Card className="p-4 shadow-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Takeaway</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Pick-up orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(analytics?.takeaway.revenue || 0)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {analytics?.takeaway.orders || 0} orders
                    </p>
                  </div>
                </Card>

                {/* Delivery */}
                <Card className="p-4 shadow-sm bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
                      <Bike className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-orange-900 dark:text-orange-100">Delivery</p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">Home delivery</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {formatCurrency(analytics?.delivery.revenue || 0)}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {analytics?.delivery.orders || 0} orders
                    </p>
                  </div>
                </Card>
              </div>

              {/* Payment Breakdown & Customer Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Methods */}
                <Card className="p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    <h4 className="font-semibold">Payment Methods</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <Banknote className="w-4 h-4 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-green-700">{analytics?.paymentBreakdown.cash || 0}</p>
                      <p className="text-[10px] text-green-600">Cash</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <CreditCard className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-blue-700">{analytics?.paymentBreakdown.card || 0}</p>
                      <p className="text-[10px] text-blue-600">Card</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                      <Wallet className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-purple-700">{analytics?.paymentBreakdown.upi || 0}</p>
                      <p className="text-[10px] text-purple-600">UPI</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                      <Clock className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-yellow-700">{analytics?.paymentBreakdown.pending || 0}</p>
                      <p className="text-[10px] text-yellow-600">Pending</p>
                    </div>
                  </div>
                </Card>

                {/* Customer Stats */}
                <Card className="p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-orange-500" />
                    <h4 className="font-semibold">Customers</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-3xl font-bold text-foreground">
                          {customerStats?.newPercentage || 0}%
                        </span>
                        <span className="text-sm text-muted-foreground mb-1">new</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          style={{ width: `${customerStats?.newPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{customerStats?.newCustomers || 0} new</span>
                        <span>{customerStats?.returningCustomers || 0} returning</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Peak Hours & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Peak Hours */}
            <Card className="p-4 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-purple-500" />
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Peak Hours</h4>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {hourlySales?.peakTime || "N/A"}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {hourlySales?.peakOrders || 0} orders during peak
              </p>
            </Card>

            {/* Avg Order Value */}
            <Card className="p-4 shadow-sm bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-cyan-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-cyan-500" />
                <h4 className="font-semibold text-cyan-900 dark:text-cyan-100">Avg Order</h4>
              </div>
              <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                {formatCurrency(analytics?.avgOrderValue || 0)}
              </p>
              <p className="text-xs text-cyan-600 dark:text-cyan-400">per transaction</p>
            </Card>

            {/* Total Orders */}
            <Card className="p-4 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200/50">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Total Orders</h4>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {analytics?.totalOrders || 0}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {analytics?.paymentBreakdown.paid || 0} paid
              </p>
            </Card>

            {/* Pending Payments */}
            <Card className="p-4 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Pending</h4>
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {analytics?.paymentBreakdown.pending || 0}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">unpaid orders</p>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </div>

              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        index === 0
                          ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'dine_in' ? 'bg-blue-100 text-blue-600' :
                          transaction.type === 'takeaway' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {transaction.tokenNumber ? (
                            <span className="font-bold text-sm">#{transaction.tokenNumber}</span>
                          ) : (
                            transaction.type === 'dine_in' ? <Utensils className="w-4 h-4" /> :
                            transaction.type === 'takeaway' ? <Package className="w-4 h-4" /> :
                            <Bike className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{transaction.customer}</p>
                          <p className="text-xs text-muted-foreground">{transaction.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(transaction.amount)}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <Badge className={`text-[10px] ${
                            transaction.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {transaction.payment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(transaction.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No orders yet</p>
                </div>
              )}
            </Card>

            {/* Top Products */}
            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">Top Selling Items</h3>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  View All
                </Button>
              </div>

              {topProducts && topProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-700"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                        'bg-gradient-to-r from-orange-400 to-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                      </div>
                      <p className="font-bold text-green-600 text-sm">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No sales data yet</p>
                </div>
              )}
            </Card>
          </div>

          {/* AI Insights Section */}
          <Card className="p-6 shadow-sm bg-gradient-to-r from-orange-50 via-white to-orange-50 dark:from-orange-950/20 dark:via-background dark:to-orange-950/20 border-orange-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">AI Insights & Recommendations</h3>
                <p className="text-sm text-muted-foreground">Smart suggestions based on your data</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-4 h-4 text-purple-500" />
                  <p className="text-sm font-medium text-foreground">Peak Time Alert</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your busiest hours are <strong>{hourlySales?.peakTime || "N/A"}</strong>.
                  Consider adding extra staff during this time.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium text-foreground">Top Channel</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(analytics?.dineIn.revenue || 0) > (analytics?.takeaway.revenue || 0) && (analytics?.dineIn.revenue || 0) > (analytics?.delivery.revenue || 0)
                    ? "Dine-in is your strongest channel. Focus on table turnover to maximize revenue."
                    : (analytics?.takeaway.revenue || 0) > (analytics?.delivery.revenue || 0)
                    ? "Takeaway orders are leading. Consider optimizing pickup experience."
                    : "Delivery is growing. Ensure fast preparation for delivery orders."}
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-medium text-foreground">Quick Actions</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Review pending payments ({analytics?.paymentBreakdown.pending || 0})</li>
                  <li>• Check low stock items</li>
                  <li>• Update menu prices</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
