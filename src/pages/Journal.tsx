"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  Download,
  Upload,
  Filter,
  Edit,
  Trash2,
  Loader2
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  entry_time: string | null;
  exit_time: string | null;
  entry_price: number | null;
  exit_price: number | null;
  size: number | null;
  pnl: number | null;
  strategy: string | null;
  notes: string | null;
  created_at: string;
}

const Journal = () => {
  const { user, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [newTrade, setNewTrade] = useState({
    symbol: "",
    entry_time: "",
    exit_time: "",
    entry_price: "",
    exit_price: "",
    size: "",
    pnl: "",
    strategy: "",
    notes: ""
  });

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data as Trade[]);
    } catch (error: any) {
      toast.error("Failed to fetch trades:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchTrades();
    }
  }, [authLoading, fetchTrades]);

  const handleAddTrade = async () => {
    if (!user) {
      toast.error("You must be logged in to add a trade.");
      return;
    }
    if (newTrade.symbol && newTrade.entry_time) {
      try {
        const tradeData = {
          user_id: user.id,
          symbol: newTrade.symbol,
          entry_time: newTrade.entry_time || null,
          exit_time: newTrade.exit_time || null,
          entry_price: newTrade.entry_price ? parseFloat(newTrade.entry_price) : null,
          exit_price: newTrade.exit_price ? parseFloat(newTrade.exit_price) : null,
          size: newTrade.size ? parseInt(newTrade.size) : null,
          pnl: newTrade.pnl ? parseFloat(newTrade.pnl) : null,
          strategy: newTrade.strategy || null,
          notes: newTrade.notes || null,
        };
        const { error } = await supabase.from('trades').insert([tradeData]);
        if (error) throw error;

        toast.success("Trade logged successfully!");
        fetchTrades();
        setNewTrade({
          symbol: "", entry_time: "", exit_time: "", entry_price: "",
          exit_price: "", size: "", pnl: "", strategy: "", notes: ""
        });
        setShowTradeModal(false);
      } catch (error: any) {
        toast.error("Failed to log trade:", error.message);
      }
    } else {
      toast.warning("Please fill in at least the symbol and entry time.");
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
      toast.success("Trade deleted.");
      setTrades(trades.filter(trade => trade.id !== id));
    } catch (error: any) {
      toast.error("Failed to delete trade:", error.message);
    }
  };

  const filteredTrades = trades.filter(trade => {
    const matchesFilter = filter === "all" || 
      (filter === "winners" && (trade.pnl || 0) > 0) || 
      (filter === "losers" && (trade.pnl || 0) < 0);
    
    const matchesSearch = searchTerm === "" || 
      trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trade.strategy && trade.strategy.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-muted-foreground">You need to be logged in to manage your trade journal.</p>
      </div>
    );
  }

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
                  <Label htmlFor="symbol" className="text-right">Symbol</Label>
                  <Input id="symbol" value={newTrade.symbol} onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="entry-time" className="text-right">Entry Time</Label>
                  <Input id="entry-time" type="datetime-local" value={newTrade.entry_time} onChange={(e) => setNewTrade({...newTrade, entry_time: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="exit-time" className="text-right">Exit Time</Label>
                  <Input id="exit-time" type="datetime-local" value={newTrade.exit_time} onChange={(e) => setNewTrade({...newTrade, exit_time: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="entry-price" className="text-right">Entry Price</Label>
                  <Input id="entry-price" type="number" value={newTrade.entry_price} onChange={(e) => setNewTrade({...newTrade, entry_price: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="exit-price" className="text-right">Exit Price</Label>
                  <Input id="exit-price" type="number" value={newTrade.exit_price} onChange={(e) => setNewTrade({...newTrade, exit_price: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="size" className="text-right">Size</Label>
                  <Input id="size" type="number" value={newTrade.size} onChange={(e) => setNewTrade({...newTrade, size: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pnl" className="text-right">P&L</Label>
                  <Input id="pnl" type="number" value={newTrade.pnl} onChange={(e) => setNewTrade({...newTrade, pnl: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="strategy" className="text-right">Strategy</Label>
                  <Input id="strategy" value={newTrade.strategy} onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">Notes</Label>
                  <Textarea id="notes" value={newTrade.notes} onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddTrade}>Save Trade</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="flex items-center gap-2"><Download className="w-4 h-4" />Export</Button>
          <Button variant="outline" className="flex items-center gap-2"><Upload className="w-4 h-4" />Import</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card><CardContent className="pt-6"><div><p className="text-sm text-muted-foreground">Total Trades</p><p className="text-2xl font-bold">{totalTrades}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-sm text-muted-foreground">Win Rate</p><p className="text-2xl font-bold">{winRate}%</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-sm text-muted-foreground">Total P&L</p><p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>${totalPnL.toFixed(2)}</p></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div><p className="text-sm text-muted-foreground">Avg. Trade</p><p className={`text-2xl font-bold ${totalTrades > 0 && (totalPnL / totalTrades) >= 0 ? "text-green-500" : "text-red-500"}`}>${(totalTrades > 0 ? (totalPnL / totalTrades).toFixed(2) : "0.00")}</p></div></CardContent></Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1"><Input placeholder="Search trades..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  <SelectItem value="winners">Winners</SelectItem>
                  <SelectItem value="losers">Losers</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader><CardTitle>Trade History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-64" /></div>
                  <div className="flex items-center gap-6"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-20" /></div>
                </div>
              ))
            ) : filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => (
                <div key={trade.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">{trade.symbol}<Badge variant="secondary">{trade.strategy}</Badge></div>
                    <div className="text-sm text-muted-foreground">{trade.entry_time} → {trade.exit_time}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-medium">{trade.size} @ ${trade.entry_price} → ${trade.exit_price}</div>
                      <div className={`font-medium ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>${(trade.pnl || 0).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTrade(trade.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">No trades found matching your criteria</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Journal;