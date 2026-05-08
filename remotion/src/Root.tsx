import { Composition } from 'remotion';
import { VideoAd } from './VideoAd/VideoAd';

export const Root = () => {
  return (
    <>
      <Composition
        id="VideoAd"
        component={VideoAd}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          headline: 'Your Ad Here',
          subheadline: 'Drive results with compelling video ads',
          ctaText: 'Learn More',
          brandColor: '#0066FF',
        }}
      />
    </>
  );
};
