import type { Card, CardValue, StandardColor } from "@/lib/uno";
import clsx from "clsx";

interface UnoCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

interface HiddenCardProps {
  count?: number;
}

const colorClasses: Record<StandardColor, string> = {
  red: "from-red-500 to-red-700 border-red-400",
  yellow: "from-yellow-400 to-amber-500 border-amber-300",
  green: "from-emerald-500 to-emerald-700 border-emerald-400",
  blue: "from-sky-500 to-blue-700 border-blue-400",
};

const wildClasses =
  "from-slate-700 via-slate-900 to-black border-lime-300 shadow-[0_0_16px_rgba(250,204,21,0.35)]";

const valueMap: Record<CardValue, string> = {
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
  skip: "⛔",
  reverse: "↺",
  "draw-two": "+2",
  wild: "🌈",
  "wild-draw-four": "+4",
};

const textMap: Record<CardValue, string> = {
  "0": "صفر",
  "1": "واحد",
  "2": "اثنان",
  "3": "ثلاثة",
  "4": "أربعة",
  "5": "خمسة",
  "6": "ستة",
  "7": "سبعة",
  "8": "ثمانية",
  "9": "تسعة",
  skip: "تخطي",
  reverse: "عكس",
  "draw-two": "اسحب 2",
  wild: "متغير",
  "wild-draw-four": "اسحب 4",
};

export const UnoCard = ({
  card,
  onClick,
  disabled,
  highlight,
}: UnoCardProps) => {
  const isWild = card.color === "wild";
  const background = isWild
    ? wildClasses
    : colorClasses[card.color as StandardColor];

  const content = (
    <div
      className={clsx(
        "relative flex h-32 w-20 items-center justify-center rounded-2xl border-2 text-white transition-transform duration-150",
        "shadow-lg hover:-translate-y-1",
        disabled && "opacity-40 hover:translate-y-0",
        highlight && "ring-4 ring-white/80",
        `bg-gradient-to-br ${background}`,
      )}
    >
      <span className="text-3xl font-black drop-shadow">
        {valueMap[card.value]}
      </span>
      <span className="absolute bottom-2 text-xs font-semibold tracking-tight">
        {textMap[card.value]}
      </span>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus:outline-none"
    >
      {content}
    </button>
  );
};

export const HiddenCard = ({ count }: HiddenCardProps) => (
  <div className="relative h-32 w-20">
    <div className="absolute inset-0 rounded-2xl border-2 border-slate-400 bg-slate-800 shadow-lg" />
    {typeof count === "number" && (
      <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-slate-200">
        {count}
      </span>
    )}
  </div>
);
