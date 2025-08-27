"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Copy, 
  Edit, 
  Trash2,
  Plus,
  Settings
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const Strategies = () => {
  const [strategies, setStrategies] = useState([
    {
      id: 1,
      name: "Bullish Breakout",
      description: "Buy when price breaks above 20-day high with volume spike",
      status: "running",
      timeframe: "15m",
      symbols: ["AAPL", "MSFT", "GOOGL"],
      winRate: 68,
      pnl: 1250
    },
    {
      id: 2,
      name: "Mean Reversion",
      description: "Sell oversold RSI(2) < 10 with bullish divergence",
      status: "stopped",
      timeframe: "1h",
      symbols: ["TSLA", "NVDA"],
      winRate: 52,
      pnl: -250
    },
    {
      id: 3,
      name: "Volatility Breakout",
      description: "Enter long when volatility expands beyond 20-day average",
      status: "degraded",
      timeframe: "5m",
      symbols: ["AMZN", "META"],
      winRate: 75,
      pnl: 890
    }
  ]);

  const [showCreator, setShowCreator] = useState(false);
  const [newStrategy, setNewStrategy] = useState({
    name: "",
    description: "",
    timeframe: "15m",
    symbols: "",
    indicators: [] as string[]
  });

  const toggleStrategy = (id: number) => {
    setStrategies(strategies.map(strategy => 
      strategy.id === id 
        ? { ...strategy, status: strategy.status === "running" ? "stopped" : "running" }
        : strategy
    ));
  };

  const cloneStrategy = (id: number) => {
    const strategyToClone = strategies.find(s => s.id === id);
    if (strategyToClone) {
      const newStrategy = {
        ...strategyToClone,
        id: Math.max(...strategies.map(s => s.id)) + 1,
        name: `${strategyToClone.name} (Copy)`,
        status: "stopped"
      };
      setStrategies([...strategies, newStrategy]);
    }
  };

  const deleteStrategy = (id: number) => {
    setStrategies(strategies.filter(strategy => strategy.id !== id));
  };

  const handleCreateStrategy = () => {
    if (newStrategy.name && newStrategy.description) {
      const strategy = {
        id: Math.max(...strategies.map(s => s.id), 0) + 1,
        name: newStrategy.name,
        description: newStrategy.description,
        status: "stopped",
        timeframe: newStrategy.timeframe,
        symbols: newStrategy.symbols.split(",").map(s => s.trim()).filter(s => s),
        winRate: 0,
        pnl: 0
      };
      setStrategies([...strategies, strategy]);
      setNewStrategy({
        name: "",
        description: "",
        timeframe: "15m",
        symbols: "",
        indicators: []
      });
      setShowCreator(false);
    }
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
        <h1 className="text-3xl font-bold">Trading Strategies</h1>
        <Button onClick={() => setShowCreator(!showCreator)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {showCreator ? "Cancel" : "New Strategy"}
        </Button>
      </div>

      {/* Strategy Creator */}
      {showCreator && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-name">Strategy Name</Label>
              <Input 
                id="strategy-name" 
                placeholder="e.g., Bullish Breakout" 
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({...newStrategy, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="strategy-description">Description (Plain English)</Label>
              <Textarea 
                id="strategy-description" 
                placeholder="Describe your strategy in plain English. Example: Buy when price breaks above 20-day high with volume spike" 
                rows={3}
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({...newStrategy, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select 
                  value={newStrategy.timeframe}
                  onValueChange={(value) => setNewStrategy({...newStrategy, timeframe: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="symbols">Symbols (comma separated)</Label>
                <Input 
                  id="symbols" 
                  placeholder="e.g., AAPL, MSFT, GOOGL" 
                  value={newStrategy.symbols}
                  onChange={(e) => setNewStrategy({...newStrategy, symbols: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <Switch id="preview-mode" />
                <Label htmlFor="preview-mode">Enable Preview Mode</Label>
              </div>
              <Button onClick={handleCreateStrategy}>
                Create Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Cards */}
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
              <div className="flex flex-wrap gap-1 mb-4">
                {strategy.symbols.map((symbol, index) => (
                  <Badge key={index} variant="secondary">{symbol}</Badge>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div>
                  <span className="font-medium">Timeframe:</span> {strategy.timeframe}
                </div>
                <div>
                  <span className="font-medium">Win Rate:</span> {strategy.winRate}%
                </div>
                <div>
                  <span className="font-medium">P&L:</span> 
                  <span className={strategy.pnl >= 0 ? "text-green-500 ml-1" : "text-red-500 ml-1"}>
                    ${strategy.pnl}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => toggleStrategy(strategy.id)}
                  >
                    {strategy.status === "running" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => cloneStrategy(strategy.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => deleteStrategy(strategy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Strategies;