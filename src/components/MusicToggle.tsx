import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX } from "lucide-react";

// Sauti tu — faili kwenye public/music/ (mp3 au webm)
const MUSIC_SRC =
  (import.meta.env.VITE_MUSIC_URL as string | undefined) || "/music/worship.webm";

export function MusicToggle() {
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = 0.55;
    audio.preload = "auto";

    const markReady = () => setReady(true);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("loadeddata", markReady);
    audio.addEventListener("canplay", markReady);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("loadeddata", markReady);
      audio.removeEventListener("canplay", markReady);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-gold text-primary shadow-warm transition hover:scale-105"
      aria-label={playing ? "Simamisha muziki" : "Cheza muziki (sauti tu)"}
      title={playing ? "Simamisha" : ready ? "Cheza muziki" : "Bonyeza kucheza sauti"}
    >
      {playing ? <Music2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
