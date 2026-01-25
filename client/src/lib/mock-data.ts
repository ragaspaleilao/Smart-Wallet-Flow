import { Zap, Home, List, Target, PieChart, Settings, Car, LayoutDashboard, CreditCard } from "lucide-react";

export const transactions = [
  { id: 1, type: "expense", category: "Alimentação", amount: 45.90, date: "Hoje", description: "Padaria Estrela" },
  { id: 2, type: "expense", category: "Transporte", amount: 15.50, date: "Hoje", description: "Uber para o trabalho" },
  { id: 3, type: "income", category: "Salário", amount: 3500.00, date: "05/01", description: "Pagamento Mensal" },
  { id: 4, type: "expense", category: "Lazer", amount: 120.00, date: "Ontem", description: "Cinema com amigos" },
];

export const categories = [
  { id: 1, name: "Alimentação", color: "bg-orange-100 text-orange-600" },
  { id: 2, name: "Transporte", color: "bg-blue-100 text-blue-600" },
  { id: 3, name: "Lazer", color: "bg-purple-100 text-purple-600" },
  { id: 4, name: "Saúde", color: "bg-green-100 text-green-600" },
];

export const goals = [
  { id: 1, name: "Viagem Fim de Ano", target: 5000, current: 1250, color: "bg-primary" },
  { id: 2, name: "Reserva de Emergência", target: 10000, current: 3500, color: "bg-blue-500" },
];

export const investments = [
  { id: 1, name: "Tesouro Selic", value: 12450.00, yield: "+0.85%" },
  { id: 2, name: "CDB Banco X", value: 5000.00, yield: "+0.92%" },
];

export const vehicles = [
  { id: 1, name: "Honda Civic 2018", plate: "ABC-1234", expenses: [
    { name: "IPVA", due: "15/02", value: 1250.00, status: "warning" },
    { name: "Seguro", due: "10/05", value: 2100.00, status: "ok" },
  ]},
];

export const navItems = [
  { icon: Home, label: "Início", path: "/dashboard" },
  { icon: List, label: "Extrato", path: "/transactions" },
  { icon: CreditCard, label: "Cartões", path: "/credit-cards" },
  { icon: PieChart, label: "Análise", path: "/analytics" },
  { icon: Target, label: "Metas", path: "/goals" },
];