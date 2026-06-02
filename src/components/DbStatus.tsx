import { Wifi, WifiOff } from 'lucide-react';

const DbStatus = ({ connected }: { connected: boolean }) => (
  <div className="flex items-center gap-1" title={connected ? 'Database connected' : 'Database disconnected'}>
    {connected ? (
      <Wifi size={12} className="text-[hsl(var(--success))]" />
    ) : (
      <WifiOff size={12} className="text-destructive" />
    )}
    <span className="text-[10px] text-muted-foreground">{connected ? 'Live' : 'Offline'}</span>
  </div>
);

export default DbStatus;
