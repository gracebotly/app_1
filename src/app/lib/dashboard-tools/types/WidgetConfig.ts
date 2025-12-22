/**
 * Unified widget configuration interface
 * Based on research from Appsmith and ChartBrew patterns
 * Replaces `structure?: any` throughout the codebase
 */

export interface WidgetConfig {
  id: string;
  type: "chart" | "table" | "stat" | "markdown";
  
  // Layout (inspired by ChartBrew's layout field)
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Chart-specific properties (type === "chart")
  chartType?: "line" | "bar" | "pie" | "area";
  data?: {
    series: Array<{
      name: string;
      data: Array<number | { x: string | number; y: number }>;
    }>;
  };
  xAxisName?: string;
  yAxisName?: string;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  showDataLabels?: boolean;
  
  // Table-specific properties (type === "table")
  columns?: Array<{
    field: string;
    label?: string;
    type?: string;
  }>;
  rows?: Array<Record<string, unknown>>;
  pageSize?: number;
  enableSearch?: boolean;
  enableSort?: boolean;
  
  // Stat/KPI-specific properties (type === "stat")
  label?: string;
  value?: number | string;
  icon?: string;
  iconPosition?: "start" | "end";
  valueColor?: string;
  change?: string; // e.g. "+5%" or "-20 since last month"
  changeColor?: string;
  
  // Markdown/Text-specific (type === "markdown")
  content?: string;
}

export interface DashboardSpecification {
  theme: {
    primaryColor: string;
    secondaryColor?: string;
  };
  widgets: WidgetConfig[];
}