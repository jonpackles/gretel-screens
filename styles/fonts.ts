import localFont from 'next/font/local';

// export const akkurat = localFont({
//   src: [
//     {
//       path: '../public/fonts/AkkRg_Pro_1.otf',
//       weight: '400',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/AkkIt_Pro_1.otf',
//       weight: '400',
//       style: 'italic',
//     },
//     {
//       path: '../public/fonts/AkkBd_Pro_1.otf',
//       weight: '700',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/AkkBdIt_Pro_1.otf',
//       weight: '700',
//       style: 'italic',
//     },
//     {
//       path: '../public/fonts/AkkLg_Pro_1.otf',
//       weight: '300',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/AkkLgIt_Pro_1.otf',
//       weight: '300',
//       style: 'italic',
//     },
//   ],
//   display: 'swap',
//   preload: true,
//   fallback: ['system-ui', 'sans-serif'],
// }); 

export const basel = localFont({
  src: [
    {
      path: '../public/fonts/BaselGroteskMonoTrial-Light.otf',
      weight: '300',
      style: 'light',
    },
  
  ],
  variable: '--font-basel',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const quadrant = localFont({
  src: [
    {
      path: '../public/fonts/QuadrantTextMono-Regular.otf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-quadrant',
  display: 'swap',
});

export const droulers = localFont({
  src: [
    {
      path: '../public/fonts/Droulers-Regular.otf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-droulers',
  display: 'swap',
});