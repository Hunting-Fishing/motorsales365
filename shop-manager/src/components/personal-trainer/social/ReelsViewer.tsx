import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reel {
  id: string;
  media_url: string;
  caption: string;
  author_name: string;
  tags: string[];
}

interface ReelsViewerProps {
  reels: Reel[];
}

function ReelCard({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.7 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative w-full aspect-[9/16] max-h-[600px] rounded-2xl overflow-hidden bg-black group">
      <video
        ref={videoRef}
        src={reel.media_url}
        loop
        muted={muted}
        playsInline
        className="h-full w-full object-cover"
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-16 w-16 text-white/80" />
        </div>
      )}

      {/* Bottom caption overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white font-medium text-sm">{reel.author_name}</p>
        <p className="text-white/90 text-sm mt-1">{reel.caption}</p>
        {reel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reel.tags.map((tag) => (
              <span key={tag} className="text-xs text-orange-400 font-medium">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Mute toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ReelsViewer({ reels }: ReelsViewerProps) {
  if (reels.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Play className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No reels yet</p>
        <p className="text-sm">Be the first to share a video reel!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  );
}
