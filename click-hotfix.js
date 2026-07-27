
(function () {
  "use strict";

  function showStep(stepNumber) {
    document.querySelectorAll(".panel").forEach(function (panel) {
      panel.classList.remove("active");
    });

    var target = document.getElementById("panel" + stepNumber);
    if (target) {
      target.classList.add("active");
    }

    document.querySelectorAll(".step").forEach(function (step) {
      step.classList.toggle(
        "active",
        Number(step.getAttribute("data-step")) === stepNumber
      );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectFirstProduct() {
    var firstCard = document.querySelector("#productGrid .product-card");
    if (firstCard) {
      firstCard.click();
      return true;
    }
    return false;
  }

  document.addEventListener("click", function (event) {
    var startButton = event.target.closest("#startDesignBtn");
    if (startButton) {
      event.preventDefault();
      event.stopImmediatePropagation();

      // Try the normal product selection first. If it does not run,
      // open the design panel directly.
      if (!selectFirstProduct()) {
        showStep(2);
      } else {
        setTimeout(function () {
          if (!document.getElementById("panel2").classList.contains("active")) {
            showStep(2);
          }
        }, 50);
      }
      return;
    }

    var productCard = event.target.closest("#productGrid .product-card");
    if (productCard) {
      setTimeout(function () {
        if (!document.getElementById("panel2").classList.contains("active")) {
          showStep(2);
        }
      }, 50);
    }
  }, true);

  window.addEventListener("load", function () {
    var startButton = document.getElementById("startDesignBtn");
    if (startButton) {
      startButton.setAttribute("type", "button");
      startButton.style.pointerEvents = "auto";
    }
  });
})();
