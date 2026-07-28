export type BettingRound = "preflop" | "flop" | "turn" | "river" | "showdown";

export type PlayerStatus = "active" | "folded" | "all-in";

export type PlayerCardsByUid = Record<string, readonly string[]>;

export type HoldemPlayerState = {
  uid: string;
  displayName: string;
  seatIndex: number;
  stack: number;
  currentContribution: number;
  totalContribution: number;
  hasFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
};

export type HoldemActionLogEntry = {
  id: number;
  uid: string;
  displayName: string;
  action: "Fold" | "Check" | "Call" | "Bet" | "Raise";
  amount?: number;
  bettingRound: BettingRound;
};

export type HoldemGameState = {
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  currentTurn: number;
  bettingRound: BettingRound;
  pot: number;
  currentBet: number;
  minimumRaise: number;
  smallBlind: number;
  bigBlind: number;
  players: HoldemPlayerState[];
  communityCards?: string[];
  playerCards?: PlayerCardsByUid;
  actionLog?: HoldemActionLogEntry[];
  lastAggressorPosition?: number;
};

export type HoldemAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call"; amount: number }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number };

export type AvailableAction =
  | { type: "fold"; label: "Fold" }
  | { type: "check"; label: "Check" }
  | { type: "call"; label: string; amount: number }
  | { type: "bet"; label: "Bet"; minimumAmount: number }
  | { type: "raise"; label: "Raise"; minimumAmount: number };

export type PlayerPositionLabel = "BTN" | "SB" | "BB";

export type CreateHoldemGameInput = {
  players: Array<{
    uid: string;
    displayName: string;
    seatIndex: number;
    stack?: number;
  }>;
  dealerPosition: number;
  bigBlind: number;
  playerCards?: PlayerCardsByUid;
};

export function isHoldemGameState(value: unknown): value is HoldemGameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    typeof state.dealerPosition === "number" &&
    typeof state.smallBlindPosition === "number" &&
    typeof state.bigBlindPosition === "number" &&
    typeof state.currentTurn === "number" &&
    (state.bettingRound === "preflop" ||
      state.bettingRound === "flop" ||
      state.bettingRound === "turn" ||
      state.bettingRound === "river" ||
      state.bettingRound === "showdown") &&
    typeof state.pot === "number" &&
    typeof state.currentBet === "number" &&
    typeof state.minimumRaise === "number" &&
    typeof state.smallBlind === "number" &&
    typeof state.bigBlind === "number" &&
    Array.isArray(state.players) &&
    state.players.every((player) => {
      if (!player || typeof player !== "object") {
        return false;
      }

      const playerState = player as Record<string, unknown>;

      return (
        typeof playerState.uid === "string" &&
        typeof playerState.displayName === "string" &&
        typeof playerState.seatIndex === "number" &&
        typeof playerState.stack === "number" &&
        typeof playerState.currentContribution === "number" &&
        typeof playerState.totalContribution === "number" &&
        typeof playerState.hasFolded === "boolean" &&
        typeof playerState.isAllIn === "boolean" &&
        typeof playerState.hasActed === "boolean"
      );
    }) &&
    (state.communityCards === undefined ||
      (Array.isArray(state.communityCards) &&
        state.communityCards.every((card) => typeof card === "string"))) &&
    (state.playerCards === undefined ||
      (Boolean(state.playerCards) && typeof state.playerCards === "object")) &&
    (state.actionLog === undefined ||
      (Array.isArray(state.actionLog) &&
        state.actionLog.every((entry) => {
          if (!entry || typeof entry !== "object") {
            return false;
          }

          const actionEntry = entry as Record<string, unknown>;

          return (
            typeof actionEntry.id === "number" &&
            typeof actionEntry.uid === "string" &&
            typeof actionEntry.displayName === "string" &&
            (actionEntry.action === "Fold" ||
              actionEntry.action === "Check" ||
              actionEntry.action === "Call" ||
              actionEntry.action === "Bet" ||
              actionEntry.action === "Raise") &&
            (actionEntry.amount === undefined ||
              typeof actionEntry.amount === "number") &&
            (actionEntry.bettingRound === "preflop" ||
              actionEntry.bettingRound === "flop" ||
              actionEntry.bettingRound === "turn" ||
              actionEntry.bettingRound === "river" ||
              actionEntry.bettingRound === "showdown")
          );
        })))
  );
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

