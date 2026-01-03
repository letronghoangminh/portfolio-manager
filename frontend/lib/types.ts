export interface Capital {
  id: number;
  amount: string;
  type: 'initial' | 'dca' | 'withdraw' | 'realized_loss';
  description: string;
  created_at: string;
}

export interface Order {
  id: number;
  asset: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  total_usdt: string;
  is_custom_price: boolean;
  created_at: string;
}

export interface Holding {
  asset: string;
  amount: string;
  average_price: string;
  total_cost: string;
}

export interface HoldingDetail {
  asset: string;
  amount: string;
  average_price: string;
  current_price: string;
  total_cost: string;
  current_value: string;
  pnl: string;
  pnl_percent: string;
  percent_of_capital: string;
}

export interface PortfolioOverview {
  total_capital: string;
  available_usdt: string;
  total_invested: string;
  current_value: string;
  unrealized_pnl: string;
  realized_loss: string;
  total_pnl: string;
  total_pnl_percent: string;
  holdings: HoldingDetail[];
}

export interface PriceData {
  symbol: string;
  price: string;
  change_1h: string;
  percent_change_1h: string;
  change_24h: string;
  percent_change_24h: string;
  change_7d: string;
  percent_change_7d: string;
  change_30d: string;
  percent_change_30d: string;
}

export interface AssetDetail {
  asset: string;
  amount: string;
  average_price: string;
  current_price: string;
  total_cost: string;
  current_value: string;
  pnl: string;
  pnl_percent: string;
  percent_of_capital: string;
  change_24h: string;
  percent_change_24h: string;
  orders: Order[];
}

export type CryptoAsset = string;

export const SUPPORTED_ASSETS: CryptoAsset[] = ['BTC', 'ETH', 'SOL', 'ONDO', 'LINK'];

export interface CoinInfo {
  symbol: string;
  name: string;
  price: string;
  rank: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  added_at: string;
}

export const ASSET_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  ONDO: 'Ondo',
  LINK: 'Chainlink',
  USDT: 'Tether',
};

export const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#627eea',
  SOL: '#9945ff',
  ONDO: '#0052ff',
  LINK: '#375bd2',
  USDT: '#26a17b',
};

