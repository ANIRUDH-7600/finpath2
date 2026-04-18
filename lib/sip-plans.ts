export interface SipPlan {
  id: string
  name: string
  category: string
  typical_return: number
  risk: 'Low-Mod' | 'Moderate' | 'High' | 'Very High'
  description: string
}

export const SIP_PLANS: SipPlan[] = [
  { id: 'nifty50_idx', name: 'UTI Nifty 50 Index', category: 'Index Fund', typical_return: 13.5, risk: 'Low-Mod', description: 'Tracks top 50 Indian companies' },
  { id: 'nifty_next50', name: 'UTI Nifty Next 50 Index', category: 'Index Fund', typical_return: 16.4, risk: 'Moderate', description: 'Next 50 large-cap companies' },
  { id: 'mirae_large', name: 'Mirae Asset Large Cap', category: 'Large Cap', typical_return: 14.2, risk: 'Moderate', description: 'Top blue-chip companies' },
  { id: 'sbi_bluechip', name: 'SBI Bluechip Fund', category: 'Large Cap', typical_return: 13.9, risk: 'Moderate', description: 'Stable large-cap portfolio' },
  { id: 'ppfas_flexi', name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', typical_return: 18.3, risk: 'Moderate', description: 'Global diversification + India' },
  { id: 'hdfc_midcap', name: 'HDFC Mid-Cap Opportunities', category: 'Mid Cap', typical_return: 19.8, risk: 'High', description: 'High-growth mid-size companies' },
  { id: 'kotak_emerging', name: 'Kotak Emerging Equity', category: 'Mid Cap', typical_return: 21.3, risk: 'High', description: 'Emerging companies with upside' },
  { id: 'midcap150_idx', name: 'Motilal Nifty Midcap 150 Index', category: 'Index Fund', typical_return: 22.1, risk: 'High', description: 'Passive midcap index fund' },
  { id: 'axis_smallcap', name: 'Axis Small Cap Fund', category: 'Small Cap', typical_return: 24.5, risk: 'Very High', description: 'High-risk high-reward small caps' },
  { id: 'nippon_gold', name: 'Nippon India Gold BeES ETF', category: 'Gold ETF', typical_return: 9.8, risk: 'Low-Mod', description: 'Inflation hedge via gold' },
]

export const RISK_COLOR: Record<string, string> = {
  'Low-Mod': 'text-blue-400',
  'Moderate': 'text-brand',
  'High': 'text-amber-400',
  'Very High': 'text-red-400',
}
