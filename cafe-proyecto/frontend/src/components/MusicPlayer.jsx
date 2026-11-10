import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      setError('');
      try {
        await audio.play();
      } catch (playError) {
        console.error('No se pudo reproducir la música ambiental:', playError);
        setError(t('music_error'));
      }
      return;
    }

    audio.pause();
  };

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  };

  return (
    <aside className="cafe-music-player" aria-label={t('music_play')}>
      <audio
        ref={audioRef}
        src="/music/cafe-ambience.wav"
        loop
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <Music2 size={17} aria-hidden="true" className="shrink-0 text-cafe-caramel" />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? t('music_pause') : t('music_play')}
        title={isPlaying ? t('music_pause') : t('music_play')}
        className="cafe-music-toggle"
      >
        {isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        <span>{isPlaying ? t('music_pause') : t('music_play')}</span>
      </button>
      <Volume2 size={15} aria-hidden="true" className="shrink-0 text-cafe-cream/75" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        aria-label={t('music_volume')}
        title={t('music_volume')}
        className="cafe-music-volume"
      />
      {error && <span className="cafe-music-error" role="alert">{error}</span>}
    </aside>
  );
}
