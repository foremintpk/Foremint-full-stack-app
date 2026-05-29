import React from 'react';

export const ICON_EMOJI_MAP: Record<string, string> = {
  package: '📦',
  monitor: '💻',
  megaphone: '📣',
  zap: '⚡',
  plane: '✈️',
  users: '👥',
  receipt: '🧾',
  'more-horizontal': '•••',
};

interface ExpenseCategoryBadgeProps {
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

export function ExpenseCategoryBadge({ category }: ExpenseCategoryBadgeProps) {
  const emoji = ICON_EMOJI_MAP[category.icon] || '🏷️';
  
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
      style={{
        backgroundColor: `${category.color}26`, // 15% opacity
        color: category.color,
        borderColor: `${category.color}40`, // 25% opacity
      }}
    >
      <span>{emoji}</span>
      <span>{category.name}</span>
    </span>
  );
}
