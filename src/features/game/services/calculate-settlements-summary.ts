import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

export type PlayerNetAmount = {
  uid: string;
  displayName: string;
  netAmount: number;
};

export type TransferInstruction = {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
};

export type SettlementsSummary = {
  playerNets: PlayerNetAmount[];
  winners: PlayerNetAmount[];
  losers: PlayerNetAmount[];
  transfers: TransferInstruction[];
};

/**
 * คำนวณยอดสุทธิของแต่ละผู้เล่นจาก settlements ทั้งหมด
 * Use current player names from players array if available
 */
export function calculatePlayerNets(
  settlements: Record<string, HandSettlement>,
  players: RoomPlayerListItem[]
): PlayerNetAmount[] {
  const playerNetsMap = new Map<string, { displayName: string; netAmount: number }>();

  // Build current player names map
  const currentPlayerNames = new Map<string, string>(
    players
      .filter(p => p.displayName) // Filter out undefined names
      .map(p => [p.uid, p.displayName!])
  );

  // Sort settlements by handNumber (newest first) to get latest names from history
  const sortedSettlements = Object.values(settlements).sort(
    (a, b) => b.handNumber - a.handNumber
  );

  // รวมยอด net ของแต่ละผู้เล่นจากทุก hand
  sortedSettlements.forEach((settlement) => {
    Object.values(settlement.playerResults).forEach((result) => {
      const existing = playerNetsMap.get(result.uid);
      if (existing) {
        existing.netAmount += result.net;
      } else {
        // Use current name if available, otherwise use name from settlement
        const displayName = currentPlayerNames.get(result.uid) ?? result.displayName;
        playerNetsMap.set(result.uid, {
          displayName,
          netAmount: result.net,
        });
      }
    });
  });

  // แปลงเป็น array และเรียงตามยอดสูงสุด
  return Array.from(playerNetsMap.entries())
    .map(([uid, data]) => ({
      uid,
      // Always prefer current player name
      displayName: currentPlayerNames.get(uid) ?? data.displayName,
      netAmount: Math.round(data.netAmount), // ปัดเศษ
    }))
    .sort((a, b) => b.netAmount - a.netAmount);
}

/**
 * คำนวณวิธีการโอนเงินที่สั้นที่สุด (Greedy Algorithm)
 * ใช้วิธี: คนที่ติดหนี้มากที่สุดจ่ายให้คนที่ได้เงินมากที่สุดก่อน
 */
export function calculateMinimumTransfers(
  playerNets: PlayerNetAmount[]
): TransferInstruction[] {
  const transfers: TransferInstruction[] = [];
  
  // แยกคนที่ได้เงิน (+) และคนที่ต้องจ่าย (-)
  const creditors = playerNets
    .filter((p) => p.netAmount > 0)
    .map((p) => ({ ...p, remaining: p.netAmount }))
    .sort((a, b) => b.remaining - a.remaining);
  
  const debtors = playerNets
    .filter((p) => p.netAmount < 0)
    .map((p) => ({ ...p, remaining: Math.abs(p.netAmount) }))
    .sort((a, b) => b.remaining - a.remaining);

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const transferAmount = Math.min(creditor.remaining, debtor.remaining);

    if (transferAmount > 0) {
      transfers.push({
        from: debtor.uid,
        fromName: debtor.displayName,
        to: creditor.uid,
        toName: creditor.displayName,
        amount: transferAmount,
      });

      creditor.remaining -= transferAmount;
      debtor.remaining -= transferAmount;
    }

    if (creditor.remaining === 0) {
      creditorIndex++;
    }
    if (debtor.remaining === 0) {
      debtorIndex++;
    }
  }

  return transfers;
}

/**
 * สร้างสรุปผลการเงินทั้งหมด
 */
export function calculateSettlementsSummary(
  settlements: Record<string, HandSettlement>,
  players: RoomPlayerListItem[]
): SettlementsSummary {
  const playerNets = calculatePlayerNets(settlements, players);
  const winners = playerNets.filter((p) => p.netAmount > 0);
  const losers = playerNets.filter((p) => p.netAmount < 0);
  const transfers = calculateMinimumTransfers(playerNets);

  return {
    playerNets,
    winners,
    losers,
    transfers,
  };
}

/**
 * แปลง transfers เป็นข้อความสรุปสำหรับส่ง Line
 */
export function formatTransfersForLine(
  playerNets: PlayerNetAmount[],
  transfers: TransferInstruction[],
  currency: string = "บาท"
): string {
  // จัดกลุ่มการโอนตาม from (คนที่จ่าย)
  const transfersByFrom = new Map<string, TransferInstruction[]>();
  
  transfers.forEach((transfer) => {
    const existing = transfersByFrom.get(transfer.from);
    if (existing) {
      existing.push(transfer);
    } else {
      transfersByFrom.set(transfer.from, [transfer]);
    }
  });

  const lines = playerNets.map((player) => {
    const sign = player.netAmount > 0 ? "+" : "";
    return `${player.displayName} ${sign}${player.netAmount} ${currency}`;
  });

  if (transfers.length > 0) {
    lines.push("-------------------------------------");
  }

  transfersByFrom.forEach((transfersList, fromUid) => {
    const fromName = transfersList[0].fromName;
    
    if (transfersList.length === 1) {
      // ถ้าโอนให้คนเดียว
      const t = transfersList[0];
      lines.push(`${fromName} โอนให้ ${t.toName} = ${t.amount} ${currency}`);
    } else {
      // ถ้าโอนให้หลายคน
      lines.push(`${fromName} โอน ${transfersList.length} ยอด:`);
      transfersList.forEach((t) => {
        lines.push(`  ให้ ${t.toName} = ${t.amount} ${currency}`);
      });
    }
  });

  return lines.join("\n");
}