function getMinimumBetAmount(): number {
  return 1;
}

function getMinimumRaiseToAmount(state: HoldemGameState): number {
  if (state.currentBet <= 0) {
    return getMinimumBetAmount();
  }

  return state.currentBet + 1;
}

function assertValidPlayerCount(playerCount: number): void {
  if (playerCount < 2 || playerCount > 9) {
    throw new Error("Texas Hold'em requires 2-9 players.");
  }
}

function normalizePosition(position: number, playerCount: number): number {
  return ((position % playerCount) + playerCount) % playerCount;
}

function nextActivePosition(
  state: HoldemGameState,
  fromPosition: number,
): number | undefined {
  const playerCount = state.players.length;

  for (let offset = 1; offset <= playerCount; offset += 1) {
    const position = normalizePosition(fromPosition + offset, playerCount);
    const player = state.players[position];

    if (player && !player.hasFolded && !player.isAllIn) {
      return position;
    }
  }

  return undefined;
}

function firstActiveLeftOfDealer(state: HoldemGameState): number | undefined {
  return nextActivePosition(state, state.dealerPosition);
}

function activePlayers(state: HoldemGameState): HoldemPlayerState[] {
  return state.players.filter((player) => !player.hasFolded);
}

function activeBettingPlayers(state: HoldemGameState): HoldemPlayerState[] {
  return state.players.filter((player) => !player.hasFolded && !player.isAllIn);
}

function allActivePlayersMatchedBet(state: HoldemGameState): boolean {
  return activeBettingPlayers(state).every(
    (player) =>
      player.hasActed && player.currentContribution === state.currentBet,
  );
}

function resetRoundContributions(
  players: HoldemPlayerState[],
): HoldemPlayerState[] {
  return players.map((player) => ({
    ...player,
    currentContribution: 0,
    hasActed: false,
  }));
}

function nextRound(round: BettingRound): BettingRound {
  if (round === "preflop") {
    return "flop";
  }

  if (round === "flop") {
    return "turn";
  }

  if (round === "turn") {
    return "river";
  }

  return "showdown";
}

function moveToNextBettingRound(state: HoldemGameState): HoldemGameState {
  const bettingRound = nextRound(state.bettingRound);
  const players = resetRoundContributions(state.players);
  const stateWithoutLastAggressor = { ...state };

  delete stateWithoutLastAggressor.lastAggressorPosition;

  if (bettingRound === "showdown") {
    return {
      ...stateWithoutLastAggressor,
      bettingRound,
      currentBet: 0,
      currentTurn: -1,
      players,
    };
  }

  return {
    ...stateWithoutLastAggressor,
    bettingRound,
    currentBet: 0,
    minimumRaise: 1,
    currentTurn: firstActiveLeftOfDealer({ ...state, players }) ?? -1,
    players,
  };
}

function maybeAdvanceAfterAction(state: HoldemGameState): HoldemGameState {
  if (activePlayers(state).length <= 1) {
    return { ...state, bettingRound: "showdown", currentTurn: -1 };
  }

  if (allActivePlayersMatchedBet(state)) {
    return moveToNextBettingRound(state);
  }

  return {
    ...state,
    currentTurn: nextActivePosition(state, state.currentTurn) ?? -1,
  };
}

function putChipsIn(
  player: HoldemPlayerState,
  amount: number,
): HoldemPlayerState {
  const contribution = Math.min(amount, player.stack);

  return {
    ...player,
    stack: player.stack - contribution,
    currentContribution: player.currentContribution + contribution,
    totalContribution: player.totalContribution + contribution,
    isAllIn: player.stack - contribution === 0,
    hasActed: true,
  };
}

