"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  Bell,
  Settings
} from "lucide-react";

const Dashboard = () => {
  const [strategies, setStrategies] = useState([
    {
      id: 1,
      name: "Bullish Breakout",
      description: "Buy when price breaks above 20-day high with volume spike",
      status: "running",
      alertsToday: 3,
      winRate: 68,
      pnl: 1250
    },
    {
      id: 2,
      name: "Mean Reversion",
      description: "Sell oversold RSI(2) < 10 with bullish divergence",
      status: "stopped",
      alertsToday: 0,
      winRate: 52,
      pnl: -250
    },
    {
      id: 3,
      name: "Volatility Breakout",
      description: "Enter long when volatility expands beyond 20-day average",
      status: "degraded",
      alertsToday: 1,
      winRate: 75,
      pnl: 890
    }
  ]);

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      strategy: "Bullish Breakout",
      symbol: "AAPL",
      time: "2 min ago",
      price: 172.45,
      type: "Buy Signal",
      isRead: false
    },
    {
      id: 2,
      strategy: "Volatility Breakout", 
      symbol: "TSLA",
      time: "15 min ago",
      price: 245.30,
      type: "Sell Signal",
      isRead: true
    }
  ]);

  const toggleStrategy = (id: number) => {
    setStrategies(strategies.map(strategy => 
      strategy.id === id 
        ? { ...strategy, status: strategy.status === "running" ? "stopped" : "running" }
        : strategy
    ));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "running": return "bg-green-500";
      case "stopped": return "bg-red-500";
      case "degraded": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "running": return "Running";
      case "stopped": return "Stopped";
      case "degraded": return "Degraded";
      default: return "Unknown";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Strategies</p>
                <p className="text-2xl font-bold">2/3</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Alerts</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">62%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">P&L (30d)</p>
                <p className="text-2xl font-bold text-green-500">+$2,140</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Cards */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Trading Strategies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <Badge className={`${getStatusColor(strategy.status)} text-white`}>
                    {getStatusText(strategy.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{strategy.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">
                    <span className="font-medium">Alerts today:</span> {strategy.alertsToday}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Win rate:</span> {strategy.winRate}%
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="font-medium">P&L:</span> 
                    <span className={strategy.pnl >= 0 ? "text-green-500 ml-1" : "text-red-500 ml-1"}>
                      ${strategy.pnl}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => toggleStrategy(strategy.id)}
                    className={strategy.status === "running" ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    {strategy.status === "running" ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Start
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Alerts</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{alert.strategy}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.symbol} • {alert.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">${alert.price}</div>
                      <div className="text-sm text-muted-foreground">{alert.type}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Chart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;