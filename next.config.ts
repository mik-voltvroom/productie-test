import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }, {
      source: "/voorraadalert/:path*",
      headers: [
        {key:"Cache-Control",value:"no-store, private"},
        {key:"Referrer-Policy",value:"no-referrer"},
        {key:"X-Robots-Tag",value:"noindex, nofollow"},
        {key:"Content-Security-Policy",value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"},
      ],
    }, { source: "/dashboard/voorraadalerts/:path*", headers: [ {key:"Cache-Control",value:"no-store, private"}, {key:"Referrer-Policy",value:"no-referrer"}, {key:"X-Robots-Tag",value:"noindex, nofollow"} ] }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media-eigenwebsiteincrementeel.export.dv.nl", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  poweredByHeader: false,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
