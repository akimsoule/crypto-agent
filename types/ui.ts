// Types liés à l'interface utilisateur et aux composants React

export interface InvestorUI {
  id: string;
  name: string;
  type: string;
  totalReturn: number;
  winRate: number;
  activePositions: number;
  lastTrade: string;
  avatar: string;
  rank: number;
}

export interface Theme {
  name: string;
  label: string;
  colors: string[];
}
