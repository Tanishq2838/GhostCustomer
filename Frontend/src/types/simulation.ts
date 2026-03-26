export interface SimulationPayload {
  agent_count: number;
  product_price: number;
  product_value: number;
  comp_price: number;
  comp_strength: number;
}

export interface AgentDecision {
  agent_id: number;
  budget: number;
  urgency: number;
  probability: number;
  action: "buy" | "delay" | "reject";
}

export interface SimulationResponse {
  conversion_rate: string;
  delay_rate: string;
  rejection_rate: string;
  verdict: string;
  monte_carlo: {
    mean_conversion: number;
    confidence_interval: [number, number];
  };
  distribution: {
    buy: number;
    delay: number;
    reject: number;
  };
  probability_curve: { agent: number; probability: number }[];
  logs: AgentDecision[];
  competitors?: {
    name: string;
    price: number;
    strength: number;
  }[];
}

export interface ParsedKPIs {
  conversionRate: number;
  delayRate: number;
  rejectionRate: number;
}

export function parsePercentage(val: string): number {
  return parseFloat(val.replace("%", ""));
}

export interface ElasticityDataPoint {
  price: number;
  conversion: number;
  revenue: number;
}

export interface ElasticityResponse {
  curve: ElasticityDataPoint[];
  optimal_price: number;
  max_revenue: number;
  insight: string;
}

export interface OptimizationResponse {
  curve: { price: number; revenue: number }[];
  optimal_price: number;
  max_revenue: number;
}
