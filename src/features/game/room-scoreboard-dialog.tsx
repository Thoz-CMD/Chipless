"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HandSettlement } from "@/features/rooms/services/settle-hand";
import type { RoomPlayerListItem } from "@/features/rooms/services/subscribe-room-players";

function formatAmount(amount: number): string {
  const absoluteAmount = Math.abs(amount).toLocaleString("en-US");

  if (amount > 0) {
    return `+${absoluteAmount}`;
  }

  if (amount < 0) {
    return `-${absoluteAmount}`;
  }

  return "0";
}

type PersonalLedgerRow = {
  uid: string;
  displayName: string;
  net: number;
};

type PersonalHandHistoryRow = {
  handNumber: number;
  pot: number;
  winnerName: string;
  rows: PersonalLedgerRow[];
  net: number;
};

function getPersonalRowsForSettlement({
  settlement,
  currentUid,
}: {
  settlement: HandSettlement;
  currentUid: string;
}): PersonalLedgerRow[] {
  const currentResult = settlement.playerResults[currentUid];

  if (!currentResult) {
    return [];
  }

  if (settlement.winnerUid === currentUid) {
    return Object.values(settlement.playerResults)
      .filter((result) => result.uid !== currentUid && result.contribution > 0)
      .map((result) => ({
        uid: result.uid,
        displayName: result.displayName,
        net: result.contribution,
      }));
  }

  if (currentResult.contribution <= 0) {
    return [];
  }

  return [
    {
      uid: settlement.winnerUid,
      displayName: settlement.winnerName,
      net: -currentResult.contribution,
    },
  ];
}

function getScoreRows({
  settlements,
  currentUid,
}: {
  settlements: Record<string, HandSettlement>;
  currentUid: string;
}): PersonalLedgerRow[] {
  const rows = new Map<string, PersonalLedgerRow>();

  Object.values(settlements).forEach((settlement) => {
    getPersonalRowsForSettlement({ settlement, currentUid }).forEach((row) => {
      const current = rows.get(row.uid);

      rows.set(row.uid, {
        uid: row.uid,
        displayName: current?.displayName ?? row.displayName,
        net: (current?.net ?? 0) + row.net,
      });
    });
  });

  return Array.from(rows.values()).sort(
    (first, second) => second.net - first.net,
  );
}

function getPersonalHistoryRows({
  settlementList,
  currentUid,
}: {
  settlementList: HandSettlement[];
  currentUid: string;
}): PersonalHandHistoryRow[] {
  return settlementList
    .map((settlement) => ({
      handNumber: settlement.handNumber,
      pot: settlement.pot,
      winnerName: settlement.winnerName,
      rows: getPersonalRowsForSettlement({ settlement, currentUid }),
    }))
    .map((settlement) => ({
      ...settlement,
      net: settlement.rows.reduce((total, row) => total + row.net, 0),
    }))
    .filter((settlement) => settlement.rows.length > 0);
}

export function RoomScoreboardDialog({
  open,
  onOpenChange,
  players,
  settlements,
  currentUid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: RoomPlayerListItem[];
  settlements: Record<string, HandSettlement>;
  currentUid: string;
}) {
  const settlementList = Object.values(settlements).sort(
    (first, second) => first.handNumber - second.handNumber,
  );
  const currentPlayerName =
    players.find((player) => player.uid === currentUid)?.displayName ?? "You";
  const rows = getScoreRows({ settlements, currentUid });
  const personalHistoryRows = getPersonalHistoryRows({
    settlementList,
    currentUid,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto border-white/35 bg-black/95 text-white shadow-[0_0_32px_rgba(255,255,255,0.16)]">
        <DialogHeader>
          <DialogTitle>Game Summary</DialogTitle>
          <DialogDescription className="text-white/60">
            {currentPlayerName} · Hands played: {settlementList.length}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your Balance</h3>
          {rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={row.uid}
                className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2"
              >
                <span className="font-semibold">{row.displayName}</span>
                <span
                  className={`font-bold ${
                    row.net > 0
                      ? "text-emerald-300"
                      : row.net < 0
                        ? "text-red-300"
                        : "text-white/60"
                  }`}
                >
                  {formatAmount(row.net)} THB
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-center text-sm text-white/55">
              No settled hands yet.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">
            Your Hand History
          </h3>
          {personalHistoryRows.length > 0 ? (
            personalHistoryRows
              .slice()
              .reverse()
              .map((historyRow) => (
                <div
                  key={historyRow.handNumber}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      Hand #{historyRow.handNumber}
                    </span>
                    <span className="text-sm text-white/65">
                      Pot {historyRow.pot.toLocaleString("en-US")} THB
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/65">
                    <span>Winner: </span>
                    <span className="font-semibold text-white">
                      {historyRow.winnerName}
                    </span>
                    <span
                      className={`float-right font-semibold ${
                        historyRow.net > 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {formatAmount(historyRow.net)} THB
                    </span>
                  </p>
                </div>
              ))
          ) : (
            <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-3 text-center text-sm text-white/55">
              No personal hand history yet.
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
