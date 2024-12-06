export const STATUS_COLORS = ['#FFBB28', '#0088FE', '#00C49F'];

export const generateTagColor = (tag: string, index: number): string => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6'];
  return colors[index % colors.length];
}; 