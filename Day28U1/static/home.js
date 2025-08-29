document.addEventListener("DOMContentLoaded", () => {
  // Update year in footer
  document.getElementById("y").textContent = new Date().getFullYear();

  // Button cursor shimmer effect
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty(
        "--x",
        ((e.clientX - r.left) / r.width) * 100 + "%"
      );
    });
  });

  // Reveal on scroll with Intersection Observer
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal, .card").forEach((el) => io.observe(el));

  // Docs button navigation
  const docsBtn = document.querySelector('.nav-links a[href="/docs"]');
  if (docsBtn) {
    docsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/docs"; // Replace with actual docs URL if exists
    });
  }

  // Parallax effect for mock box
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    document.querySelectorAll(".mock").forEach((el) => {
      el.style.transform = `translateY(${Math.min(scrollY * 0.05, 20)}px)`;
    });
  });

  // Prevent automatic scroll to second page on reload
  if (window.location.hash) {
    window.scrollTo(0, 0);
    window.location.hash = "";
  }
});
