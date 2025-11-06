export type StandardColor = "red" | "yellow" | "green" | "blue";

export type CardColor = StandardColor | "wild";

export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw-two"
  | "wild"
  | "wild-draw-four";

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isHuman: boolean;
  saidUno: boolean;
}

export type GamePhase = "playing" | "choose-color" | "finished";

export interface PendingColorSelection {
  playerId: string;
  cardId: string;
  nextPlayerIndex: number;
  value: "wild" | "wild-draw-four";
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  drawPile: Card[];
  discardPile: Card[];
  currentColor: StandardColor;
  pendingColor?: PendingColorSelection;
  phase: GamePhase;
  winnerId?: string;
  log: string[];
  drawnCardId?: string;
  lastPlayedCard?: Card;
  turnCount: number;
}

export const STANDARD_COLORS: StandardColor[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

const STARTING_HAND_SIZE = 7;
const LOG_LIMIT = 60;

const clonePlayers = (players: Player[]): Player[] =>
  players.map((player) => ({
    ...player,
    hand: [...player.hand],
  }));

const addLogEntry = (log: string[], entry: string): string[] => {
  const next = [entry, ...log];
  return next.slice(0, LOG_LIMIT);
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;

  const createCard = (color: CardColor, value: CardValue): Card => ({
    id: `card-${idCounter++}`,
    color,
    value,
  });

  for (const color of STANDARD_COLORS) {
    deck.push(createCard(color, "0"));
    for (const value of ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const) {
      deck.push(createCard(color, value));
      deck.push(createCard(color, value));
    }
    for (const value of ["skip", "reverse", "draw-two"] as const) {
      deck.push(createCard(color, value));
      deck.push(createCard(color, value));
    }
  }

  for (let i = 0; i < 4; i += 1) {
    deck.push(createCard("wild", "wild"));
    deck.push(createCard("wild", "wild-draw-four"));
  }

  return deck;
};

export const shuffleCards = (cards: Card[]): Card[] => {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const getNextPlayerIndex = (
  currentIndex: number,
  direction: 1 | -1,
  totalPlayers: number,
) => (currentIndex + direction + totalPlayers) % totalPlayers;

const ensureDrawPile = (
  drawPile: Card[],
  discardPile: Card[],
): { drawPile: Card[]; discardPile: Card[] } => {
  if (drawPile.length > 0) {
    return { drawPile, discardPile };
  }
  if (discardPile.length <= 1) {
    return { drawPile, discardPile };
  }

  const topCard = discardPile[discardPile.length - 1];
  const rest = discardPile.slice(0, -1);
  const shuffled = shuffleCards(rest);

  return {
    drawPile: shuffled,
    discardPile: [topCard],
  };
};

const drawCardsForPlayer = (
  players: Player[],
  playerIndex: number,
  drawPile: Card[],
  discardPile: Card[],
  count: number,
) => {
  let nextDrawPile = [...drawPile];
  let nextDiscardPile = [...discardPile];
  const nextPlayers = clonePlayers(players);
  const drawnCards: Card[] = [];

  for (let i = 0; i < count; i += 1) {
    const ensured = ensureDrawPile(nextDrawPile, nextDiscardPile);
    nextDrawPile = ensured.drawPile;
    nextDiscardPile = ensured.discardPile;

    if (nextDrawPile.length === 0) {
      break;
    }

    const card = nextDrawPile.shift()!;
    drawnCards.push(card);
    nextPlayers[playerIndex].hand.push(card);
    nextPlayers[playerIndex].saidUno =
      nextPlayers[playerIndex].hand.length === 1;
  }

  return {
    players: nextPlayers,
    drawPile: nextDrawPile,
    discardPile: nextDiscardPile,
    drawnCards,
  };
};

export const initializeGame = (): GameState => {
  const playerNames = ["أنت", "ليلى", "سالم", "آدم"];
  const deck = shuffleCards(createDeck());

  let players: Player[] = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    hand: [],
    isHuman: index === 0,
    saidUno: false,
  }));

  let drawPile = [...deck];
  const discardPile: Card[] = [];

  for (let index = 0; index < players.length; index += 1) {
    const drawResult = drawCardsForPlayer(
      players,
      index,
      drawPile,
      discardPile,
      STARTING_HAND_SIZE,
    );
    players = drawResult.players;
    drawPile = drawResult.drawPile;
  }

  let starter: Card | undefined;

  while (!starter) {
    const ensured = ensureDrawPile(drawPile, discardPile);
    drawPile = ensured.drawPile;
    if (drawPile.length === 0) {
      break;
    }
    const candidate = drawPile.shift()!;
    if (candidate.value === "wild-draw-four") {
      drawPile.push(candidate);
      continue;
    }
    starter = candidate;
  }

  if (!starter) {
    throw new Error("حدث خطأ أثناء إنشاء اللعبة");
  }

  discardPile.push(starter);

  const state: GameState = {
    players,
    currentPlayerIndex: 0,
    direction: 1,
    drawPile,
    discardPile,
    currentColor:
      starter.color === "wild"
        ? STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)]
        : starter.color,
    phase: "playing",
    log: addLogEntry([], `البطاقة الأولى هي ${describeCard(starter)}`),
    turnCount: 0,
  };

  return applyCardEffectIfNeeded(state, starter, {
    playedByIndex: -1,
    isInitial: true,
  });
};

