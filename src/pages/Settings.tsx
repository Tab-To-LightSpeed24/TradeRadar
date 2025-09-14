"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Telegram state
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [enableTelegramAlerts, setEnableTelegramAlerts] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        throw error;
      }

      if (data) {
        setTelegramBotToken(data.telegram_bot_token || "");
        setTelegramChatId(data.telegram_chat_id || "");
        setEnableTelegramAlerts(data.telegram_alerts_enabled || false);
      }
    } catch (error: any) {
      toast.error("Failed to fetch settings:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata.full_name || "User");
      setUserEmail(user.email || "");
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const handleSaveTelegramSettings = async () => {
    if (!user) {
      toast.error("You must be logged in to save settings.");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          telegram_bot_token: telegramBotToken,
          telegram_chat_id: telegramChatId,
          telegram_alerts_enabled: enableTelegramAlerts,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success("Telegram settings saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save Telegram settings:", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-9 w-48 mb-8" />
        <Card className="mb-8">
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Profile Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Name</Label>
            <Input 
              id="userName" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)} 
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail">Email</Label>
            <Input 
              id="userEmail" 
              type="email" 
              value={userEmail} 
              onChange={(e) => setUserEmail(e.target.value)} 
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Telegram Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
            <Input 
              id="telegramBotToken" 
              type="password"
              value={telegramBotToken} 
              onChange={(e) => setTelegramBotToken(e.target.value)} 
              placeholder="Enter your Telegram Bot Token"
            />
            <p className="text-sm text-muted-foreground">
              Get this from BotFather on Telegram.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
            <Input 
              id="telegramChatId" 
              value={telegramChatId} 
              onChange={(e) => setTelegramChatId(e.target.value)} 
              placeholder="Enter your Telegram Chat ID"
            />
            <p className="text-sm text-muted-foreground">
              Find your chat ID by messaging your bot and then using a service like @userinfobot.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enableTelegramAlerts" className="cursor-pointer">Enable Telegram Alerts</Label>
            <Switch 
              id="enableTelegramAlerts" 
              checked={enableTelegramAlerts} 
              onCheckedChange={setEnableTelegramAlerts} 
            />
          </div>
          <Button onClick={handleSaveTelegramSettings} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Telegram Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;