// Standard Indian veg / non-veg food symbol
export default function VegMark({ isVeg = true, className = '' }) {
  const color = isVeg ? 'border-green-600' : 'border-red-700';
  return (
    <span
      role="img"
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      title={isVeg ? 'Veg' : 'Non-veg'}
      className={`inline-flex w-4 h-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] bg-white ${color} ${className}`}
    >
      {isVeg ? (
        <span className="w-2 h-2 rounded-full bg-green-600" />
      ) : (
        <span className="w-0 h-0 border-x-[4px] border-x-transparent border-b-[7px] border-b-red-700" />
      )}
    </span>
  );
}
