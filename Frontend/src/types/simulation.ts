// ── Product Stage ────────────────────────────────────────────────────────────

export type ProductStage = "pre_launch" | "just_launched" | "growing" | "established";

export interface StageDimension {
  key: string;
  label: string;
  weight: number;
  hint: string;
}

export interface StageConfig {
  label: string;
  subtitle: string;
  dimensions: StageDimension[];
}

export const STAGE_CONFIG: Record<ProductStage, StageConfig> = {
  pre_launch: {
    label: "Pre-Launch",
    subtitle: "Not yet in market",
    dimensions: [
      { key: "differentiation", label: "Differentiation",        weight: 0.30, hint: "How unique is your solution vs existing options?" },
      { key: "problem_fit",     label: "Problem-Solution Fit",   weight: 0.30, hint: "How clearly does it solve a real, urgent pain?" },
      { key: "demo_quality",    label: "Demo / First Impression", weight: 0.20, hint: "How compelling is the first 60-second experience?" },
      { key: "target_clarity",  label: "Target Clarity",         weight: 0.10, hint: "How well-defined is your ideal customer?" },
      { key: "early_buzz",      label: "Early Buzz / Waitlist",  weight: 0.10, hint: "Any press, waitlist, or community interest?" },
    ],
  },
  just_launched: {
    label: "Just Launched",
    subtitle: "Live but early",
    dimensions: [
      { key: "quality",           label: "Build Quality",          weight: 0.30, hint: "How polished is the product right now?" },
      { key: "uniqueness",        label: "Uniqueness",             weight: 0.25, hint: "What makes it clearly different from day-1?" },
      { key: "first_reviews",     label: "Early Reviews",          weight: 0.20, hint: "What are your first users saying?" },
      { key: "price_positioning", label: "Price Positioning",      weight: 0.15, hint: "Does your price feel right for what you offer?" },
      { key: "support",           label: "Support & Trust",        weight: 0.10, hint: "Can customers reach you and trust you'll respond?" },
    ],
  },
  growing: {
    label: "Growing",
    subtitle: "Gaining traction",
    dimensions: [
      { key: "reputation",    label: "Reputation",          weight: 0.25, hint: "What do existing customers say about you?" },
      { key: "retention",     label: "Retention Signal",    weight: 0.25, hint: "Do customers come back or churn after first buy?" },
      { key: "word_of_mouth", label: "Word-of-Mouth",      weight: 0.20, hint: "Are customers referring others organically?" },
      { key: "quality",       label: "Product Quality",    weight: 0.20, hint: "How good is the core product experience?" },
      { key: "price_power",   label: "Pricing Power",      weight: 0.10, hint: "Can you hold price without losing customers?" },
    ],
  },
  established: {
    label: "Established",
    subtitle: "Market presence",
    dimensions: [
      { key: "brand",        label: "Brand Recognition", weight: 0.25, hint: "How well-known is your brand in this category?" },
      { key: "loyalty",      label: "Customer Loyalty",  weight: 0.25, hint: "How strong is your repeat purchase rate?" },
      { key: "market_share", label: "Market Share",      weight: 0.20, hint: "What portion of the market do you hold?" },
      { key: "price_power",  label: "Pricing Power",     weight: 0.15, hint: "Can you charge premium without losing share?" },
      { key: "distribution", label: "Distribution",      weight: 0.15, hint: "How widely available is your product?" },
    ],
  },
};

export function computePerceivedValue(stage: ProductStage, scores: Record<string, number>): number {
  const dims = STAGE_CONFIG[stage].dimensions;
  const value = dims.reduce((sum, d) => sum + (scores[d.key] ?? 0.5) * d.weight, 0);
  return Math.round(value * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────

export type SegmentWeights = {
  early_adopter: number;
  premium_seeker: number;
  price_hunter: number;
  skeptic: number;
};

export const DEFAULT_SEGMENT_WEIGHTS: SegmentWeights = {
  early_adopter:  0.20,
  premium_seeker: 0.15,
  price_hunter:   0.35,
  skeptic:        0.30,
};

export interface SimulationPayload {
  agent_count: number;
  product_price: number;
  product_value: number;
  comp_price: number;
  comp_strength: number;
  product_stage: ProductStage;
  use_ml: boolean;
  market_size?: number;
  segment_weights?: SegmentWeights;
}

export type AgentSegment = "early_adopter" | "premium_seeker" | "price_hunter" | "skeptic";

export interface MLProbabilities {
  REJECT: number;
  DELAY: number;
  BUY: number;
}

export interface AgentDecision {
  agent_id: number;
  segment: AgentSegment;
  budget: number;
  urgency: number;
  risk_aversion: number;
  probability: number;
  action: "buy" | "delay" | "reject";
  ml_probabilities?: MLProbabilities | null;
  feature_contributions?: Record<string, number> | null;
}

export interface DecisionDrivers {
  buy: Record<string, number>;
  reject: Record<string, number>;
  n_buy: number;
  n_reject: number;
}

export interface SegmentStats {
  total: number;
  buy: number;
  delay: number;
  reject: number;
}

export interface ProjectedNumbers {
  customers: number;
  revenue: number;
  mc_customers: number;
  mc_revenue: number;
  market_size: number;
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
  segment_breakdown: Record<AgentSegment, SegmentStats>;
  probability_curve: { agent: number; probability: number }[];
  logs: AgentDecision[];
  engine_mode: "ml" | "rule_based";
  projected?: ProjectedNumbers;
  decision_drivers?: DecisionDrivers;
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
  curve: { price: number; revenue: number; profit: number }[];
  optimal_price: number;
  max_revenue: number;
  optimal_profit_price: number;
  max_profit: number;
}

export interface AgentTraceEvent {
  type: "INIT" | "PLAN" | "THINK" | "SEARCH" | "RESULTS" | "SYNTHESIZE" | "COMPLETE" | "ERROR" | "WARN" | "LIMIT" | "FALLBACK";
  message: string;
}
