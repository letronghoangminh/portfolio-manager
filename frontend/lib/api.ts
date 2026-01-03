import { Capital, Order, PortfolioOverview, PriceData, AssetDetail, Holding, CoinInfo, WatchlistItem } from './types';

const API_BASE = '/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return res.json();
}

// Capital API
export async function getCapitals(): Promise<Capital[]> {
  return fetchAPI<Capital[]>('/capitals');
}

export async function addCapital(data: { amount: string; type: string; description?: string }): Promise<{ id: number; message: string }> {
  return fetchAPI('/capitals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function withdrawCapital(data: { amount: string; description?: string }): Promise<{ id: number; message: string }> {
  return fetchAPI('/withdraw', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addRealizedLoss(data: { amount: string; description?: string }): Promise<{ id: number; message: string }> {
  return fetchAPI('/realized-loss', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCapital(id: number): Promise<{ message: string }> {
  return fetchAPI(`/capitals/${id}`, {
    method: 'DELETE',
  });
}

// Orders API
export async function getOrders(asset?: string): Promise<Order[]> {
  const query = asset ? `?asset=${asset}` : '';
  return fetchAPI<Order[]>(`/orders${query}`);
}

export async function createOrder(data: {
  asset: string;
  type: 'buy' | 'sell';
  amount?: string;
  total_usdt?: string;
  price?: string;
  is_custom_price?: boolean;
}): Promise<{ id: number; message: string; amount: string; price: string; total: string }> {
  return fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteOrder(id: number): Promise<{ message: string }> {
  return fetchAPI(`/orders/${id}`, {
    method: 'DELETE',
  });
}

// Holdings API
export async function getHoldings(): Promise<Holding[]> {
  return fetchAPI<Holding[]>('/holdings');
}

// Portfolio API
export async function getPortfolioOverview(): Promise<PortfolioOverview> {
  return fetchAPI<PortfolioOverview>('/portfolio');
}

// Prices API
export async function getPrices(): Promise<PriceData[]> {
  return fetchAPI<PriceData[]>('/prices');
}

export async function getPrice(symbol: string): Promise<PriceData> {
  return fetchAPI<PriceData>(`/prices/${symbol}`);
}

// Asset Detail API
export async function getAssetDetail(symbol: string): Promise<AssetDetail> {
  return fetchAPI<AssetDetail>(`/assets/${symbol}`);
}

// Top Coins API
export async function getTopCoins(limit: number = 100): Promise<CoinInfo[]> {
  return fetchAPI<CoinInfo[]>(`/coins/top?limit=${limit}`);
}

export async function getTop20Prices(): Promise<PriceData[]> {
  return fetchAPI<PriceData[]>('/coins/top20');
}

// Watchlist API
export async function getWatchlist(): Promise<WatchlistItem[]> {
  return fetchAPI<WatchlistItem[]>('/watchlist');
}

export async function addToWatchlist(symbol: string, name: string): Promise<{ message: string }> {
  return fetchAPI('/watchlist', {
    method: 'POST',
    body: JSON.stringify({ symbol, name }),
  });
}

export async function removeFromWatchlist(symbol: string): Promise<{ message: string }> {
  return fetchAPI(`/watchlist/${symbol}`, {
    method: 'DELETE',
  });
}

export async function getWatchlistPrices(): Promise<PriceData[]> {
  return fetchAPI<PriceData[]>('/watchlist/prices');
}

// Reset API
export async function resetAllData(): Promise<{ message: string }> {
  return fetchAPI('/reset', {
    method: 'POST',
  });
}

