const fs = require('fs');
const path = require('path');

const files = [
  'homepage/index.html',
  'menu/menu.html',
  'catering/catering.html',
  'contact/contact.html',
  'profile/../profile/',
  'profile/../history/',
  'Login/../Login/',
  'Login/../register/',
  'admin/admin.html'
];

const basePath = 'c:\\Users\\onel2\\semester 4\\softdev\\app pemesana';

const hamburgerHTML = `
    <button class="nav-hamburger" id="navHamburger" aria-label="Menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>`;

const scriptHTML = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const hamburger = document.getElementById('navHamburger');
      const navLinks = document.getElementById('navLinks');
      if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
          navLinks.classList.toggle('active');
        });
      }
    });
  </script>
`;

files.forEach(file => {
  const fullPath = path.join(basePath, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Add hamburger button
    if (!content.includes('id="navHamburger"')) {
      content = content.replace(/<nav>/, `<nav>${hamburgerHTML}`);
    }

    // Add id to nav-links
    if (!content.includes('id="navLinks"')) {
      content = content.replace(/<ul class="nav-links">/, '<ul class="nav-links" id="navLinks">');
    }

    // Add script before closing body
    if (!content.includes("document.getElementById('navHamburger')")) {
      content = content.replace(/<\/body>/, `${scriptHTML}\n</body>`);
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});
