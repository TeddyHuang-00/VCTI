/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        sand: "#f5f5f5",
        stone: "#f5f2ef",
        mist: "#f6f6f6",
        warmgray: "#777169",
        graphite: "#4e4e4e",
      },
      boxShadow: {
        card: "rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 4px 4px",
        warm: "rgba(78,50,23,0.04) 0px 6px 16px",
      },
      fontFamily: {
        display: ["'LXGW WenKai'", "serif"],
        body: ["'LXGW Neo XiHei'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
