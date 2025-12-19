export interface DashboardSpecification {
  templateId: string;
  templateName: string;
  structure: {
    sections: Array<{
      type: string;
      responsive?: Record<string, string>;
      widgets: Array<{
        type: string;
        label?: string;
        title?: string;
        dataPath?: string;
        icon?: string;
        format?: string;
        columns?: Array<{ key: string; label: string; format?: string }>;
        pagination?: boolean;
        height?: Record<string, string>;
        xAxis?: string;
        yAxis?: string;
      }>;
      dataPath?: string;
      columns?: Array<{ key: string; label: string; format?: string }>;
      pagination?: boolean;
      title?: string;
    }>;
  };
  fieldMappings: Record<string, string>;
  theme: {
    primary: string;
    secondary: string;
  };
}