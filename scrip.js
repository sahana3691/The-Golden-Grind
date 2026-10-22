// Keep the home page button working without requiring JavaScript on other pages.
const menuButton = document.querySelector("#view-menu");
const favoritesSection = document.querySelector("#favorites");

if (menuButton && favoritesSection) {
    menuButton.addEventListener("click", function () {
        favoritesSection.scrollIntoView({ behavior: "smooth" });
    });
}

// Show the current year in each page footer.
const yearLabel = document.querySelector("[data-year]");
if (yearLabel) {
    yearLabel.textContent = new Date().getFullYear();
}

// Bring page sections into view gently as the visitor scrolls.
const revealItems = document.querySelectorAll(
    ".favorites .eyebrow, .favorites .section-heading, .favorites .section-intro, .menu-card, .about-copy, .about-image, .value-card, .menu-category, .contact-card"
);

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealItems.forEach((item, index) => {
        item.classList.add("reveal");
        item.style.transitionDelay = `${(index % 3) * 90}ms`;
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));
}
