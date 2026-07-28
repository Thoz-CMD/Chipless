# Chipless Texas Hold'em Game Flow

This logic follows Texas Hold'em turn order, with Chipless House Rules for
betting amounts. The raise rule is intentionally not standard No-Limit Texas
Hold'em.

- 2-9 players are supported by the state model.
- With 3+ players, the player left of the dealer posts SB and the next player posts BB.
- Pre-flop action starts with the first active player left of BB.
- Flop, turn, and river action starts with the first active player left of the dealer.
- A betting round ends only when every active non-all-in player has acted and matched the current bet, or all but one player folded.

For three players:

- A is dealer/button.
- B is small blind.
- C is big blind.
- If BB is 2, SB is 1 and the initial pot is 3.
- Pre-flop action order is A, B, C.
- Post-flop action order is B, C, A.

Action rules:

- If `amountToCall === 0` and no bet exists in the round, show `Check` and `Bet`.
- If `amountToCall === 0` while a live bet exists, show `Check` and `Raise`. This covers the pre-flop BB option when nobody raised.
- If `amountToCall > 0`, show `Fold`, `Call {amountToCall}`, and `Raise`.
- Never show `Bet` after a live bet exists.
- Never show `Call` when `amountToCall` is 0.
- Chipless House Rule: when a live bet exists, minimum `Raise To` is always
  `currentBet + 1`.
- Do not use the standard last-raise-size rule for minimum raises.
- Example: if `currentBet` is 2, the minimum raise is `Raise 3`. After that
  raise, `currentBet` is 3 and the next minimum raise is `Raise 4`.

Round transitions:

- Pre-flop to flop: all active players have matched the current bet or folded.
- Flop to turn: betting starts fresh with `currentBet = 0`; three community cards should be visible.
- Turn to river: betting starts fresh with `currentBet = 0`; the fourth community card should be visible.
- River to showdown: after river betting completes, if more than one player remains, compare hands and award pot.
