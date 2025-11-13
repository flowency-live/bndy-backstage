interface ScoreProgressBarProps {
  scorePercentage: number;
}

export default function ScoreProgressBar({ scorePercentage }: ScoreProgressBarProps) {
  // Clamp score between 0 and 100
  const score = Math.max(0, Math.min(100, scorePercentage));

  // Determine the color based on score ranges
  // 0-40%: Red dominant
  // 40-70%: Amber dominant
  // 70-100%: Green dominant
  const getGradientColor = () => {
    if (score <= 40) {
      // Red to Amber transition
      const ratio = score / 40;
      return `linear-gradient(to right,
        rgb(239, 68, 68) 0%,
        rgb(251, 146, 60) ${score}%,
        rgb(229, 231, 235) ${score}%)`;
    } else if (score <= 70) {
      // Amber dominant
      const ratio = (score - 40) / 30;
      return `linear-gradient(to right,
        rgb(239, 68, 68) 0%,
        rgb(251, 146, 60) ${40}%,
        rgb(245, 158, 11) ${score}%,
        rgb(229, 231, 235) ${score}%)`;
    } else {
      // Amber to Green transition
      return `linear-gradient(to right,
        rgb(239, 68, 68) 0%,
        rgb(251, 146, 60) 40%,
        rgb(245, 158, 11) 70%,
        rgb(34, 197, 94) ${score}%,
        rgb(229, 231, 235) ${score}%)`;
    }
  };

  return (
    <div
      className="w-[70px] h-[14px] rounded-full overflow-hidden border border-gray-300"
      title={`Score: ${score}%`}
      style={{
        background: getGradientColor()
      }}
    />
  );
}
