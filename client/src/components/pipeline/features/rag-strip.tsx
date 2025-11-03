interface RagStripProps {
  ragStatus: Record<string, { status: string; updated_at: string }>;
  memberCount: number;
  currentUserId: string;
}

export default function RagStrip({ ragStatus, memberCount, currentUserId }: RagStripProps) {
  const stripHeight = 48; // Match card thumbnail height

  // Get all users who have set a RAG status
  const userStatuses = Object.entries(ragStatus || {}).map(([userId, data]) => ({
    userId,
    status: data.status,
    isCurrentUser: userId === currentUserId
  }));

  // Calculate section height based on actual number of statuses set
  const statusCount = userStatuses.length || 1; // At least 1 to avoid division by zero
  const sectionHeight = stripHeight / statusCount;

  // If no statuses set, show empty strip
  if (userStatuses.length === 0) {
    return (
      <div
        className="w-1.5 bg-muted rounded-l-md"
        style={{ height: `${stripHeight}px` }}
        title="No RAG status set"
      />
    );
  }

  return (
    <div
      className="w-1.5 flex flex-col rounded-l-md overflow-hidden"
      style={{ height: `${stripHeight}px` }}
    >
      {userStatuses.map(({ userId, status, isCurrentUser }) => (
        <div
          key={userId}
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
      ))}
    </div>
  );
}
