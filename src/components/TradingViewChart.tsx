"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface TradingViewChartProps {
  data: (CandlestickData<UTCTimestamp>)[];
  timeframe: string;
  symbol: string;
  className?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ data, timeframe, symbol, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Resolve CSS variables to actual colors by getting the computed style from the body.
    // This returns RGB values which are universally parsable.
    const computedStyle = getComputedStyle(document.body);
    const textColor = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;
    const borderColor = computedStyle.borderTopColor; // Any border side will do

    // Cleanup previous chart instance if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chartOptions = {
      layout: {
        textColor,
        background: { type: ColorType.Solid, color: backgroundColor },
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', // Tailwind green-500
      downColor: '#ef4444', // Tailwind red-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
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
  }, [theme]); // Re-create the chart when the theme changes

  useEffect(() => {
    if (candlestickSeriesRef.current && data) {
      candlestickSeriesRef.current.setData(data);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-full", className)}
      title={`${symbol} - ${timeframe} Chart`}
    />
  );
};

export default TradingViewChart;