function resetOtherPlayersActedAfterAggression(
  players: HoldemPlayerState[],
  aggressorPosition: number,
): HoldemPlayerState[] {
  return players.map((player, position) =>
    position === aggressorPosition || player.hasFolded || player.isAllIn
      ? player
      : { ...player, hasActed: false },
  );
}

function updateCurrentPlayer(
  state: HoldemGameState,
  updater: (player: HoldemPlayerState) => HoldemPlayerState,
): HoldemGameState {
  return {
    ...state,
    players: state.players.map((player, position) =>
      position === state.currentTurn ? updater(player) : player,
    ),
  };
}

function appendActionLog(
  state: HoldemGameState,
  action: HoldemAction,
): HoldemGameState {
  const player = state.players[state.currentTurn];

  if (!player) {
    return state;
  }

  const actionLog = state.actionLog ?? [];
  const actionLabel =
    action.type === "fold"
      ? "Fold"
      : action.type === "check"
        ? "Check"
        : action.type === "call"
          ? "Call"
          : action.type === "bet"
            ? "Bet"
            : "Raise";
  const nextEntry: HoldemActionLogEntry = {
    id: (actionLog.at(-1)?.id ?? 0) + 1,
    uid: player.uid,
    displayName: player.displayName,
    action: actionLabel,
    bettingRound: state.bettingRound,
  };

  if ("amount" in action) {
    nextEntry.amount = action.amount;
  }

  return {
    ...state,
    actionLog: [...actionLog.slice(-4), nextEntry],
  };
}

export function createHoldemGameState({
  players,
  dealerPosition,
  bigBlind,
  playerCards = {},
}: CreateHoldemGameInput): HoldemGameState {
  assertValidPlayerCount(players.length);

  const normalizedDealer = normalizePosition(dealerPosition, players.length);
  const smallBlind = Math.max(1, Math.floor(bigBlind / 2));
  const smallBlindPosition =
    players.length === 2
      ? normalizedDealer
      : normalizePosition(normalizedDealer + 1, players.length);
  const bigBlindPosition =
    players.length === 2
      ? normalizePosition(normalizedDealer + 1, players.length)
      : normalizePosition(normalizedDealer + 2, players.length);
  const currentTurn = normalizePosition(bigBlindPosition + 1, players.length);

  const initializedPlayers = players.map((player, position) => {
    const blind =
      position === smallBlindPosition
        ? smallBlind
        : position === bigBlindPosition
          ? bigBlind
          : 0;
    const stack = player.stack ?? 1_000_000;

    return {
      uid: player.uid,
      displayName: player.displayName,
      seatIndex: player.seatIndex,
      stack: Math.max(0, stack - blind),
      currentContribution: blind,
      totalContribution: blind,
      hasFolded: false,
      isAllIn: stack - blind === 0 && stack > 0,
      hasActed: false,
    };
  });

  return {
    dealerPosition: normalizedDealer,
    smallBlindPosition,
    bigBlindPosition,
    currentTurn,
    bettingRound: "preflop",
    pot: smallBlind + bigBlind,
    currentBet: bigBlind,
    minimumRaise: 1,
    smallBlind,
    bigBlind,
    players: initializedPlayers,
    communityCards: [],
    playerCards,
  };
}

export function getAmountToCall(
  state: HoldemGameState,
  position: number,
): number {
  const player = state.players[position];

  if (!player) {
    return 0;
  }

  return Math.max(0, state.currentBet - player.currentContribution);
}

export function getPlayerPositionLabel(
  state: HoldemGameState,
  position: number,
): PlayerPositionLabel | null {
  if (position === state.bigBlindPosition) {
    return "BB";
  }

  if (position === state.smallBlindPosition) {
    return "SB";
  }

  if (position === state.dealerPosition) {
    return "BTN";
  }

  return null;
}

