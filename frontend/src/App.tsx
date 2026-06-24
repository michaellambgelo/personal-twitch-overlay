import { useStreamData } from './hooks/useStreamData';
import { useTmiClient } from './hooks/useTmiClient';
import { useChat } from './hooks/useChat';
import { useAlerts } from './hooks/useAlerts';
import { useThirdPartyEmotes } from './hooks/useThirdPartyEmotes';
import { ChatBox } from './components/ChatBox';
import { StreamInfo } from './components/StreamInfo';
import { AlertOverlay } from './components/AlertOverlay';
import { Watermark } from './components/Watermark';
import { parseConfig, type OverlayConfig } from './config';

const DEFAULT_CHANNEL = import.meta.env.VITE_CHANNEL || '';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get('channel') || DEFAULT_CHANNEL;
  const config = parseConfig(params);

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-gray-900">
        <p className="text-lg font-mono">
          Add <code className="bg-gray-800 px-2 py-1 rounded">?channel=your_channel</code> to the URL
        </p>
      </div>
    );
  }

  return <Overlay channel={channel} config={config} />;
}

function Overlay({ channel, config }: { channel: string; config: OverlayConfig }) {
  const { streamData, badgeMap } = useStreamData(channel);
  const { client } = useTmiClient(channel);
  const { messages } = useChat(client, badgeMap, channel, config.maxMessages);
  const { alert } = useAlerts(client);
  const thirdPartyEmotes = useThirdPartyEmotes(channel);

  return (
    <div className="w-screen h-screen">
      {!config.hideWatermark && <Watermark />}
      {!config.hideInfo && <StreamInfo streamData={streamData} />}
      <AlertOverlay alert={alert} accent={config.accent} />
      {!config.hideChat && (
        <ChatBox
          messages={messages}
          thirdPartyEmotes={thirdPartyEmotes}
          position={config.chatPosition}
          fontScale={config.fontScale}
          accent={config.accent}
        />
      )}
    </div>
  );
}