const describeCard = (card: Card) => {
  const colorLabels: Record<CardColor, string> = {
    red: "أحمر",
    yellow: "أصفر",
    green: "أخضر",
    blue: "أزرق",
    wild: "متعدد الألوان",
  };

  const valueLabels: Record<CardValue, string> = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    skip: "تخطي",
    reverse: "عكس",
    "draw-two": "اسحب 2",
    wild: "متغير",
    "wild-draw-four": "اسحب 4 متغير",
  };

  if (card.color === "wild") {
    return valueLabels[card.value];
  }
  return `${valueLabels[card.value]} ${colorLabels[card.color]}`;
};

const applyCardEffectIfNeeded = (
  state: GameState,
  card: Card,
  options: { playedByIndex: number; isInitial?: boolean },
): GameState => {
  const totalPlayers = state.players.length;

  switch (card.value) {
    case "reverse": {
      const newDirection = (state.direction * -1) as 1 | -1;
      const basePlayerIndex =
        options.playedByIndex >= 0
          ? options.playedByIndex
          : state.currentPlayerIndex;
      let nextPlayerIndex = getNextPlayerIndex(
        basePlayerIndex,
        newDirection,
        totalPlayers,
      );
      if (totalPlayers === 2 && !options.isInitial) {
        nextPlayerIndex = getNextPlayerIndex(
          nextPlayerIndex,
          newDirection,
          totalPlayers,
        );
      }
      const message = options.isInitial
        ? "البطاقة الأولى عكست اتجاه اللعب"
        : `${state.players[options.playedByIndex].name} لعب بطاقة عكس`;
      return {
        ...state,
        direction: newDirection,
        currentPlayerIndex: nextPlayerIndex,
        log: addLogEntry(state.log, message),
      };
    }
    case "skip": {
      const basePlayerIndex = options.isInitial
        ? state.currentPlayerIndex
        : options.playedByIndex;
      const skippedIndex = getNextPlayerIndex(
        basePlayerIndex,
        state.direction,
        totalPlayers,
      );
      const nextPlayerIndex = getNextPlayerIndex(
        skippedIndex,
        state.direction,
        totalPlayers,
      );
      const message = options.isInitial
        ? `البطاقة الأولى تخطي ${state.players[skippedIndex].name}`
        : `${state.players[options.playedByIndex].name} تخطى ${state.players[skippedIndex].name}`;
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        log: addLogEntry(state.log, message),
      };
    }
    case "draw-two": {
      const basePlayerIndex = options.isInitial
        ? state.currentPlayerIndex
        : options.playedByIndex;
      const targetIndex = getNextPlayerIndex(
        basePlayerIndex,
        state.direction,
        totalPlayers,
      );
      const drawResult = drawCardsForPlayer(
        state.players,
        targetIndex,
        state.drawPile,
        state.discardPile,
        2,
      );
      const nextPlayerIndex = getNextPlayerIndex(
        targetIndex,
        state.direction,
        totalPlayers,
      );
      const message = options.isInitial
        ? `البطاقة الأولى تجبر ${drawResult.players[targetIndex].name} على سحب بطاقتين`
        : `${state.players[options.playedByIndex].name} أجبر ${drawResult.players[targetIndex].name} على سحب بطاقتين`;
      return {
        ...state,
        players: drawResult.players,
        drawPile: drawResult.drawPile,
        discardPile: drawResult.discardPile,
        currentPlayerIndex: nextPlayerIndex,
        log: addLogEntry(state.log, message),
      };
    }
    default:
      return state;
  }
};

export const isCardPlayable = (state: GameState, card: Card): boolean => {
  if (state.phase !== "playing") {
    return false;
  }

  if (state.drawnCardId && state.drawnCardId !== card.id) {
    return false;
  }

  if (card.color === "wild") {
    return true;
  }

  const topCard = state.discardPile[state.discardPile.length - 1];

  if (!topCard) {
    return true;
  }

  if (card.color === state.currentColor) {
    return true;
  }

  if (card.value === topCard.value) {
    return true;
  }

  return false;
};

