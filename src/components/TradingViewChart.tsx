"use client";

import React, aimport { useEffect, useRef } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { cn } from '@/lib/utils';

interface TradingViewChartProps {
  data: LightweightCharts.CandlestickData[];
  timeframe: string;
  symbol: string;
  className?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ data, timeframe, symbol, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightCharts.IChartApi | null>(null);
  const candlestickSeriesRef = useRef<LightweightCharts.ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = {
      layout: {
        textColor: 'hsl(var(--foreground))',
        background: { type: 'solid' as const, color: 'hsl(var(--background))' },
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
    };

    const chart = LightweightCharts.createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: 'hsl(142.1 76.2% 36.3%)', // green-500
      downColor: 'hsl(0 84.2% 60.2%)', // destructive
      borderVisible: false,
      wickUpColor: 'hsl(142.1 76.2% 36.3%)',
      wickDownColor: 'hsl(0 84.2% 60.2%)',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Set initial data
    candlestickSeries.setData(data);

    // Adjust chart to fit data
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData(data);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]); // Update data when `data` prop changes

  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    }
  }, [className]); // Re-apply options if className changes (e.g., for dynamic sizing)

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-full", className)}
      title={`${symbol} - ${timeframe} Chart`}
    />
  );
};

export default TradingViewChart;