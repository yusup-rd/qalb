import type { AudioPlayer, AudioStatus } from "expo-audio";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type QuranAudioContextValue = {
  activeUrl: string | null;
  queueActive: boolean;
  status: AudioStatus | null;
  play: (url: string) => Promise<void>;
  playQueue: (urls: string[]) => Promise<void>;
  pause: () => Promise<void>;
};

const QuranAudioContext = createContext<QuranAudioContextValue | null>(null);

export function QuranAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(-1);
  const [status, setStatus] = useState<AudioStatus | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [queueActive, setQueueActive] = useState(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
      console.error("Failed to configure Quran audio mode.", error);
    });
  }, []);

  useEffect(() => {
    const player = createAudioPlayer(null);
    playerRef.current = player;

    const subscription = player.addListener(
      "playbackStatusUpdate",
      (nextStatus) => {
        setStatus(nextStatus);

        if (
          !nextStatus.didJustFinish ||
          queueIndexRef.current < 0 ||
          queueIndexRef.current >= queueRef.current.length - 1
        ) {
          if (nextStatus.didJustFinish) {
            queueRef.current = [];
            queueIndexRef.current = -1;
            setQueueActive(false);
            setActiveUrl(null);
          }
          return;
        }

        const nextIndex = queueIndexRef.current + 1;
        const nextUrl = queueRef.current[nextIndex];
        queueIndexRef.current = nextIndex;
        setActiveUrl(nextUrl);
        player.replace(nextUrl);
        void player.seekTo(0).then(() => player.play());
      },
    );

    return () => {
      subscription.remove();
      playerRef.current = null;
      player.release();
    };
  }, []);

  const play = useCallback(async (url: string) => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    queueRef.current = [];
    queueIndexRef.current = -1;
    setQueueActive(false);
    setActiveUrl(url);
    player.replace(url);
    await player.seekTo(0);
    player.play();
  }, []);

  const playQueue = useCallback(async (urls: string[]) => {
    const player = playerRef.current;
    if (!player || urls.length === 0) {
      return;
    }

    queueRef.current = urls;
    queueIndexRef.current = 0;
    setQueueActive(true);
    setActiveUrl(urls[0]);
    player.replace(urls[0]);
    await player.seekTo(0);
    player.play();
  }, []);

  const pause = useCallback(async () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    queueRef.current = [];
    queueIndexRef.current = -1;
    setQueueActive(false);
    player.pause();
    await player.seekTo(0);
  }, []);

  return (
    <QuranAudioContext.Provider
      value={{ activeUrl, queueActive, status, play, playQueue, pause }}
    >
      {children}
    </QuranAudioContext.Provider>
  );
}

export function useQuranAudio() {
  const context = useContext(QuranAudioContext);

  if (!context) {
    throw new Error("useQuranAudio must be used inside QuranAudioProvider");
  }

  return context;
}
