# Realtime Database Structure Example

This is only a planning document. Do not connect to or write real Realtime Database data from this file.

```text
rooms/{roomId}
  info
    id
    name
    createdAt
    createdByPlayerId
  settings
    currency
    smallBlind
    bigBlind
    maxPlayers
  players
    {playerId}
      id
      displayName
      joinedAt
      isHost
  currentHand
    id
    sessionId
    dealerPlayerId
    startedAt
  actions
    {actionId}
      id
      handId
      playerId
      action
      amount
      createdAt
  settlements
    {settlementId}
      id
      roomId
      fromPlayerId
      toPlayerId
      amount
      createdAt
```
