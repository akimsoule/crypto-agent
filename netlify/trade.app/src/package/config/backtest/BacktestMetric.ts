import { createCanvas } from "canvas";
import { Asset } from "../../../types/lib";
import { MixHoldSideEnum } from "../../common/MapperType";
import { Label } from "../../common/Label";
import { Util } from "../../common/Util";

interface PositionObject {
  [x: string]: number | string | boolean;
}

export class BacktestMetric {
  private static BITGET_TRADING_FEE_PERCENTAGE = 0.04;

  public name: string;
  private asset: Asset;
  public mixHoldSideEnum: MixHoldSideEnum;
  private positions: PositionObject[];
  public position: PositionObject;
  public openTrades: number;
  public closeTrades: number;
  public winningTrades: number;
  public losingTrades: number;
  public profitLoss: number;
  public maxDrawdown: number;
  public peak: number;
  public successRate: number;
  public maxPositionSize: number;
  public cryptoPriceHistory: number[]; // Historique des prix de la crypto
  public strategyPerformance: number[]; // Historique du rendement cumulé de la stratégie
  public performanceRatio: number;
  public image: Buffer;

  constructor(asset: Asset, name: string, mixHoldSideEnum: MixHoldSideEnum) {
    this.name = name;
    this.asset = asset;
    this.mixHoldSideEnum = mixHoldSideEnum;
    this.positions = [];
    this.position = {} as PositionObject;
    this.openTrades = 0;
    this.closeTrades = 0;
    this.winningTrades = 0;
    this.losingTrades = 0;
    this.profitLoss = 0;
    this.maxDrawdown = 0;
    this.peak = 0;
    this.successRate = 0;
    this.maxPositionSize = 0;
    this.cryptoPriceHistory = [];
    this.strategyPerformance = [];
    this.performanceRatio = 0;
    this.image = Buffer.alloc(0);
  }

  /**
   * Enregistre une position dans l'historique
   */
  private savePosition(
    index: number,
    position: PositionObject,
    currentPrice: number,
    isOpen: boolean
  ): void {
    this.positions.push({
      ...position,
      index,
      timestamp: Number(this.asset.dates[index]), // Utiliser la date correspondante à l'index
      currentPrice,
      isOpen,
      profitLoss: isOpen ? 0 : this.getRoe(currentPrice),
    });
    this.savePositionsChart();
  }

  /**
   * Ouvre une position longue avec possibilité de lisser une position existante.
   * @param currentPrice Le prix actuel du marché.
   * @param baseCurrencyAmount Montant en devise à ajouter à la position.
   * @param mixHoldSideEnum Type de position (long ou short).
   * @param leverage Effet de levier pour la position.
   */
  openPosition(
    index: number,
    currentPrice: number,
    baseCurrencyAmount: number,
    mixHoldSideEnum: MixHoldSideEnum,
    leverage = 5
  ) {
    if (baseCurrencyAmount <= 0) {
      return;
    }

    const newPosition: PositionObject = {
      [Label.SIDE]: mixHoldSideEnum,
      [Label.LEVERAGE]: leverage,
    };

    // Calculer le ROE actuel si une position existe
    let currentROE = 0;
    if (Label.SIZE in this.position) {
      currentROE = this.getRoe(currentPrice);
      if (currentROE > -30) {
        return;
      }
    }

    // Ajuster le montant en fonction du ROE
    const adjustedCurrencyAmount = this.calculateAdjustedCurrencyAmount(
      currentROE,
      baseCurrencyAmount
    );
    const cryptoAmount = adjustedCurrencyAmount / currentPrice;

    if (Label.SIZE in this.position) {
      const oldCryptoAmount = this.position[Label.SIZE] as number;
      const oldOpenPrice = this.position[Label.OPEN_PRICE_AVG] as number;
      const newCryptoAmount = oldCryptoAmount + cryptoAmount;
      const newPrice =
        (oldOpenPrice * oldCryptoAmount + currentPrice * cryptoAmount) /
        newCryptoAmount;

      const roe = this.getRoe(currentPrice);
      if (!(roe < -30)) {
        return;
      }

      newPosition[Label.SIZE] = newCryptoAmount;
      newPosition[Label.OPEN_PRICE_AVG] = newPrice;
    } else {
      newPosition[Label.SIZE] = cryptoAmount;
      newPosition[Label.OPEN_PRICE_AVG] = currentPrice;
    }

    this.position = newPosition;
    this.openTrades += 1;

    // Sauvegarder la position ouverte
    this.savePosition(index, newPosition, currentPrice, true);

    // Met à jour la taille maximale de position
    this.maxPositionSize = Math.max(
      this.maxPositionSize,
      newPosition[Label.SIZE] as number
    );

    // Enregistre le prix actuel de la crypto
    this.cryptoPriceHistory.push(currentPrice);

    // Enregistre la performance cumulée de la stratégie
    this.strategyPerformance.push(this.profitLoss);
  }

