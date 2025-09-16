"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  Target,
  BookOpen,
  Percent,
  DollarSign,
  BarChart
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Papa from "papaparse";

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

const initialFormState = {
  symbol: "",
  entry_time: "",
  exit_time: "",
  entry_price: "",
  exit_price: "",
  size: "",
  pnl: "",
  strategy: "",
  notes: ""
};

const Journal = () => {
  const { user, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleOpenModal = (trade: Trade | null) => {
    setEditingTrade(trade);
    if (trade) {
      setFormData({
        symbol: trade.symbol || "",
        entry_time: trade.entry_time ? trade.entry_time.substring(0, 16) : "",
        exit_time: trade.exit_time ? trade.exit_time.substring(0, 16) : "",
        entry_price: trade.entry_price?.toString() || "",
        exit_price: trade.exit_price?.toString() || "",
        size: trade.size?.toString() || "",
        pnl: trade.pnl?.toString() || "",
        strategy: trade.strategy || "",
        notes: trade.notes || "",
      });
    } else {
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSaveTrade = async () => {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }
    if (!formData.symbol || !formData.entry_time) {
      toast.warning("Please fill in at least the symbol and entry time.");
      return;
    }

    const tradeData = {
      user_id: user.id,
      symbol: formData.symbol,
      entry_time: formData.entry_time || null,
      exit_time: formData.exit_time || null,
      entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
      exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
      size: formData.size ? parseInt(formData.size) : null,
      pnl: formData.pnl ? parseFloat(formData.pnl) : null,
      strategy: formData.strategy || null,
      notes: formData.notes || null,
    };

    try {
      if (editingTrade) {
        const { error } = await supabase.from('trades').update(tradeData).eq('id', editingTrade.id);
        if (error) throw error;
        toast.success("Trade updated successfully!");
      } else {
        const { error } = await supabase.from('trades').insert([tradeData]);
        if (error) throw error;
        toast.success("Trade logged successfully!");
      }
      fetchTrades();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(`Failed to save trade: ${error.message}`);
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

  const analytics = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnl: 0,
        bestStrategy: { name: "N/A", pnl: 0 },
        bestSymbol: { name: "N/A", pnl: 0 },
      };
    }

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const avgPnl = totalTrades > 0 ? totalPnL / totalTrades : 0;

    const strategyPnl = trades.reduce((acc, trade) => {
      const strategyName = trade.strategy || "Uncategorized";
      acc[strategyName] = (acc[strategyName] || 0) + (trade.pnl || 0);
      return acc;
    }, {} as Record<string, number>);

    const symbolPnl = trades.reduce((acc, trade) => {
      const symbolName = trade.symbol || "Unknown";
      acc[symbolName] = (acc[symbolName] || 0) + (trade.pnl || 0);
      return acc;
    }, {} as Record<string, number>);

    const bestStrategyName = Object.keys(strategyPnl).reduce((a, b) => strategyPnl[a] > strategyPnl[b] ? a : b, "N/A");
    const bestSymbolName = Object.keys(symbolPnl).reduce((a, b) => symbolPnl[a] > symbolPnl[b] ? a : b, "N/A");

    return {
      totalTrades,
      winningTrades,
      winRate,
      totalPnL,
      avgPnl,
      bestStrategy: { name: bestStrategyName, pnl: strategyPnl[bestStrategyName] || 0 },
      bestSymbol: { name: bestSymbolName, pnl: symbolPnl[bestSymbolName] || 0 },
    };
  }, [trades]);

  const handleExport = () => {
    if (filteredTrades.length === 0) {
      toast.info("No trades to export.");
      return;
    }

    const dataToExport = filteredTrades.map(trade => ({
      Symbol: trade.symbol,
      'Entry Time': trade.entry_time ? new Date(trade.entry_time).toLocaleString() : '',
      'Exit Time': trade.exit_time ? new Date(trade.exit_time).toLocaleString() : '',
      'Entry Price': trade.entry_price,
      'Exit Price': trade.exit_price,
      Size: trade.size,
      'P&L': trade.pnl,
      Strategy: trade.strategy,
      Notes: trade.notes,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `traderadar_trades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Trades exported successfully!");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const loadingToast = toast.loading("Importing trades...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const tradesToImport = results.data.map((row: any) => {
            if (!row['Symbol'] || !row['Entry Time']) return null;
            return {
              user_id: user.id,
              symbol: row['Symbol'],
              entry_time: row['Entry Time'] ? new Date(row['Entry Time']).toISOString() : null,
              exit_time: row['Exit Time'] ? new Date(row['Exit Time']).toISOString() : null,
              entry_price: row['Entry Price'] ? parseFloat(row['Entry Price']) : null,
              exit_price: row['Exit Price'] ? parseFloat(row['Exit Price']) : null,
              size: row['Size'] ? parseInt(row['Size']) : null,
              pnl: row['P&L'] ? parseFloat(row['P&L']) : null,
              strategy: row['Strategy'] || null,
              notes: row['Notes'] || null,
            };
          }).filter(Boolean);

          if (tradesToImport.length === 0) {
            toast.warning("No valid trades found in the file to import.");
            return;
          }

          const { error } = await supabase.from('trades').insert(tradesToImport);
          if (error) throw error;

          toast.success(`${tradesToImport.length} trades imported successfully!`);
          fetchTrades();
        } catch (error: any) {
          toast.error(`Import failed: ${error.message}`);
        } finally {
          toast.dismiss(loadingToast);
          if (event.target) event.target.value = '';
        }
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
        toast.dismiss(loadingToast);
      }
    });
  };

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
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenModal(null)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTrade ? "Edit Trade" : "Log New Trade"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="symbol" className="text-right">Symbol</Label><Input id="symbol" value={formData.symbol} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="entry_time" className="text-right">Entry Time</Label><Input id="entry_time" type="datetime-local" value={formData.entry_time} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="exit_time" className="text-right">Exit Time</Label><Input id="exit_time" type="datetime-local" value={formData.exit_time} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="entry_price" className="text-right">Entry Price</Label><Input id="entry_price" type="number" value={formData.entry_price} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="exit_price" className="text-right">Exit Price</Label><Input id="exit_price" type="number" value={formData.exit_price} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="size" className="text-right">Size</Label><Input id="size" type="number" value={formData.size} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="pnl" className="text-right">P&L</Label><Input id="pnl" type="number" value={formData.pnl} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="strategy" className="text-right">Strategy</Label><Input id="strategy" value={formData.strategy} onChange={handleInputChange} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="notes" className="text-right">Notes</Label><Textarea id="notes" value={formData.notes} onChange={handleInputChange} className="col-span-3" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSaveTrade}>Save Trade</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}><Download className="w-4 h-4" />Export</Button>
          <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
          <Button variant="outline" className="flex items-center gap-2" onClick={handleImportClick}><Upload className="w-4 h-4" />Import</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Trades</CardTitle><BookOpen className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.totalTrades}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Win Rate</CardTitle><Percent className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.winRate}%</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total P&L</CardTitle><DollarSign className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className={`text-2xl font-bold ${analytics.totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>${analytics.totalPnL.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Trade P&L</CardTitle><BarChart className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className={`text-2xl font-bold ${analytics.avgPnl >= 0 ? "text-green-500" : "text-red-500"}`}>${analytics.avgPnl.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Best Strategy</CardTitle><TrendingUp className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-lg font-bold">{analytics.bestStrategy.name}</p><p className={`text-sm font-medium ${analytics.bestStrategy.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>${analytics.bestStrategy.pnl.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Best Symbol</CardTitle><Target className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-lg font-bold">{analytics.bestSymbol.name}</p><p className={`text-sm font-medium ${analytics.bestSymbol.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>${analytics.bestSymbol.pnl.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <div className="pt-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1"><Input placeholder="Search trades..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="winners">Winners</SelectItem><SelectItem value="losers">Losers</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:grid md:grid-cols-12 p-4 border-b font-medium text-sm text-muted-foreground">
            <div className="col-span-3">Symbol / Strategy</div>
            <div className="col-span-3">Entry / Exit Time</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2 text-right">P&L</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {loading ? (
              [...Array(3)].map((_, i) => (<div key={i} className="p-4"><Skeleton className="h-8 w-full" /></div>))
            ) : filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => (
                <div key={trade.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-y-2 items-center">
                  <div className="md:col-span-3">
                    <div className="font-medium flex items-center gap-2">{trade.symbol}<Badge variant="secondary">{trade.strategy}</Badge></div>
                  </div>
                  <div className="md:col-span-3 text-sm text-muted-foreground">
                    {trade.entry_time ? new Date(trade.entry_time).toLocaleString() : ''} → {trade.exit_time ? new Date(trade.exit_time).toLocaleString() : ''}
                  </div>
                  <div className="md:col-span-2 text-sm text-muted-foreground">
                    <span className="md:hidden font-medium text-foreground">Size: </span>
                    {trade.size} @ ${trade.entry_price}
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <div className={`font-medium ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>${(trade.pnl || 0).toFixed(2)}</div>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 md:justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(trade)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTrade(trade.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold">Your Journal is Empty</h3>
                <p>Log your first trade to start analyzing your performance.</p>
                <Button variant="secondary" className="mt-4" onClick={() => handleOpenModal(null)}>
                  Add First Trade
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Journal;