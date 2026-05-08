import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type VideoAdProps = {
  headline: string;
  subheadline: string;
  ctaText: string;
  brandColor: string;
};

export const VideoAd = ({
  headline,
  subheadline,
  ctaText,
  brandColor,
}: VideoAdProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = spring({
    frame,
    fps,
    config: { damping: 200 },
    from: 0,
    to: 1,
  });

  const headlineY = interpolate(frame, [0, 20], [40, 0], {
    extrapolateRight: 'clamp',
  });

  const subOpacity = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
    from: 0,
    to: 1,
  });

  const ctaOpacity = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200 },
    from: 0,
    to: 1,
  });

  const ctaScale = spring({
    frame: frame - 40,
    fps,
    config: { damping: 150, stiffness: 200 },
    from: 0.8,
    to: 1,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #003399 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          color: 'white',
          fontSize: 96,
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '-2px',
          lineHeight: 1.1,
          marginBottom: 24,
          maxWidth: '80%',
        }}
      >
        {headline}
      </div>

      <div
        style={{
          opacity: subOpacity,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 40,
          textAlign: 'center',
          maxWidth: '70%',
          marginBottom: 60,
        }}
      >
        {subheadline}
      </div>

      <div
        style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          background: 'white',
          color: brandColor,
          fontSize: 36,
          fontWeight: 700,
          padding: '20px 60px',
          borderRadius: 100,
          letterSpacing: '1px',
        }}
      >
        {ctaText}
      </div>
    </AbsoluteFill>
  );
};
