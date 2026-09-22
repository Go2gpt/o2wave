/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "pbxt.replicate.delivery",
      },
    ],
  },
  experimental: {
    // Empaqueta el binario de ffmpeg (ffmpeg-static) en la función que compone el
    // Reel, si no en Vercel no existe. Solo la ruta que lo usa.
    outputFileTracingIncludes: {
      "/api/admin/autopost/reel-estado": ["./node_modules/ffmpeg-static/**", "./public/fonts/**"],
      "/api/admin/autopost/diagnostico": ["./node_modules/ffmpeg-static/**"],
    },
  },
};

export default nextConfig;
