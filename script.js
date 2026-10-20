"use strict";

document.documentElement.classList.add("has-js");

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const mobileQuery = window.matchMedia("(max-width: 600px)");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function closeMenu({ restoreFocus = false } = {}) {
  navLinks.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) menuButton.focus();
}

menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  navLinks.classList.toggle("is-open", !expanded);
  menuButton.setAttribute("aria-expanded", String(!expanded));
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu({ restoreFocus: true });
  }
});
document.addEventListener("click", (event) => {
  if (!header.contains(event.target)) closeMenu();
});
header.addEventListener("focusout", (event) => {
  if (!header.contains(event.relatedTarget)) closeMenu();
});
mobileQuery.addEventListener("change", () => closeMenu());

// Observe a sentinel rather than doing work on every scroll event.
const headerSentinel = document.createElement("div");
headerSentinel.setAttribute("aria-hidden", "true");
headerSentinel.style.cssText =
  "position:absolute;top:1px;width:1px;height:1px;pointer-events:none";
document.body.prepend(headerSentinel);
if ("IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    header.classList.toggle("scrolled", !entry.isIntersecting);
  });
  headerObserver.observe(headerSentinel);

  const activeSections = new Map();
  const navigationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) =>
        activeSections.set(entry.target.id, entry.isIntersecting),
      );
      const activeId = [...activeSections].find(([, visible]) => visible)?.[0];
      navLinks.querySelectorAll('a[href^="#"]').forEach((link) => {
        if (link.hash === `#${activeId}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-15% 0px -65% 0px" },
  );
  document
    .querySelectorAll("main > section[id], #contact")
    .forEach((section) => navigationObserver.observe(section));
}

const revealElements = [...document.querySelectorAll(".reveal")];
let revealObserver;
function setRevealMotion() {
  revealObserver?.disconnect();
  revealElements.forEach((element) => element.classList.remove("is-waiting"));
  if (motionQuery.matches || !("IntersectionObserver" in window)) return;
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.remove("is-waiting");
        revealObserver.unobserve(target);
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px 30px 0px" },
  );
  revealElements.forEach((element) => {
    // Never hide content already on screen or addressed by the current URL.
    if (
      element.getBoundingClientRect().top < window.innerHeight ||
      element.contains(document.querySelector(":target"))
    )
      return;
    element.classList.add("is-waiting");
    revealObserver.observe(element);
  });
}
setRevealMotion();
motionQuery.addEventListener("change", setRevealMotion);

// A focused link must remain visible even if its section has not been revealed yet.
document.addEventListener("focusin", (event) => {
  event.target.closest(".is-waiting")?.classList.remove("is-waiting");
});

// Clicking the same fragment again does not emit hashchange.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.getElementById(link.hash.slice(1));
  if (target instanceof HTMLDetailsElement) target.open = true;
});

function openLinkedDetails() {
  const id = window.location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener("hashchange", openLinkedDetails);
openLinkedDetails();
document.getElementById("year").textContent = new Date().getFullYear();