  /**
   * Ferme une position active et met à jour les métriques du backtest.
   * @param currentPrice Prix actuel du marché.
   */
  closePosition(index: number, currentPrice: number) {
    if (!this.position || !(Label.SIZE in this.position)) {
      // console.warn("Aucune position active à fermer.");
      return;
    }

    const roe = this.getRoe(currentPrice);

    if (roe <= 5) {
      // console.warn("Le rendement est insuffisant pour clôturer la position.");
      return;
    }

    // Sauvegarder la position fermée
    this.savePosition(index, this.position, currentPrice, false);

    this.closeTrades += 1;
    this.profitLoss += roe;

    if (roe > 0) {
      this.winningTrades += 1;
    } else {
      this.losingTrades += 1;
    }

    this.peak = Math.max(this.peak, this.profitLoss);
    const drawdown = this.peak - this.profitLoss;
    this.maxDrawdown = Math.max(this.maxDrawdown, drawdown);

    this.successRate =
      this.closeTrades > 0 ? (this.winningTrades / this.closeTrades) * 100 : 0;

    this.position = {};

    // Enregistre le prix actuel de la crypto
    this.cryptoPriceHistory.push(currentPrice);

    // Enregistre la performance cumulée de la stratégie
    this.strategyPerformance.push(this.profitLoss);

    this.performanceRatio = this.calculatePerformanceRatio();
  }

  private getRoe(currentPrice: number) {
    const openSize = this.position[Label.SIZE] as number;
    const openPrice = this.position[Label.OPEN_PRICE_AVG] as number;
    const leverage = this.position[Label.LEVERAGE] as number;
    const mixHoldSideEnum = this.position[Label.SIDE] as MixHoldSideEnum;

    const initialAssetInUsdt = Util.convertCryptoToUsdt(openSize, openPrice);
    const currentAssetInUsdt = Util.convertCryptoToUsdt(openSize, currentPrice);
    const margin = currentAssetInUsdt / leverage;
    const pl =
      mixHoldSideEnum === MixHoldSideEnum.SHORT
        ? initialAssetInUsdt - currentAssetInUsdt
        : currentAssetInUsdt - initialAssetInUsdt;
    // Application des frais Bitget
    const tradeFees =
      (initialAssetInUsdt + currentAssetInUsdt) *
      (BacktestMetric.BITGET_TRADING_FEE_PERCENTAGE / 100);
    const netPl = pl - tradeFees;

    const roe = (netPl * 100) / margin;
    return roe;
  }

  private calculateAdjustedCurrencyAmount(
    currentROE: number,
    baseCurrencyAmount: number
  ): number {
    // Si le ROE est supérieur à -30%, on retourne le montant de base
    if (currentROE > -30) {
      return baseCurrencyAmount;
    }

    // Calcul du multiplicateur en fonction de la profondeur de la perte
    const lossDepth = Math.abs(currentROE);
    let multiplier = 1;

    if (lossDepth >= 30 && lossDepth < 40) {
      multiplier = 1.5; // +50% du montant initial
    } else if (lossDepth >= 40 && lossDepth < 50) {
      multiplier = 2; // +100% du montant initial
    } else if (lossDepth >= 50) {
      multiplier = 2.5; // +150% du montant initial
    }

    return baseCurrencyAmount * multiplier;
  }

  /**
   * Calcule le ratio de performance entre la stratégie et la crypto.
   */
  calculatePerformanceRatio(): number {
    if (
      this.cryptoPriceHistory.length < 2 ||
      this.strategyPerformance.length < 2
    ) {
      // Pas assez de données pour calculer le ratio
      return 0;
    }

    const initialCryptoPrice = this.cryptoPriceHistory[0];
    const finalCryptoPrice =
      this.cryptoPriceHistory[this.cryptoPriceHistory.length - 1];
    const cryptoPerformance =
      this.mixHoldSideEnum === MixHoldSideEnum.LONG
        ? ((finalCryptoPrice - initialCryptoPrice) / initialCryptoPrice) * 100
        : ((initialCryptoPrice - finalCryptoPrice) / initialCryptoPrice) * 100;

    const initialStrategyPerformance = this.strategyPerformance[0];
    const finalStrategyPerformance =
      this.strategyPerformance[this.strategyPerformance.length - 1];
    const strategyPerformance =
      finalStrategyPerformance - initialStrategyPerformance;

    if (cryptoPerformance === 0) {
      return strategyPerformance === 0 ? 1 : Infinity; // Division par zéro évitée
    }

    return strategyPerformance / cryptoPerformance;
  }

  /**
   * Retourne l'historique des positions
   */
  public getPositionsHistory(): PositionObject[] {
    return this.positions;
  }

  /**
   * Retourne une représentation textuelle des métriques de backtest.
   */
  public toString(): string {
    // Génère et sauvegarde le graphique PNG dans le dossier 'png'
    this.savePositionsChart();

    return `Nom: ${this.name}
  - Open Trades: ${this.openTrades}
  - Close Trades: ${this.closeTrades}
  - Winning Trades: ${this.winningTrades}
  - Losing Trades: ${this.losingTrades}
  - Profit/Loss: ${this.profitLoss}
  - Max Drawdown: ${this.maxDrawdown}
  - Peak: ${this.peak}
  - Success Rate: ${this.successRate.toFixed(2)}%
  - Max Position Size: ${this.maxPositionSize}
  - Current Position: ${JSON.stringify(this.position)}
  - Total Positions: ${this.positions.length}
  - Performance Ratio (Strategy/Crypto): ${this.calculatePerformanceRatio()}
  `;
  }

