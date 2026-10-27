// Apply the saved or system theme before first paint to avoid a flash.
try {
  var saved = localStorage.getItem('theme')
  var dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
} catch (e) {}
