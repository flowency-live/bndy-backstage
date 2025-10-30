interface RagStripProps {
  ragStatus: Record<string, { status: string; updated_at: string }>;
  memberCount: number;
  currentUserId: string;
}

export default function RagStrip({ ragStatus, memberCount, currentUserId }: RagStripProps) {
  const stripHeight = 48; // Match card thumbnail height
  const sectionHeight = stripHeight / memberCount;

  const userIds = Object.keys(ragStatus || {});

  return (
    <div
      className="w-1.5 flex flex-col rounded-l-md overflow-hidden"
      style={{ height: `${stripHeight}px` }}
    >
      {Array.from({ length: memberCount }).map((_, index) => {
        const userId = userIds[index];
        const status = userId ? ragStatus[userId]?.status : null;
        const isCurrentUser = userId === currentUserId;

        return (
          <div
            key={userId || `empty-${index}`}
            style={{ height: `${sectionHeight}px` }}
            className={`
              w-full transition-colors duration-200
              ${status === 'RED' ? 'bg-red-500' : ''}
              ${status === 'AMBER' ? 'bg-amber-500' : ''}
              ${status === 'GREEN' ? 'bg-green-500' : ''}
              ${!status ? 'bg-muted' : ''}
              ${isCurrentUser ? 'ring-1 ring-white' : ''}
            `}
            title={status ? `${status}` : 'Not set'}
          />
        );
      })}
    </div>
  );
}