const chooseBestColor = (hand: Card[]): StandardColor => {
  const counts: Record<StandardColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };

  hand.forEach((card) => {
    if (STANDARD_COLORS.includes(card.color as StandardColor)) {
      counts[card.color as StandardColor] += 1;
    }
  });

  const maxCount = Math.max(...Object.values(counts));
  const candidates = STANDARD_COLORS.filter(
    (color) => counts[color] === maxCount,
  );

  if (candidates.length === 0) {
    return STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

export const playCard = (
  state: GameState,
  cardId: string,
  chosenColor?: StandardColor,
): GameState => {
  if (state.phase === "finished") {
    return state;
  }

  const player = state.players[state.currentPlayerIndex];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    return state;
  }

  if (!isCardPlayable(state, card)) {
    return state;
  }

  const nextPlayers = clonePlayers(state.players);
  const updatedHand = nextPlayers[state.currentPlayerIndex].hand.filter(
    (c) => c.id !== card.id,
  );
  nextPlayers[state.currentPlayerIndex] = {
    ...nextPlayers[state.currentPlayerIndex],
    hand: updatedHand,
    saidUno: updatedHand.length === 1,
  };

  const nextDiscardPile = [...state.discardPile, card];
  let log = addLogEntry(
    state.log,
    `${player.name} لعب ${describeCard(card)}`,
  );

  if (updatedHand.length === 0) {
    return {
      ...state,
      players: nextPlayers,
      discardPile: nextDiscardPile,
      currentColor:
        card.color === "wild"
          ? chosenColor ?? state.currentColor
          : (card.color as StandardColor),
      phase: "finished",
      winnerId: player.id,
      log: addLogEntry(log, `${player.name} هو الفائز 🎉`),
      drawnCardId: undefined,
      lastPlayedCard: card,
    };
  }

  let direction = state.direction;
  let currentColor =
    card.color === "wild"
      ? chosenColor ?? state.currentColor
      : (card.color as StandardColor);
  let drawPile = state.drawPile;
  let discardPile = nextDiscardPile;
  let players = nextPlayers;
  let pendingColor: PendingColorSelection | undefined;
  let phase: GamePhase = "playing";

  let nextPlayerIndex = getNextPlayerIndex(
    state.currentPlayerIndex,
    direction,
    state.players.length,
  );

  if (card.value === "reverse") {
    direction = (direction * -1) as 1 | -1;
    nextPlayerIndex = getNextPlayerIndex(
      state.currentPlayerIndex,
      direction,
      state.players.length,
    );
    if (state.players.length === 2) {
      nextPlayerIndex = getNextPlayerIndex(
        nextPlayerIndex,
        direction,
        state.players.length,
      );
    }
    log = addLogEntry(log, "الاتجاه انعكس");
  } else if (card.value === "skip") {
    log = addLogEntry(
      log,
      `${players[nextPlayerIndex].name} تم تخطيه`,
    );
    nextPlayerIndex = getNextPlayerIndex(
      nextPlayerIndex,
      direction,
      state.players.length,
    );
  } else if (card.value === "draw-two") {
    const drawResult = drawCardsForPlayer(
      players,
      nextPlayerIndex,
      drawPile,
      discardPile,
      2,
    );
    players = drawResult.players;
    drawPile = drawResult.drawPile;
    discardPile = drawResult.discardPile;
    log = addLogEntry(
      log,
      `${players[nextPlayerIndex].name} يسحب بطاقتين`,
    );
    nextPlayerIndex = getNextPlayerIndex(
      nextPlayerIndex,
      direction,
      state.players.length,
    );
  } else if (card.value === "wild") {
    if (!chosenColor) {
      pendingColor = {
        playerId: player.id,
        cardId: card.id,
        nextPlayerIndex,
        value: "wild",
      };
      phase = "choose-color";
      currentColor = state.currentColor;
      log = addLogEntry(log, "اختر لون البطاقة المتغيرة");
    } else {
      pendingColor = undefined;
      log = addLogEntry(log, `تم اختيار اللون ${colorLabel(chosenColor)}`);
    }
  } else if (card.value === "wild-draw-four") {
    const drawResult = drawCardsForPlayer(
      players,
      nextPlayerIndex,
      drawPile,
      discardPile,
      4,
    );
    players = drawResult.players;
    drawPile = drawResult.drawPile;
    discardPile = drawResult.discardPile;
    log = addLogEntry(
      log,
      `${players[nextPlayerIndex].name} يسحب أربع بطاقات`,
    );
    nextPlayerIndex = getNextPlayerIndex(
      nextPlayerIndex,
      direction,
      state.players.length,
    );

    if (!chosenColor) {
      pendingColor = {
        playerId: player.id,
        cardId: card.id,
        nextPlayerIndex,
        value: "wild-draw-four",
      };
      phase = "choose-color";
      currentColor = state.currentColor;
      log = addLogEntry(
        log,
        "اختر لون البطاقة المتغيرة اسحب 4",
      );
    } else {
      pendingColor = undefined;
      log = addLogEntry(log, `تم اختيار اللون ${colorLabel(chosenColor)}`);
    }
  }

  return {
    ...state,
    players,
    direction,
    drawPile,
    discardPile,
    currentPlayerIndex:
      phase === "choose-color" ? state.currentPlayerIndex : nextPlayerIndex,
    currentColor,
    pendingColor,
    phase,
    log,
    drawnCardId: undefined,
    lastPlayedCard: card,
    turnCount: state.turnCount + 1,
  };
};

