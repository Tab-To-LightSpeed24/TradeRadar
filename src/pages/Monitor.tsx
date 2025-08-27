"use client";

import { useState, useEffect } from "react";
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
import TradingViewChart from "@/components/TradingViewChart"; // Import the new chart component
import { CandlestickData, Time } from "lightweight-charts";

// Helper function to generate dummy candlestick data
const generateDummyCandlestickData = (
  symbol: string,
  timeframe: string,
  count: number = 100
): CandlestickData[] => {
  const data: CandlestickData[] = [];
  let lastClose = 100;
  let time = Date.now() / 1000; // Current time in seconds

  // Adjust time step based on timeframe
  let timeStep = 60; // 1 minute in seconds
  if (timeframe === "5m") timeStep = 5 * 60;
  if (timeframe === "15m") timeStep = 15 * 60;
  if (timeframe === "1h") timeStep = 60 * 60;
  if (timeframe === "4h") timeStep = 4 * 60 * 60;
  if (timeframe === "1d") timeStep = 24 * 60 * 60;

  for (let i = 0; i < count; i++) {
    const open = lastClose * (1 + (Math.random() - 0.5) * 0.02);
    const close = open * (1 + (Math.random() - 0.5) * 0.03);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    data.unshift({
      time: (time - i * timeStep) as Time, // Go backwards in time
      open,
      high,
      low,
      close,
    });
    lastClose = close;
  }
  return data;
};

const Monitor = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1h");
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
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

  useEffect(() => {
    fetchMarketData();
  }, [selectedSymbol, timeframe]);

  const fetchMarketData = () => {
    console.log(`Fetching data for ${selectedSymbol} with timeframe ${timeframe}`);
    // Simulate data fetch
    const newChartData = generateDummyCandlestickData(selectedSymbol, timeframe);
    setChartData(newChartData);

    const latestCandle = newChartData[newChartData.length - 1];
    if (latestCandle) {
      const price = latestCandle.close;
      const prevClose = newChartData[newChartData.length - 2]?.close || latestCandle.open;
      const change = price - prevClose;
      const changePercent = (change / prevClose) * 100;

      setMarketData({
        price: parseFloat(price.toFixed(2)),
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2) + "%",
        volume: (Math.random() * 100).toFixed(1) + "M",
        high: parseFloat(latestCandle.high.toFixed(2)),
        low: parseFloat(latestCandle.low.toFixed(2)),
        open: parseFloat(latestCandle.open.toFixed(2)),
        close: parseFloat(latestCandle.close.toFixed(2)),
      });
    }
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

      {/* Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Chart for {selectedSymbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <TradingViewChart 
              data={chartData} 
              timeframe={timeframe} 
              symbol={selectedSymbol} 
              className="h-full"
            />
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