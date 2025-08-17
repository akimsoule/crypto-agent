// Types liés aux APIs et aux actions

import type { CryptoInvestment } from '@prisma/client';

export interface ActionResult {
  created: number;
  investments: CryptoInvestment[];
}
