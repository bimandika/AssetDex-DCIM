import React from 'react';

interface DifferenceHighlighterProps {
  value: string | number;
  isDifferent: boolean;
  type?: string;
}

const DifferenceHighlighter: React.FC<DifferenceHighlighterProps> = ({ value, isDifferent, type }) => {
  // TODO: Highlight differences visually
  return (
    <span className={isDifferent ? 'bg-yellow-100 text-yellow-800 font-bold px-2 rounded' : 'text-gray-700'}>
      {value}
    </span>
  );
};

export default DifferenceHighlighter;
