"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Define the type for a strategy
interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'degraded';
  timeframe: string;
  symbols: string[];
  created_at: string;
}

const Strategies = () => {
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [newStrategy, setNewStrategy] = useState({
    name: "",
    description: "",
    timeframe: "15m",
    symbols: "",
  });

  const fetchStrategies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data as Strategy[]);
    } catch (error: any) {
      toast.error("Failed to fetch strategies:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchStrategies();
    }
  }, [authLoading, fetchStrategies]);

  const toggleStrategy = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running";
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Strategy ${newStatus === 'running' ? 'started' : 'stopped'}.`);
      fetchStrategies();
    } catch (error: any) {
      toast.error("Failed to update strategy status:", error.message);
    }
  };

  const cloneStrategy = async (strategyToClone: Strategy) => {
    try {
      const { name, description, timeframe, symbols } = strategyToClone;
      const newStrategyData = {
        user_id: user!.id,
        name: `${name} (Copy)`,
        description,
        timeframe,
        symbols,
        status: 'stopped'
      };

      const { error } = await supabase.from('strategies').insert([newStrategyData]);
      if (error) throw error;

      toast.success("Strategy cloned successfully.");
      fetchStrategies();
    } catch (error: any) {
      toast.error("Failed to clone strategy:", error.message);
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      const { error } = await supabase.from('strategies').delete().eq('id', id);
      if (error) throw error;
      toast.success("Strategy deleted.");
      setStrategies(strategies.filter(strategy => strategy.id !== id));
    } catch (error: any) {
      toast.error("Failed to delete strategy:", error.message);
    }
  };

  const handleCreateStrategy = async () => {
    if (!user) {
      toast.error("You must be logged in to create a strategy.");
      return;
    }
    if (newStrategy.name && newStrategy.description) {
      try {
        const strategyData = {
          user_id: user.id,
          name: newStrategy.name,
          description: newStrategy.description,
          status: "stopped",
          timeframe: newStrategy.timeframe,
          symbols: newStrategy.symbols.split(",").map(s => s.trim()).filter(s => s),
        };
        const { error } = await supabase.from('strategies').insert([strategyData]);
        if (error) throw error;

        toast.success("Strategy created successfully!");
        fetchStrategies();
        setNewStrategy({ name: "", description: "", timeframe: "15m", symbols: "" });
        setShowCreator(false);
      } catch (error: any) {
        toast.error("Failed to create strategy:", error.message);
      }
    } else {
      toast.warning("Please fill in the strategy name and description.");
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
        <p className="text-muted-foreground">You need to be logged in to manage your trading strategies.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trading Strategies</h1>
        <Button onClick={() => setShowCreator(!showCreator)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {showCreator ? "Cancel" : "New Strategy"}
        </Button>
      </div>

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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : strategies.length > 0 ? (
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
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => toggleStrategy(strategy.id, strategy.status)}
                    >
                      {strategy.status === "running" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => cloneStrategy(strategy)}
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
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">No Strategies Found</h3>
          <p className="text-muted-foreground mt-2">Click "New Strategy" to create your first one.</p>
        </div>
      )}
    </div>
  );
};

export default Strategies;