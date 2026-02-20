import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Globe, Shield, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CredentialsDialogProps {
  open: boolean;
  onClose: () => void;
  aggregator: {
    _id: Id<"aggregators">;
    platform: string;
    credentials: {
      apiKey?: string;
      apiSecret?: string;
      restaurantId?: string;
      webhookSecret?: string;
    };
    webhookUrl?: string;
  };
}

export const CredentialsDialog = ({
  open,
  onClose,
  aggregator,
}: CredentialsDialogProps) => {
  const [apiKey, setApiKey] = useState(aggregator.credentials.apiKey || "");
  const [apiSecret, setApiSecret] = useState(aggregator.credentials.apiSecret || "");
  const [restaurantId, setRestaurantId] = useState(aggregator.credentials.restaurantId || "");
  const [webhookSecret, setWebhookSecret] = useState(aggregator.credentials.webhookSecret || "");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateAggregator = useMutation(api.aggregators.update);

  const platformName =
    aggregator.platform === "swiggy"
      ? "Swiggy"
      : aggregator.platform === "zomato"
        ? "Zomato"
        : "Rapido";

  const webhookUrl = `${window.location.origin}/webhook/${aggregator.platform}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAggregator({
        aggregatorId: aggregator._id,
        credentials: {
          apiKey: apiKey || undefined,
          apiSecret: apiSecret || undefined,
          restaurantId: restaurantId || undefined,
          webhookSecret: webhookSecret || undefined,
        },
      });
      toast.success("Credentials saved successfully");
      onClose();
    } catch (error: any) {
      toast.error("Failed to save", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-500" />
            {platformName} Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm bg-gray-50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyWebhook}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set this URL in your {platformName} merchant dashboard to receive orders
            </p>
          </div>

          {/* API Credentials */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              API Credentials
            </Label>

            <div className="space-y-3">
              <div>
                <Label className="text-sm">Restaurant / Store ID</Label>
                <Input
                  placeholder={`${platformName} Restaurant ID`}
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">API Key</Label>
                <Input
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">API Secret</Label>
                <Input
                  placeholder="Enter API Secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  type="password"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">Webhook Secret</Label>
                <Input
                  placeholder="Webhook verification secret"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  type="password"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Credentials"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
