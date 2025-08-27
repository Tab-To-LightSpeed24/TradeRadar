"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const Settings = () => {
  const [userName, setUserName] = useState("John Doe");
  const [userEmail, setUserEmail] = useState("john.doe@example.com");
  const [telegramBotToken, setTelegramBotToken] = useState("YOUR_TELEGRAM_BOT_TOKEN");
  const [telegramChatId, setTelegramChatId] = useState("YOUR_TELEGRAM_CHAT_ID");
  const [enableTelegramAlerts, setEnableTelegramAlerts] = useState(true);

  const handleSaveProfile = () => {
    // In a real app, this would send data to a backend
    console.log("Saving profile:", { userName, userEmail });
    toast.success("Profile settings saved!");
  };

  const handleSaveTelegramSettings = () => {
    // In a real app, this would send data to a backend
    console.log("Saving Telegram settings:", { telegramBotToken, telegramChatId, enableTelegramAlerts });
    toast.success("Telegram settings saved!");
  };

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
          <Button onClick={handleSaveProfile}>Save Profile</Button>
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
            <Label htmlFor="enableTelegramAlerts">Enable Telegram Alerts</Label>
            <Switch 
              id="enableTelegramAlerts" 
              checked={enableTelegramAlerts} 
              onCheckedChange={setEnableTelegramAlerts} 
            />
          </div>
          <Button onClick={handleSaveTelegramSettings}>Save Telegram Settings</Button>
        </CardContent>
      </Card>

      {/* Other Settings (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">More settings options will be available here soon.</p>
          <Button variant="outline">Reset All Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;