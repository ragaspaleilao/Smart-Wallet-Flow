import { BusinessProduct, BusinessSettings } from "./store";

export interface BusinessInsight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  action?: string;
}

export interface CalculatedProduct extends BusinessProduct {
  totalDirectCost: number;
  fixedCostShare: number;
  totalUnitCost: number;
  grossMargin: number; // Value
  grossMarginPercent: number; // %
  netProfit: number;
  monthlyProfit: number;
  breakEvenPoint: number; // Units
}

export function calculateBusinessMetrics(
  products: BusinessProduct[],
  settings: BusinessSettings
) {
  const totalFixedCosts = settings.fixedCosts.reduce((acc, curr) => acc + curr.value, 0);
  
  // Calculate total monthly sales volume to apportion fixed costs
  const totalMonthlySales = products.reduce((acc, curr) => acc + curr.averageMonthlySales, 0);
  
  // Simple apportionment: Fixed Cost per Unit sold (regardless of product)
  // A better approach might be weighted by revenue, but let's stick to unit based for simplicity in V1
  const fixedCostPerUnit = totalMonthlySales > 0 ? totalFixedCosts / totalMonthlySales : 0;

  const calculatedProducts: CalculatedProduct[] = products.map(product => {
    const totalDirectCost = product.directCosts.reduce((acc, curr) => acc + curr.value, 0);
    const totalUnitCost = totalDirectCost + fixedCostPerUnit;
    
    const grossMargin = product.sellingPrice - totalDirectCost; // Contribution Margin actually
    const grossMarginPercent = product.sellingPrice > 0 ? (grossMargin / product.sellingPrice) * 100 : 0;
    
    const netProfitPerUnit = product.sellingPrice - totalUnitCost;
    const monthlyProfit = netProfitPerUnit * product.averageMonthlySales;
    
    // Break Even Point = Fixed Costs / Contribution Margin per unit
    // Here we need to allocate fixed costs to this product to calculate its specific BEP?
    // Or Global BEP? 
    // Let's calculate Product Specific BEP assuming it covers its share of fixed costs
    // BEP (units) = (Fixed Cost Share * Sales Volume) / (Price - Direct Cost)
    // Actually: BEP = Total Fixed Costs / Weighted Average Contribution Margin (Global)
    // For single product specific: BEP = Allocated Fixed Cost / (Price - Direct Cost)
    const allocatedFixedCost = fixedCostPerUnit * product.averageMonthlySales;
    const contributionMargin = product.sellingPrice - totalDirectCost;
    const breakEvenPoint = contributionMargin > 0 ? allocatedFixedCost / contributionMargin : 0;

    return {
      ...product,
      totalDirectCost,
      fixedCostShare: fixedCostPerUnit,
      totalUnitCost,
      grossMargin,
      grossMarginPercent,
      netProfit: netProfitPerUnit,
      monthlyProfit,
      breakEvenPoint
    };
  });

  const totalMonthlyProfit = calculatedProducts.reduce((acc, curr) => acc + curr.monthlyProfit, 0);
  const totalMonthlyRevenue = calculatedProducts.reduce((acc, curr) => acc + (curr.sellingPrice * curr.averageMonthlySales), 0);
  
  return {
    calculatedProducts,
    totalFixedCosts,
    totalMonthlySales,
    totalMonthlyProfit,
    totalMonthlyRevenue
  };
}

export function generateBusinessInsights(
  metrics: ReturnType<typeof calculateBusinessMetrics>
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { calculatedProducts, totalMonthlyProfit } = metrics;

  // 1. Profitability Alert
  if (totalMonthlyProfit < 0) {
    insights.push({
      type: 'danger',
      title: 'Negócio no Prejuízo',
      message: 'Sua operação atual está gerando prejuízo. Você precisa aumentar preços, reduzir custos ou aumentar vendas imediatamente.',
      action: 'Revisar Custos'
    });
  } else if (totalMonthlyProfit < 1000) { // Arbitrary threshold
    insights.push({
      type: 'warning',
      title: 'Margem Apertada',
      message: 'Seu lucro mensal está baixo. Cuidado com imprevistos.',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Negócio Saudável',
      message: 'Sua operação está gerando lucro. Continue assim!',
    });
  }

  // 2. Product Specific Alerts
  calculatedProducts.forEach(p => {
    if (p.netProfit < 0) {
      insights.push({
        type: 'danger',
        title: `Prejuízo em ${p.name}`,
        message: `Você perde R$ ${Math.abs(p.netProfit).toFixed(2)} a cada ${p.name} vendido. Aumente o preço para pelo menos R$ ${p.totalUnitCost.toFixed(2)} para cobrir custos.`,
      });
    } else if (p.grossMarginPercent < 30) {
      insights.push({
        type: 'warning',
        title: `Margem Baixa em ${p.name}`,
        message: `A margem de contribuição de ${p.name} é de apenas ${p.grossMarginPercent.toFixed(0)}%. O ideal para alimentação é acima de 30-40%.`,
      });
    }
  });

  return insights;
}
