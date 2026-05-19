/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's7d9.scene7.com' }, 
      { protocol: 'https', hostname: 'view.sanmar.com' }, 
      { protocol: 'https', hostname: 'www.sanmar.com' },  
      { protocol: 'https', hostname: 'cdn.sanmar.com' },  
      { protocol: 'https', hostname: 'cdnm.sanmar.com' }, // <-- ¡AÑADE ESTA LÍNEA!
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  }
};
 
export default nextConfig;