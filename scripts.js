document.addEventListener('DOMContentLoaded', () => {
    // Only hamburger menu functionality remains
    document.getElementById('hamburger-menu').addEventListener('click', () => {
      document.querySelector('nav ul').classList.toggle('show');
    });
  });
  