  /**
   * Génère un graphique des positions et prix en HTML
   * @returns {string} Le contenu HTML du graphique
   */
  public async generatePositionsChart(): Promise<Buffer> {
    // Dimensions du graphique avec marges réduites
    const width = 1200;
    const height = 600;
    const margin = { top: 20, right: 120, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Créer le canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Fond blanc
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // Préparer les données de prix
    const pricesData = this.asset.closings.map((close, index) => ({
      price: Number(close),
      date: Number(this.asset.dates[index]),
    }));

    if (pricesData.length === 0) return canvas.toBuffer();

    // Calculer les échelles
    const minPrice = Math.min(...pricesData.map((d) => d.price)) * 0.995;
    const maxPrice = Math.max(...pricesData.map((d) => d.price)) * 1.005;
    const minDate = Math.min(...pricesData.map((d) => d.date));
    const maxDate = Math.max(...pricesData.map((d) => d.date));

    // Fonctions de mise à l'échelle
    const scaleX = (date: number): number =>
      margin.left + ((date - minDate) / (maxDate - minDate)) * chartWidth;

    const scaleY = (price: number): number =>
      height -
      margin.bottom -
      ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;

    // Dessiner les axes
    // Axe X
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    // Axe Y
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();

    // Fonction pour formater les dates
    const formatDate = (timestamp: number): string => {
      return new Date(timestamp).toLocaleDateString("fr-FR", {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    };

    // Graduations axe X (dates)
    const xTickCount = 5;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "12px Arial";

    for (let i = 0; i <= xTickCount; i++) {
      const date = minDate + ((maxDate - minDate) / xTickCount) * i;
      const x = scaleX(date);
      const y = height - margin.bottom;

      // Ligne de graduation
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 5);
      ctx.stroke();

      // Texte de la date
      ctx.save();
      ctx.translate(x, y + 7);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(formatDate(date), 0, 0);
      ctx.restore();
    }

    // Graduations axe Y (prix)
    const yTickCount = 8;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= yTickCount; i++) {
      const price = minPrice + ((maxPrice - minPrice) / yTickCount) * i;
      const x = margin.left;
      const y = scaleY(price);

      // Ligne de graduation
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Texte du prix
      ctx.fillText(price.toFixed(2), x - 8, y);

      // Ligne de grille horizontale (optionnel)
      ctx.beginPath();
      ctx.strokeStyle = "#eee";
      ctx.moveTo(x, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.strokeStyle = "black";
    }

    // Dessiner la ligne de prix avec les nouvelles marges
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    pricesData.forEach((data, i) => {
      const x = scaleX(data.date);
      const y = scaleY(data.price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dessiner les positions avec les nouvelles marges
    this.positions.forEach((pos) => {
      const x = scaleX(pos.timestamp as number);
      const y = scaleY(pos.currentPrice as number);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);

      if (pos.isOpen) {
        ctx.fillStyle = "green";
      } else {
        ctx.fillStyle = (pos.profitLoss as number) >= 0 ? "blue" : "red";
      }

      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.stroke();
    });

    // Légende améliorée avec fond blanc
    const legendX = width - margin.right + 10;
    const legendItems = [
      { color: "green", text: "Position ouverte" },
      { color: "blue", text: "Position fermée (gain)" },
      { color: "red", text: "Position fermée (perte)" },
    ];

    // Fond blanc pour la légende
    ctx.fillStyle = "white";
    ctx.fillRect(legendX - 5, margin.top, 110, legendItems.length * 25 + 10);
    ctx.strokeStyle = "black";
    ctx.strokeRect(legendX - 5, margin.top, 110, legendItems.length * 25 + 10);

    // Dessiner les éléments de la légende
    legendItems.forEach((item, i) => {
      const legendY = margin.top + 15 + i * 25;

      // Point de couleur
      ctx.beginPath();
      ctx.arc(legendX + 5, legendY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.stroke();

      // Texte
      ctx.fillStyle = "black";
      ctx.textAlign = "left";
      ctx.font = "12px Arial";
      ctx.fillText(item.text, legendX + 15, legendY + 4);
    });

    return canvas.toBuffer();
  }

  /**
   * Sauvegarde le graphique dans un fichier PNG
   * @param filePath Chemin du fichier de sortie
   */
  public async savePositionsChart(): Promise<void> {
    this.image = await this.generatePositionsChart();
    // Crée le répertoire 'png' s'il n'existe pas
    // const pngDir = "png";
    // if (!fs.existsSync(pngDir)) {
    //   fs.mkdirSync(pngDir);
    // }
    // // Écrit le fichier
    // const filePath = `${pngDir}/${this.name}_positions-chart.png`;
    // fs.writeFileSync(filePath, this.image);
  }
}
