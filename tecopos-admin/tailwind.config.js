module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        marquee: 'marquee 40s linear infinite',
        marquee2: 'marquee2 40s linear infinite',
      },
      keyframes: {
        logo: {
          "0%": { bottom: "-10px" },
          "50%": { top: "0" },
          "100%": { bottom: "-10px", right: "-10px" },
        },
        fetch: {
          "0%": { bottom: "-6px" },
          "50%": { top: "0" },
          "100%": { bottom: "-6px", right: "-7px" },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marquee2: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0%)' },
        }
      },
      backgroundImage: {
        "hero-pattern":
          "url('https://parsefiles.back4app.com/iMDjJAPDYIcx09KO3DIiD9MbhayTDY9i3dpmFrnC/71114d01dc96ffceed723e3a615071c8_uLZ7KInA95.png')",
      },
      colors: {
        primary: "#ee7320 !important",
        secondary: "#1e293b",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
    require("tailwind-scrollbar"),
  ],
};
