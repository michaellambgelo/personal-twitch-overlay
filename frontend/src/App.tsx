import { useStreamData } from './hooks/useStreamData';
import { useChat } from './hooks/useChat';
import { ChatBox } from './components/ChatBox';
import { StreamInfo } from './components/StreamInfo';
import { Watermark } from './components/Watermark';

const DEFAULT_CHANNEL = import.meta.env.VITE_CHANNEL || '';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get('channel') || DEFAULT_CHANNEL;

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-gray-900">
        <p className="text-lg font-mono">
          Add <code className="bg-gray-800 px-2 py-1 rounded">?channel=your_channel</code> to the URL
        </p>
      </div>
    );
  }

  return <Overlay channel={channel} />;
}

function Overlay({ channel }: { channel: string }) {
  const { streamData, badgeMap } = useStreamData(channel);
  const { messages } = useChat(channel, badgeMap);

  return (
    <div className="w-screen h-screen">
      <Watermark />
      <StreamInfo streamData={streamData} />
      <ChatBox messages={messages} />
    </div>
  );
}
