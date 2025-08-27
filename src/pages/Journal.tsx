"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  Download,
  Upload,
  Filter,
  Search,
  Edit,
  Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Journal = () => {
  const [trades, setTrades] = useState([
    {
      id: 1,
      symbol: "AAPL",
      entryTime: "2023-06-15 09:32:15",
      exitTime: "2023-06-15 10:15:30",
      entryPrice: 172.45,
      exitPrice: 175.80,
      size: 100,
      pnl: 335.00,
      strategy: "Bullish Breakout",
      notes: "Strong volume breakout after consolidation"
    },
    {
      id: 2,
      symbol: "TSLA",
      entryTime: "2023-06-15 08:45:30",
      exitTime: "2023-06-15 09:20:45",
      entryPrice: 245.30,
      exitPrice: 242.15,
      size: 50,
      pnl: -157.50,
      strategy: "Volatility Breakout",
      notes: "False breakout, should have waited for confirmation"
    }
  ]);

  const [showTradeModal, setShowTradeModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [newTrade, setNewTrade] = useState({
    symbol: "",
    entryTime: "",
    exitTime: "",
    entryPrice: "",
    exitPrice: "",
    size: "",
    pnl: "",
    strategy: "",
    notes: ""
  });

  const handleAddTrade = () => {
    if (newTrade.symbol && newTrade.entryTime) {
      const trade = {
        id: Math.max(...trades.map(t => t.id), 0) + 1,
        ...newTrade,
        entryPrice: parseFloat(newTrade.entryPrice) || 0,
        exitPrice: parseFloat(newTrade.exitPrice) || 0,
        size: parseInt(newTrade.size) || 0,
        pnl: parseFloat(newTrade.pnl) || 0
      };
      setTrades([...trades, trade as any]);
      setNewTrade({
        symbol: "",
        entryTime: "",
        exitTime: "",
        entryPrice: "",
        exitPrice: "",
        size: "",
        pnl: "",
        strategy: "",
        notes: ""
      });
      setShowTradeModal(false);
    }
  };

  const deleteTrade = (id: number) => {
    setTrades(trades.filter(trade => trade.id !== id));
  };

  const filteredTrades = trades.filter(trade => {
    const matchesFilter = filter === "all" || 
      (filter === "winners" && trade.pnl > 0) || 
      (filter === "losers" && trade.pnl < 0);
    
    const matchesSearch = searchTerm === "" || 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.strategy.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Calculate summary stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trade Journal</h1>
        <div className="flex gap-2">
          <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log New Trade</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">
                    Symbol
                  </Label>
                  <Input
                    id="symbol"
                    value={newTrade.symbol}
                    onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="entry-time" className="text-right">
                    Entry Time
                  </Label>
                  <Input
                    id="entry-time"
                    type="datetime-local"
                    value={newTrade.entryTime}
                    onChange={(e) => setNewTrade({...newTrade, entryTime: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="exit-time" className="text-right">
                    Exit Time
                  </Label>
                  <Input
                    id="exit-time"
                    type="datetime-local"
                    value={newTrade.exitTime}
                    onChange={(e) => setNewTrade({...newTrade, exitTime: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="entry-price" className="text-right">
                    Entry Price
                  </Label>
                  <Input
                    id="entry-price"
                    type="number"
                    value={newTrade.entryPrice}
                    onChange={(e) => setNewTrade({...newTrade, entryPrice: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="exit-price" className="text-right">
                    Exit Price
                  </Label>
                  <Input
                    id="exit-price"
                    type="number"
                    value={newTrade.exitPrice}
                    onChange={(e) => setNewTrade({...newTrade, exitPrice: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="size" className="text-right">
                    Size
                  </Label>
                  <Input
                    id="size"
                    type="number"
                    value={newTrade.size}
                    onChange={(e) => setNewTrade({...newTrade, size: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pnl" className="text-right">
                    P&L
                  </Label>
                  <Input
                    id="pnl"
                    type="number"
                    value={newTrade.pnl}
                    onChange={(e) => setNewTrade({...newTrade, pnl: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="strategy" className="text-right">
                    Strategy
                  </Label>
                  <Input
                    id="strategy"
                    value={newTrade.strategy}
                    onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={newTrade.notes}
                    onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddTrade}>Save Trade</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{winRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${totalPnL.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Trade</p>
                <p className={`text-2xl font-bold ${totalTrades > 0 && (totalPnL / totalTrades) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  ${(totalTrades > 0 ? (totalPnL / totalTrades).toFixed(2) : "0.00")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search trades..." 
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
                  <SelectItem value="all">All Trades</SelectItem>
                  <SelectItem value="winners">Winners</SelectItem>
                  <SelectItem value="losers">Losers</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => (
                <div key={trade.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {trade.symbol}
                      <Badge variant="secondary">{trade.strategy}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {trade.entryTime} → {trade.exitTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-medium">
                        {trade.size} @ ${trade.entryPrice} → ${trade.exitPrice}
                      </div>
                      <div className={`font-medium ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${trade.pnl.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteTrade(trade.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No trades found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Journal;