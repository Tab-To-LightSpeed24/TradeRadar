"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Strategy } from "@/pages/Strategies";
import { toast } from "sonner";

interface StrategyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyData: any) => void;
  strategy: Strategy | null;
}

export const StrategyEditor = ({ isOpen, onClose, onSave, strategy }: StrategyEditorProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeframe, setTimeframe] = useState("15m");
  const [symbols, setSymbols] = useState("");
  const [status, setStatus] = useState<'running' | 'stopped'>('stopped');

  useEffect(() => {
    if (strategy) {
      setName(strategy.name);
      setDescription(strategy.description);
      setTimeframe(strategy.timeframe);
      setSymbols(Array.isArray(strategy.symbols) ? strategy.symbols.join(", ") : "");
      setStatus(strategy.status === 'running' ? 'running' : 'stopped');
    } else {
      // Reset form for new strategy
      setName("");
      setDescription("");
      setTimeframe("15m");
      setSymbols("");
      setStatus('stopped');
    }
  }, [strategy, isOpen]);

  const handleSaveClick = () => {
    if (!name || !description) {
      toast.warning("Please fill in the strategy name and description.");
      return;
    }
    onSave({
      name,
      description,
      timeframe,
      symbols: symbols.split(",").map(s => s.trim()).filter(s => s),
      status,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit Strategy" : "Create New Strategy"}</DialogTitle>
          <DialogDescription>
            Define your trading strategy using plain English and technical parameters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="strategy-name">Strategy Name</Label>
            <Input 
              id="strategy-name" 
              placeholder="e.g., Bullish Breakout" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategy-description">Description (Plain English)</Label>
            <Textarea 
              id="strategy-description" 
              placeholder="Describe your strategy..." 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label htmlFor="symbols">Symbols</Label>
              <Input 
                id="symbols" 
                placeholder="e.g., AAPL, MSFT" 
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveClick}>Save Strategy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};