export function getAvailableActions(
  state: HoldemGameState,
  position: number,
): AvailableAction[] {
  const player = state.players[position];

  if (
    !player ||
    state.bettingRound === "showdown" ||
    position !== state.currentTurn ||
    player.hasFolded ||
    player.isAllIn
  ) {
    return [];
  }

  const amountToCall = getAmountToCall(state, position);
  const minimumAggressiveAmount =
    state.currentBet === 0
      ? getMinimumBetAmount()
      : getMinimumRaiseToAmount(state);

  if (amountToCall === 0) {
    if (state.currentBet > 0) {
      return [
        { type: "check", label: "Check" },
        {
          type: "raise",
          label: "Raise",
          minimumAmount: minimumAggressiveAmount,
        },
      ];
    }

    return [
      { type: "check", label: "Check" },
      { type: "bet", label: "Bet", minimumAmount: getMinimumBetAmount() },
    ];
  }

  return [
    { type: "fold", label: "Fold" },
    {
      type: "call",
      label: `Call ${formatAmount(amountToCall)}`,
      amount: amountToCall,
    },
    {
      type: "raise",
      label: "Raise",
      minimumAmount: minimumAggressiveAmount,
    },
  ];
}

export function applyHoldemAction(
  state: HoldemGameState,
  action: HoldemAction,
): HoldemGameState {
  const stateWithActionLog = appendActionLog(state, action);
  const player = state.players[state.currentTurn];

  if (!player) {
    throw new Error("No current player to act.");
  }

  const availableActions = getAvailableActions(state, state.currentTurn);

  if (
    !availableActions.some(
      (availableAction) => availableAction.type === action.type,
    )
  ) {
    throw new Error(`Action ${action.type} is not available.`);
  }

  if (action.type === "fold") {
    return maybeAdvanceAfterAction(
      updateCurrentPlayer(stateWithActionLog, (currentPlayer) => ({
        ...currentPlayer,
        hasFolded: true,
        hasActed: true,
      })),
    );
  }

  if (action.type === "check") {
    return maybeAdvanceAfterAction(
      updateCurrentPlayer(stateWithActionLog, (currentPlayer) => ({
        ...currentPlayer,
        hasActed: true,
      })),
    );
  }

  if (action.type === "call") {
    const amountToCall = getAmountToCall(state, state.currentTurn);

    return maybeAdvanceAfterAction({
      ...updateCurrentPlayer(stateWithActionLog, (currentPlayer) =>
        putChipsIn(currentPlayer, amountToCall),
      ),
      pot: state.pot + amountToCall,
    });
  }

  if (action.type === "bet") {
    if (state.currentBet !== 0 || action.amount < getMinimumBetAmount()) {
      throw new Error("Invalid bet amount.");
    }

    const stateAfterBet = updateCurrentPlayer(
      stateWithActionLog,
      (currentPlayer) => putChipsIn(currentPlayer, action.amount),
    );

    return maybeAdvanceAfterAction({
      ...stateAfterBet,
      pot: state.pot + action.amount,
      currentBet: action.amount,
      minimumRaise: 1,
      lastAggressorPosition: state.currentTurn,
      players: resetOtherPlayersActedAfterAggression(
        stateAfterBet.players,
        state.currentTurn,
      ),
    });
  }

  const amountToCall = getAmountToCall(state, state.currentTurn);
  const minimumRaiseToAmount = getMinimumRaiseToAmount(state);
  const raiseIncrease = action.amount - state.currentBet;

  if (action.amount < minimumRaiseToAmount || raiseIncrease <= 0) {
    throw new Error("Raise must be at least the minimum raise.");
  }

  const stateAfterRaise = updateCurrentPlayer(
    stateWithActionLog,
    (currentPlayer) => putChipsIn(currentPlayer, amountToCall + raiseIncrease),
  );

  return maybeAdvanceAfterAction({
    ...stateAfterRaise,
    pot: state.pot + amountToCall + raiseIncrease,
    currentBet: action.amount,
    minimumRaise: 1,
    lastAggressorPosition: state.currentTurn,
    players: resetOtherPlayersActedAfterAggression(
      stateAfterRaise.players,
      state.currentTurn,
    ),
  });
}