export const selectColor = (
  state: GameState,
  color: StandardColor,
): GameState => {
  if (state.phase !== "choose-color" || !state.pendingColor) {
    return state;
  }

  const log = addLogEntry(
    state.log,
    `تم تثبيت اللون ${colorLabel(color)}`,
  );

  const nextPlayerIndex = state.pendingColor.nextPlayerIndex;

  return {
    ...state,
    currentColor: color,
    phase: "playing",
    pendingColor: undefined,
    currentPlayerIndex: nextPlayerIndex,
    log,
  };
};

export const drawCard = (state: GameState): GameState => {
  if (state.phase !== "playing") {
    return state;
  }

  const ensured = ensureDrawPile(state.drawPile, state.discardPile);
  const drawPile = ensured.drawPile;
  const discardPile = ensured.discardPile;

  if (drawPile.length === 0) {
    return state;
  }

  const card = drawPile.shift()!;
  const players = clonePlayers(state.players);
  players[state.currentPlayerIndex].hand.push(card);
  players[state.currentPlayerIndex].saidUno =
    players[state.currentPlayerIndex].hand.length === 1;

  const log = addLogEntry(
    state.log,
    `${players[state.currentPlayerIndex].name} يسحب بطاقة`,
  );

  return {
    ...state,
    players,
    drawPile,
    discardPile,
    log,
    drawnCardId: card.id,
  };
};

export const passTurn = (state: GameState): GameState => {
  if (state.phase !== "playing" || state.drawnCardId === undefined) {
    return state;
  }

  const nextPlayerIndex = getNextPlayerIndex(
    state.currentPlayerIndex,
    state.direction,
    state.players.length,
  );

  const log = addLogEntry(
    state.log,
    `${state.players[state.currentPlayerIndex].name} ينهي دوره`,
  );

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    drawnCardId: undefined,
    log,
  };
};

export const takeAiTurn = (state: GameState): GameState => {
  if (state.phase !== "playing") {
    return state;
  }

  const player = state.players[state.currentPlayerIndex];

  if (!player || player.isHuman) {
    return state;
  }

  const playableCards = player.hand.filter((card) =>
    isCardPlayable(state, card),
  );

  if (playableCards.length > 0) {
    const chosen = pickAiCard(playableCards);
    const color =
      chosen.color === "wild"
        ? chooseBestColor(
            player.hand.filter((card) => card.id !== chosen.id),
          )
        : undefined;
    return playCard(state, chosen.id, color);
  }

  const afterDraw = drawCard(state);

  if (afterDraw.drawnCardId) {
    const drawnCard = afterDraw.players[afterDraw.currentPlayerIndex].hand.find(
      (card) => card.id === afterDraw.drawnCardId,
    );
    if (drawnCard && isCardPlayable(afterDraw, drawnCard)) {
      const color =
        drawnCard.color === "wild"
          ? chooseBestColor(
              afterDraw.players[afterDraw.currentPlayerIndex].hand.filter(
                (card) => card.id !== drawnCard.id,
              ),
            )
          : undefined;
      return playCard(afterDraw, drawnCard.id, color);
    }
  }

  return passTurn(afterDraw);
};

const pickAiCard = (cards: Card[]): Card => {
  const priority: Record<CardValue, number> = {
    "wild-draw-four": 5,
    wild: 4,
    "draw-two": 3,
    skip: 2,
    reverse: 1,
    "9": 0,
    "8": 0,
    "7": 0,
    "6": 0,
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0,
    "0": 0,
  };

  return [...cards].sort((a, b) => {
    const priorityDiff =
      (priority[b.value] ?? 0) - (priority[a.value] ?? 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.id.localeCompare(b.id);
  })[0];
};

const colorLabel = (color: StandardColor) =>
  ({
    red: "الأحمر",
    yellow: "الأصفر",
    green: "الأخضر",
    blue: "الأزرق",
  })[color];
