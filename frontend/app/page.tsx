'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  BarChart3, 
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  Coins
} from 'lucide-react';
import { getPortfolioOverview } from '@/lib/api';
import { PortfolioOverview, ASSET_COLORS, HoldingDetail } from '@/lib/types';
import { formatCurrency, formatPercent, isPositive, classNames } from '@/lib/utils';
import StatCard from '@/components/StatCard';
import HoldingCard from '@/components/HoldingCard';
import AddCapitalModal from '@/components/AddCapitalModal';
import TradeModal from '@/components/TradeModal';
import AssetDetailModal from '@/components/AssetDetailModal';
import HistoryPanel from '@/components/HistoryPanel';
import PricesTicker from '@/components/PricesTicker';
import SettingsMenu from '@/components/SettingsMenu';
import WithdrawModal from '@/components/WithdrawModal';
import RealizedLossModal from '@/components/RealizedLossModal';

// Portfolio Allocation Component with interactive donut chart
function PortfolioAllocation({ 
  pieData, 
  totalValue, 
  holdings 
}: { 
  pieData: { asset: string; value: number; color: string; percent: number }[]; 
  totalValue: number;
  holdings: HoldingDetail[];
}) {
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  
  // Calculate SVG arc paths for donut chart
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate total percent for normalization (should be ~100 but might vary)
  const totalPercent = pieData.reduce((sum, d) => sum + d.percent, 0);
  
  let cumulativePercent = 0;
  const segments = pieData.map((d) => {
    // Use the stored percent value for consistency with Holdings
    const normalizedPercent = totalPercent > 0 ? (d.percent / totalPercent) * 100 : 0;
    const strokeDasharray = `${(normalizedPercent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += normalizedPercent;
    return { ...d, strokeDasharray, strokeDashoffset };
  });

  const hoveredData = hoveredAsset ? pieData.find(d => d.asset === hoveredAsset) : null;
  const hoveredHolding = hoveredAsset ? holdings.find(h => h.asset === hoveredAsset) : null;

  return (
    <div className="glass-card p-6 animate-fade-in stagger-2">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Coins size={20} />
        Portfolio Allocation
      </h2>
      
      <div className="flex items-center gap-8">
        {/* Interactive SVG Donut Chart */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((segment) => (
              <circle
                key={segment.asset}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={hoveredAsset === segment.asset ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                style={{ 
                  opacity: hoveredAsset && hoveredAsset !== segment.asset ? 0.4 : 1,
                }}
                onMouseEnter={() => setHoveredAsset(segment.asset)}
                onMouseLeave={() => setHoveredAsset(null)}
              />
            ))}
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {hoveredData ? (
                <>
                  <p className="text-lg font-bold font-mono" style={{ color: hoveredData.color }}>
                    {hoveredData.asset}
                  </p>
                  <p className="text-sm font-mono">{formatCurrency(hoveredData.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {hoveredData.percent.toFixed(1)}%
                  </p>
                  {hoveredHolding && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {parseFloat(hoveredHolding.amount).toFixed(4)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xl font-bold font-mono">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {pieData.map(d => (
            <div 
              key={d.asset} 
              className={classNames(
                "flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer",
                hoveredAsset === d.asset ? "bg-muted" : "hover:bg-muted/50"
              )}
              onMouseEnter={() => setHoveredAsset(d.asset)}
              onMouseLeave={() => setHoveredAsset(null)}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-sm font-medium">{d.asset}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm">{formatCurrency(d.value)}</span>
                <span className="text-muted-foreground text-xs ml-2">
                  ({d.percent.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showAddCapital, setShowAddCapital] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showRealizedLoss, setShowRealizedLoss] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [tradeAsset, setTradeAsset] = useState<string | undefined>(undefined);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    fetchPortfolio();
  }, [refreshTrigger]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const data = await getPortfolioOverview();
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAssetClick = (asset: string) => {
    setSelectedAsset(asset);
  };

  const handleTrade = (asset?: string, type: 'buy' | 'sell' = 'buy') => {
    setTradeAsset(asset);
    setTradeType(type);
    setShowTrade(true);
  };

  const totalCapital = portfolio ? parseFloat(portfolio.total_capital) : 0;
  const availableUSDT = portfolio ? parseFloat(portfolio.available_usdt) : 0;
  const totalInvested = portfolio ? parseFloat(portfolio.total_invested) : 0;
  const currentValue = portfolio ? parseFloat(portfolio.current_value) : 0;
  const unrealizedPnL = portfolio ? parseFloat(portfolio.unrealized_pnl) : 0;
  const realizedLoss = portfolio ? parseFloat(portfolio.realized_loss) : 0;
  const totalPnL = portfolio ? parseFloat(portfolio.total_pnl) : 0;
  const totalPnLPercent = portfolio ? parseFloat(portfolio.total_pnl_percent) : 0;
  const positive = isPositive(totalPnL);

  // Calculate pie chart data
  const pieDataUnsorted = portfolio?.holdings.map(h => ({
    asset: h.asset,
    value: parseFloat(h.current_value),
    color: ASSET_COLORS[h.asset] || '#3b82f6',
    percent: parseFloat(h.percent_of_capital)
  })) || [];

  if (availableUSDT > 0) {
    pieDataUnsorted.push({
      asset: 'USDT',
      value: availableUSDT,
      color: ASSET_COLORS.USDT,
      percent: totalCapital > 0 ? (availableUSDT / totalCapital) * 100 : 0
    });
  }

  // Sort by percent descending
  const pieData = pieDataUnsorted.sort((a, b) => b.percent - a.percent);
  const totalValue = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                <Wallet size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Crypto Portfolio</h1>
                <p className="text-muted-foreground text-sm">Manager</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setShowAddCapital(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Capital</span>
              </button>
              <button 
                onClick={() => setShowWithdraw(true)}
                className="btn-secondary flex items-center gap-2 text-danger border-danger/30 hover:bg-danger/10"
              >
                <ArrowUpRight size={18} />
                <span className="hidden sm:inline">Withdraw</span>
              </button>
              <button 
                onClick={() => handleTrade()}
                className="btn-primary flex items-center gap-2"
              >
                <ArrowRightLeft size={18} />
                <span className="hidden sm:inline">Trade</span>
              </button>
              <SettingsMenu onReset={handleRefresh} onAddRealizedLoss={() => setShowRealizedLoss(true)} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Price Ticker */}
        <div className="mb-8 animate-fade-in">
          <PricesTicker holdings={portfolio?.holdings || []} />
        </div>

        {loading && !portfolio ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading portfolio...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-danger text-lg mb-4">{error}</p>
            <button onClick={handleRefresh} className="btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="animate-fade-in stagger-1">
                <StatCard
                  title="Total Capital"
                  value={formatCurrency(totalCapital)}
                  subValue="Invested over time"
                  icon={<PiggyBank size={24} />}
                />
              </div>
              <div className="animate-fade-in stagger-2">
                <StatCard
                  title="Available USDT"
                  value={formatCurrency(availableUSDT)}
                  subValue="Ready to invest"
                  icon={<DollarSign size={24} />}
                />
              </div>
              <div className="animate-fade-in stagger-3">
                <StatCard
                  title="Portfolio Value"
                  value={formatCurrency(currentValue + availableUSDT)}
                  subValue={`Holdings: ${formatCurrency(currentValue)}`}
                  icon={<BarChart3 size={24} />}
                />
              </div>
              <div className="animate-fade-in stagger-4">
                <StatCard
                  title="Total P&L"
                  value={`${positive ? '+' : ''}${formatCurrency(totalPnL)}`}
                  trend={formatPercent(totalPnLPercent)}
                  icon={positive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  className={positive ? 'border-success/30' : 'border-danger/30'}
                  valueClassName={positive ? 'text-success' : 'text-danger'}
                />
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Holdings Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Portfolio Allocation */}
                {pieData.length > 0 && (
                  <PortfolioAllocation pieData={pieData} totalValue={totalValue} holdings={portfolio?.holdings || []} />
                )}

                {/* Holdings Cards */}
                <div className="animate-fade-in stagger-3">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wallet size={20} />
                    Your Holdings
                  </h2>
                  
                  {portfolio?.holdings.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <Coins size={48} className="mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Add some capital and start trading to build your portfolio
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button 
                          onClick={() => setShowAddCapital(true)}
                          className="btn-secondary"
                        >
                          Add Capital
                        </button>
                        <button 
                          onClick={() => handleTrade()}
                          className="btn-primary"
                        >
                          Start Trading
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portfolio?.holdings.map((holding, index) => (
                        <div key={holding.asset} className={`animate-fade-in stagger-${index + 1}`}>
                          <HoldingCard 
                            holding={holding} 
                            onClick={() => handleAssetClick(holding.asset)} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* History Panel */}
              <div className="animate-fade-in stagger-4">
                <HistoryPanel refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showAddCapital && (
        <AddCapitalModal
          onClose={() => setShowAddCapital(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          onClose={() => setShowWithdraw(false)}
          onSuccess={handleRefresh}
          availableUSDT={availableUSDT}
        />
      )}

      {showRealizedLoss && (
        <RealizedLossModal
          onClose={() => setShowRealizedLoss(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showTrade && (
        <TradeModal
          onClose={() => setShowTrade(false)}
          onSuccess={handleRefresh}
          availableUSDT={availableUSDT}
          defaultAsset={tradeAsset}
          defaultType={tradeType}
        />
      )}

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onTrade={(asset, type) => {
            setSelectedAsset(null);
            handleTrade(asset, type);
          }}
        />
      )}
    </div>
  );
}

