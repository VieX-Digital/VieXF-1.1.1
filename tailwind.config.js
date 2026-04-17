/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/renderer/index.html",
        "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bg-primary': '#1a1a1a',
                'bg-secondary': '#242424',
                'bg-tertiary': '#2d2d2d',
                'accent-cyan': '#00d9ff',
                'accent-cyan-dim': '#00a8cc',
            },
            fontFamily: {
                primary: ['Rajdhani', 'sans-serif'],
                mono: ['Roboto Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
