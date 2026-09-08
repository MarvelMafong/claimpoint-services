import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ClaimPoint Solutions — Recovery and Banking, One Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#17152B',
          backgroundImage: 'radial-gradient(circle at 25% 20%, rgba(91,75,255,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(53,214,163,0.25), transparent 55%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://claimpoint.vercel.app/images/claimpoint-icon.jpeg"
            width={56}
            height={56}
            style={{ borderRadius: 16, objectFit: 'contain' }}
            alt=""
          />
          <div style={{ color: '#FCFBF8', fontSize: 40, fontWeight: 700 }}>ClaimPoint</div>
        </div>
        <div
          style={{
            color: '#FCFBF8',
            fontSize: 56,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Get your money back. Then put it to work.
        </div>
        <div style={{ color: '#A9A7B8', fontSize: 24, marginTop: 24 }}>
          Recovery and banking, one platform
        </div>
      </div>
    ),
    { ...size }
  );
}