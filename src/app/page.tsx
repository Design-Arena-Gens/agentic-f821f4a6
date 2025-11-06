"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STANDARD_COLORS,
  drawCard,
  initializeGame,
  isCardPlayable,
  passTurn,
  playCard,
  selectColor,
  takeAiTurn,
  type Card,
  type GameState,
  type Player,
  type StandardColor,
} from "@/lib/uno";
import { HiddenCard, UnoCard } from "@/components/uno-card";
import clsx from "clsx";

const colorAccent: Record<StandardColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

const colorNames: Record<StandardColor, string> = {
  red: "الأحمر",
  yellow: "الأصفر",
  green: "الأخضر",
  blue: "الأزرق",
};

const opponentOrder = (players: Player[]) =>
  players.filter((player) => !player.isHuman);

const topCard = (state: GameState | undefined): Card | undefined =>
  state?.discardPile[state.discardPile.length - 1];

export default function Home() {
  const [game, setGame] = useState<GameState>(() => initializeGame());

  useEffect(() => {
    if (game.phase !== "playing") {
      return;
    }
    const current = game.players[game.currentPlayerIndex];
    if (!current || current.isHuman) {
      return;
    }

    const timer = setTimeout(() => {
      setGame((prev) => takeAiTurn(prev));
    }, 900);

    return () => clearTimeout(timer);
  }, [game]);

  const currentPlayer = useMemo(
    () => game.players[game.currentPlayerIndex],
    [game.players, game.currentPlayerIndex],
  );

  const handlePlay = (cardId: string) => {
    setGame((prev) => playCard(prev, cardId));
  };

  const handleDraw = () => {
    setGame((prev) => drawCard(prev));
  };

  const handlePass = () => {
    setGame((prev) => passTurn(prev));
  };

  const handleColorSelect = (color: StandardColor) => {
    setGame((prev) => selectColor(prev, color));
  };

  const handleNewGame = () => {
    setGame(initializeGame());
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-6xl rounded-3xl bg-white/30 p-6 shadow-2xl backdrop-blur-xl md:p-10">
        <header className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              لعبة أونو الكاملة
            </h1>
            <p className="mt-2 text-lg text-white/80">
              تحدَّ أصدقاءك الافتراضيين واستمتع بقواعد أونو الأصلية
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewGame}
            className="rounded-full bg-white/90 px-6 py-2 text-base font-semibold text-indigo-800 shadow-lg transition hover:bg-white"
          >
            جولة جديدة
          </button>
        </header>

        {game.phase === "finished" && game.winnerId && (
          <div className="mt-6 rounded-2xl bg-emerald-500/90 px-6 py-4 text-lg font-semibold text-white shadow-lg">
            تهانينا! فاز{" "}
            {
              game.players.find((player) => player.id === game.winnerId)
                ?.name
            }
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {opponentOrder(game.players).map((player) => (
            <div
              key={player.id}
              className={clsx(
                "rounded-2xl bg-white/70 p-4 shadow-md transition",
                currentPlayer.id === player.id && "ring-4 ring-white/80",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-slate-900">
                  {player.name}
                </span>
                <span className="text-sm text-slate-600">
                  {player.hand.length} بطاقات
                </span>
              </div>
              <div className="mt-4 flex justify-center">
                <HiddenCard count={player.hand.length} />
              </div>
              {player.saidUno && (
                <p className="mt-3 text-center text-sm font-semibold text-amber-600">
                  أونو!
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="mt-10 flex flex-col gap-6 rounded-3xl bg-white/80 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">الدور الحالي:</span>
                <span className="rounded-full bg-indigo-600/90 px-4 py-1 text-sm font-semibold text-white shadow">
                  {currentPlayer.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">اللون الفعّال:</span>
                <span
                  className={clsx(
                    "flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold text-white shadow",
                    colorAccent[game.currentColor],
                  )}
                >
                  <span className="inline-block h-3 w-3 rounded-full bg-white" />
                  {colorNames[game.currentColor]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-600">
              الاتجاه:
              <span className="text-lg">
                {game.direction === 1 ? "↷" : "↶"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">
                  كومة السحب
                </span>
                <HiddenCard />
                <span className="text-xs text-slate-500">
                  {game.drawPile.length} بطاقة
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">
                  كومة الرمي
                </span>
                {topCard(game) ? (
                  <UnoCard card={topCard(game)!} />
                ) : (
                  <HiddenCard />
                )}
                <span className="text-xs text-slate-500">
                  {game.discardPile.length} بطاقة
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <button
                type="button"
                onClick={handleDraw}
                disabled={
                  game.phase !== "playing" ||
                  !currentPlayer.isHuman ||
                  game.drawnCardId !== undefined
                }
                className={clsx(
                  "rounded-full px-4 py-3 text-base font-semibold text-white shadow transition",
                  currentPlayer.isHuman
                    ? "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
                    : "bg-indigo-300",
                )}
              >
                اسحب بطاقة
              </button>
              <button
                type="button"
                onClick={handlePass}
                disabled={
                  !currentPlayer.isHuman ||
                  game.phase !== "playing" ||
                  game.drawnCardId === undefined
                }
                className={clsx(
                  "rounded-full px-4 py-3 text-base font-semibold text-indigo-700 shadow transition",
                  game.drawnCardId
                    ? "bg-white hover:bg-indigo-50"
                    : "bg-white/70 cursor-not-allowed text-indigo-300",
                )}
              >
                إنهاء الدور
              </button>
              {game.phase === "choose-color" &&
                game.pendingColor?.playerId === currentPlayer.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700">
                    اختر اللون:
                    {STANDARD_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={clsx(
                          "h-8 w-8 rounded-full border-2 border-white shadow",
                          colorAccent[color],
                        )}
                      >
                        <span className="sr-only">{colorNames[color]}</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl bg-white/80 p-6 shadow-xl">
          <div
            className={clsx(
              "mb-4 flex items-center justify-between",
              currentPlayer.isHuman && "text-indigo-800",
            )}
          >
            <h2 className="text-2xl font-semibold">
              يدك ({currentPlayer.hand.length} بطاقة)
            </h2>
            {currentPlayer.saidUno && (
              <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
                أونو!
              </span>
            )}
          </div>

          <div className="flex flex-row-reverse flex-wrap gap-2 md:flex-nowrap md:overflow-x-auto">
            {currentPlayer.hand.map((card) => (
              <UnoCard
                key={card.id}
                card={card}
                onClick={() => handlePlay(card.id)}
                disabled={
                  !currentPlayer.isHuman ||
                  game.phase !== "playing" ||
                  !isCardPlayable(game, card) ||
                  !!game.pendingColor
                }
                highlight={isCardPlayable(game, card) && currentPlayer.isHuman}
              />
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl bg-white/70 p-5 shadow-inner">
            <h3 className="text-lg font-semibold text-indigo-800">
              سجّل الأحداث
            </h3>
            <ul className="mt-4 flex max-h-60 flex-col gap-2 overflow-y-auto pr-2 text-sm text-slate-700">
              {game.log.map((entry, index) => (
                <li
                  key={`${entry}-${index.toString()}`}
                  className="rounded-xl bg-white/70 px-4 py-2 shadow"
                >
                  {entry}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white/70 p-5 text-sm text-slate-700 shadow-inner">
            <h3 className="text-lg font-semibold text-indigo-800">
              حالة اللعبة
            </h3>
            <ul className="mt-3 space-y-2">
              <li>عدد الأدوار: {game.turnCount}</li>
              <li>عدد بطاقات السحب: {game.drawPile.length}</li>
              <li>عدد بطاقات الرمي: {game.discardPile.length}</li>
              {game.phase === "finished" && game.winnerId && (
                <li className="font-semibold text-emerald-600">
                  الفائز:{" "}
                  {
                    game.players.find((player) => player.id === game.winnerId)
                      ?.name
                  }
                </li>
              )}
              {game.phase === "choose-color" && (
                <li className="font-semibold text-amber-600">
                  بانتظار اختيار اللون
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
