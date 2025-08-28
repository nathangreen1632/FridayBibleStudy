import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(): Socket {
  const ref = useRef<Socket | null>(null);
  ref.current ??= io('/', {autoConnect: true, transports: ['websocket']});
  useEffect(() => {
    const s = ref.current!;
    return () => { s.off(); };
  }, []);
  return ref.current;
}
