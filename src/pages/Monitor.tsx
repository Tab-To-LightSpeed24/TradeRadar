"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, LineChart, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Monitor = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1h");
  const [chartData, setChartData] = useState([]); // This would be populated by real-time data
  const [marketData, setMarketData] = useState({
    price: 172.45,
    change: "+1.20",
    changePercent: "+0.70%",
    volume: "50.2M",
    high: 173.00,
    low: 171.50,
    open: 171.80,
    close: 172.45,
  });

  // Placeholder for fetching data - this would integrate with Finnhub/WebSockets
  const fetchMarketData = () => {
    console.log(`Fetching data for ${selectedSymbol} with timeframe ${timeframe}`);
    // Simulate data fetch
    setMarketData({
      price: (Math.random() * 100 + 150).toFixed(2),
      change: (Math.random() * 5 - 2.5).toFixed(2),
      changePercent: (Math.random() * 2 - 1).toFixed(2) + "%",
      volume: (Math.random() * 100).toFixed(1) + "M",
      high: (Math.random() * 10 + 170).toFixed(2),
      low: (Math.random() * 5 + 165).toFixed(2),
      open: (Math.random() * 5 + 168).toFixed(2),
      close: (Math.random() * 5 + 170).toFixed(2),
    });
    // In a real app, this would fetch actual chart data
    setChartData([]); 
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Market Monitor</h1>
        <Button variant="outline" onClick={fetchMarketData} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Symbol and Timeframe Selection */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Label htmlFor="symbol-select" className="sr-only">Select Symbol</Label>
              <Input
                id="symbol-select"
                placeholder="Enter symbol (e.g., AAPL)"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="timeframe-select" className="sr-only">Select Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Timeframe" />
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
            <Button onClick={fetchMarketData} className="w-full md:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Load Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Market Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Price</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${marketData.price}</div>
            <p className={`text-xs ${parseFloat(marketData.change) >= 0 ? "text-green-500" : "text-red-500"}`}>
              {marketData.change} ({marketData.changePercent})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Volume</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketData.volume}</div>
            <p className="text-xs text-muted-foreground">Total shares traded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Range</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${marketData.low} - ${marketData.high}</div>
            <p className="text-xs text-muted-foreground">Open: ${marketData.open}, Close: ${marketData.close}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Chart for {selectedSymbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted flex items-center justify-center rounded-md text-muted-foreground">
            {/* This is where the TradingView Lightweight Chart would be integrated */}
            <p>TradingView Chart Placeholder</p>
          </div>
        </CardContent>
      </Card>

      {/* Other Market Data / News (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Related News & Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Real-time news and additional market data will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitor;