"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, LineChart, RefreshCw, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TradingViewChart from "@/components/TradingViewChart";
import { CandlestickData } from "lightweight-charts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Monitor = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1h");
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [marketData, setMarketData] = useState({
    price: 0,
    change: "0.00",
    changePercent: "0.00%",
    volume: "0",
    high: 0,
    low: 0,
    open: 0,
    close: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMarketData();
    }
  }, [user]); // Fetch data when user logs in

  const fetchMarketData = async () => {
    if (!user) {
      toast.error("Please log in to monitor market data.");
      return;
    }
    if (!selectedSymbol) {
      toast.error("Please enter a stock symbol.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const resolutionMap: { [key: string]: string } = {
      "5m": "5",
      "15m": "15",
      "1h": "60",
      "1d": "D",
    };
    const finnhubResolution = resolutionMap[timeframe];

    try {
      const { data, error: functionError } = await supabase.functions.invoke('finnhub-proxy', {
        body: { symbol: selectedSymbol, resolution: finnhubResolution },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);
      if (data.s !== 'ok' || !data.c) {
        throw new Error(`No data found for symbol ${selectedSymbol}. Please check the symbol and try again.`);
      }

      // Transform Finnhub data to CandlestickData format
      const transformedData: CandlestickData[] = data.t.map((timestamp: number, index: number) => ({
        time: timestamp,
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
      }));
      setChartData(transformedData);

      // Update market data stats from the latest candle
      if (transformedData.length > 0) {
        const latestCandle = transformedData[transformedData.length - 1];
        const prevCandle = transformedData[transformedData.length - 2] || latestCandle;
        const price = latestCandle.close;
        const change = price - prevCandle.close;
        const changePercent = (change / prevCandle.close) * 100;

        setMarketData({
          price: parseFloat(price.toFixed(2)),
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2) + "%",
          volume: data.v[data.v.length - 1].toLocaleString(),
          high: parseFloat(latestCandle.high.toFixed(2)),
          low: parseFloat(latestCandle.low.toFixed(2)),
          open: parseFloat(latestCandle.open.toFixed(2)),
          close: parseFloat(latestCandle.close.toFixed(2)),
        });
      }
      toast.success(`Market data for ${selectedSymbol} loaded successfully.`);
    } catch (err: any) {
      console.error("Error fetching market data:", err);
      const errorMessage = err.message || "An unknown error occurred.";
      setError(errorMessage);
      toast.error(`Failed to load data: ${errorMessage}`);
      setChartData([]); // Clear chart on error
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <div className="container mx-auto py-8 text-center">Loading authentication...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground">Please log in to use the Market Monitor.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Market Monitor</h1>
        <Button variant="outline" onClick={fetchMarketData} disabled={isLoading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchMarketData} disabled={isLoading} className="w-full md:w-auto">
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? "Loading..." : "Load Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Market Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
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
                <CardTitle className="text-sm font-medium">Volume</CardTitle>
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
                <p className="text-xs text-muted-foreground">Open: ${marketData.open}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Chart for {selectedSymbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 relative">
            {isLoading && <Skeleton className="absolute inset-0" />}
            {error && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="font-semibold">Could not load chart data.</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            <TradingViewChart 
              data={chartData} 
              timeframe={timeframe} 
              symbol={selectedSymbol} 
              className="h-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitor;