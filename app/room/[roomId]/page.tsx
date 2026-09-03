import { RoomClient } from './RoomClient';

interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ host?: string }>;
}

export default async function RoomPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <RoomClient
      roomId={resolvedParams.roomId}
      isHostParam={resolvedSearchParams.host === 'true'}
    />
  );
}
