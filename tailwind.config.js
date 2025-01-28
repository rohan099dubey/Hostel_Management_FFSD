/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [ "./*.ejs", "./views/*.ejs", "./views/partials/*.ejs" ],
  theme: {
    extend: {},
  },
  plugins: [ require("daisyui") ],
  daisyui: {
    // prefix: "dairy",
    themes: [] // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)

  }
}

