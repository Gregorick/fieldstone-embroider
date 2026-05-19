/** @type {import('next').NextConfig} */
const nextConfig = {
  // 👇 Esto le dice a Next.js que vivirá en esta subcarpeta en cPanel
  basePath: '/fieldstone-embroider', 
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's7d9.scene7.com' }, 
      { protocol: 'https', hostname: 'view.sanmar.com' }, 
      { protocol: 'https', hostname: 'www.sanmar.com' },  
      { protocol: 'https', hostname: 'cdn.sanmar.com' },  
      { protocol: 'https', hostname: 'cdnm.sanmar.com' }, 
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  }
};
 
export default nextConfig;