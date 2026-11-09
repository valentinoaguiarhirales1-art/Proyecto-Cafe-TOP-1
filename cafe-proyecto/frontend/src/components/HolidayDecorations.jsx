import { useEffect, useState } from 'react';
import { Snowflake } from 'lucide-react';

const snowflakes = Array.from({ length: 16 }, (_, index) => ({
  left: `${(index * 37 + 8) % 100}%`,
  delay: `${(index % 8) * -2.7}s`,
  duration: `${18 + (index % 5) * 3}s`,
  size: `${9 + (index % 4) * 3}px`,
}));

function HollySprig({ className }) {
  return (
    <svg className={className} viewBox="0 0 150 140" fill="none" aria-hidden="true">
      <path d="M7 8C31 33 45 53 73 79c19 18 42 34 68 51" stroke="#315b3e" strokeWidth="5" strokeLinecap="round" />
      <path d="M25 29C13 17 10 5 12 1c13 3 22 10 27 23-8-4-14-3-14 5ZM45 49C33 38 29 27 31 22c13 3 22 10 27 23-7-4-13-3-13 5ZM66 70C54 59 51 48 53 43c13 3 22 10 27 23-7-4-13-3-13 5ZM90 92C80 80 78 68 80 63c13 4 21 12 25 25-7-5-13-4-15 4ZM112 111C103 99 102 87 104 82c12 5 20 13 23 26-7-5-13-5-15 3Z" fill="#39704a" stroke="#58825b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M38 40C26 40 17 45 14 49c9 8 19 11 31 8-7-4-9-9-7-17ZM60 61C48 62 39 68 37 72c9 7 20 9 31 5-7-3-10-8-8-16ZM83 84C71 86 63 92 61 96c10 6 21 7 31 2-7-3-10-7-9-14ZM107 105C96 108 88 115 87 119c10 5 21 5 31-1-8-2-11-6-11-13Z" fill="#244a35" stroke="#477453" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="49" cy="31" r="6" fill="#c44748" stroke="#f0c77c" strokeWidth="1.5" />
      <circle cx="74" cy="53" r="6" fill="#b83e45" stroke="#f0c77c" strokeWidth="1.5" />
      <circle cx="99" cy="77" r="6" fill="#c44748" stroke="#f0c77c" strokeWidth="1.5" />
      <circle cx="122" cy="102" r="6" fill="#b83e45" stroke="#f0c77c" strokeWidth="1.5" />
    </svg>
  );
}

export default function HolidayDecorations() {
  const [showCornerSprigs, setShowCornerSprigs] = useState(true);

  useEffect(() => {
    const updateCornerSprigs = () => setShowCornerSprigs(window.scrollY < 120);
    window.addEventListener('scroll', updateCornerSprigs, { passive: true });
    updateCornerSprigs();
    return () => window.removeEventListener('scroll', updateCornerSprigs);
  }, []);

  return (
    <>
      <div className="holiday-decorations" aria-hidden="true">
      {snowflakes.map((flake, index) => (
        <span
          key={index}
          className="holiday-snowflake"
          style={{
            '--snow-left': flake.left,
            '--snow-delay': flake.delay,
            '--snow-duration': flake.duration,
            '--snow-size': flake.size,
          }}
        >
          <Snowflake size={16} aria-hidden="true" />
        </span>
      ))}
      </div>
      {showCornerSprigs && (
        <div className="holiday-holly-frame" aria-hidden="true">
          <HollySprig className="holiday-holly holiday-holly--left" />
          <HollySprig className="holiday-holly holiday-holly--right" />
        </div>
      )}
    </>
  );
}
