"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell,
  BellOff,
  Check,
  X,
  Filter,
  Download,
  Eye
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const Alerts = () => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      strategy: "Bullish Breakout",
      symbol: "AAPL",
      time: "2023-06-15 09:32:15",
      price: 172.45,
      type: "Buy Signal",
      isRead: false,
      isTelegramSent: true
    },
    {
      id: 2,
      strategy: "Volatility Breakout", 
      symbol: "TSLA",
      time: "2023-06-15 08:45:30",
      price: 245.30,
      type: "Sell Signal",
      isRead: true,
      isTelegramSent: true
    },
    {
      id: 3,
      strategy: "Mean Reversion",
      symbol: "NVDA",
      time: "2023-06-15 07:12:45",
      price: 420.75,
      type: "Buy Signal",
      isRead: false,
      isTelegramSent: false
    },
    {
      id: 4,
      strategy: "Bullish Breakout",
      symbol: "MSFT",
      time: "2023-06-14 16:55:22",
      price: 340.20,
      type: "Sell Signal",
      isRead: true,
      isTelegramSent: true
    }
  ]);

  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const markAsRead = (id: number) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, isRead: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, isRead: true })));
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === "all" || 
      (filter === "unread" && !alert.isRead) || 
      (filter === "read" && alert.isRead);
    
    const matchesSearch = searchTerm === "" || 
      alert.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Alert Center</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search alerts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter(a => !a.isRead).length}</p>
              </div>
              <BellOff className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Telegram Sent</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.isTelegramSent).length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 flex items-center justify-between ${!alert.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                  <div className="flex items-center gap-4">
                    {!alert.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {alert.strategy}
                        <Badge variant="secondary">{alert.symbol}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {alert.time} • ${alert.price}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={alert.type.includes("Buy") ? "default" : "destructive"}>
                      {alert.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {alert.isTelegramSent ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Sent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          Pending
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => markAsRead(alert.id)}
                        disabled={alert.isRead}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No alerts found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Alerts;