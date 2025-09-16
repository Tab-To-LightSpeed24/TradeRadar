"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

const fetchMarketStatus = async () => {
  const { data, error } = await supabase.functions.invoke("market-status");

  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

export const MarketStatus = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["marketStatus"],
    queryFn: fetchMarketStatus,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 50000,
  });

  if (isLoading) {
    return <Skeleton className="h-6 w-28" />;
  }

  if (isError) {
    console.error("Failed to fetch market status:", error);
    return <Badge variant="destructive">Status Unavailable</Badge>;
  }

  const isMarketOpen = data?.status === "Open";

  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-3 w-3`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMarketOpen ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isMarketOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </span>
      <span className="text-sm font-medium">
        Market is currently {data?.status || "Unknown"}
      </span>
    </div>
  );
};