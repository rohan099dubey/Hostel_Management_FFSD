// Menu page functionality

// Global variables
let dayMealRatings = {};

// Initialize data from hidden input
function initializeData() {
  try {
    const dataInput = document.getElementById("dayMealRatingsData");
    if (dataInput && dataInput.value) {
      dayMealRatings = JSON.parse(dataInput.value);
      console.log("Successfully loaded rating data");
    }
  } catch (error) {
    console.error("Error loading rating data:", error);
    dayMealRatings = {};
  }
}

// Show selected day and hide others
function showDay(day) {
  console.log("showDay called for:", day);

  // Update active tab
  document.querySelectorAll(".day-tab").forEach((tab) => {
    if (tab.dataset.day === day) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Show selected day content
  document.querySelectorAll(".day-content").forEach((content) => {
    if (content.id === `day-${day}`) {
      content.classList.remove("hidden");
      content.classList.add("block");
    } else {
      content.classList.add("hidden");
      content.classList.remove("block");
    }
  });

  // Update current day display
  const dayDisplay = document.getElementById("current-day-display");
  if (dayDisplay) {
    dayDisplay.innerText = day;
  }

  // Update meal ratings for the selected day
  updateMealRatings(day);
}

// Update the meal ratings display based on selected day
function updateMealRatings(day) {
  const mealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];

  mealTypes.forEach((mealType) => {
    const ratingCard = document.querySelector(
      `.meal-rating-card[data-meal-type="${mealType}"]`
    );
    if (!ratingCard) return;

    const ratingDisplay = ratingCard.querySelector(".meal-rating-display");
    if (!ratingDisplay) return;

    // Check if ratings exist for this day-meal combination
    if (
      dayMealRatings[day] &&
      dayMealRatings[day][mealType] &&
      dayMealRatings[day][mealType].count > 0
    ) {
      // Format the HTML for ratings display
      ratingDisplay.innerHTML = `
        <div class="flex items-center justify-end">
          <span class="rating-value text-2xl font-bold mr-1">${dayMealRatings[day][mealType].averageRating}</span>
          <span class="text-yellow-500 text-xl">&#9733;</span>
        </div>
        <p class="rating-count text-xs text-gray-500">(${dayMealRatings[day][mealType].count} ratings)</p>
      `;
    } else {
      // No ratings
      ratingDisplay.innerHTML = `<p class="no-rating text-gray-500">No ratings</p>`;
    }
  });
}

// Toggle meal content visibility
function toggleMeal(mealId) {
  console.log("toggleMeal called for:", mealId);

  const mealContent = document.getElementById(mealId);
  if (!mealContent) {
    console.error(`Meal content for ${mealId} not found`);
    return;
  }

  const mealHeader = mealContent.previousElementSibling;
  const arrow = mealHeader.querySelector(".meal-arrow");

  if (mealContent.classList.contains("hidden")) {
    mealContent.classList.remove("hidden");
    arrow.classList.add("rotate-180");
  } else {
    mealContent.classList.add("hidden");
    arrow.classList.remove("rotate-180");
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Menu.js: DOM fully loaded");

  // Initialize data from hidden input
  initializeData();

  // Add event listeners to day tabs
  document.querySelectorAll(".day-tab").forEach((tab) => {
    const day = tab.dataset.day;
    tab.addEventListener("click", function () {
      console.log("Day tab clicked:", day);
      showDay(day);
    });
  });

  // Add event listeners to meal headers
  document.querySelectorAll(".meal-header").forEach((header) => {
    // Get the meal ID from the data attribute
    const mealId = header.dataset.mealId;
    if (mealId) {
      header.addEventListener("click", function () {
        console.log("Meal header clicked:", mealId);
        toggleMeal(mealId);
      });
    }
  });

  // Show the first day by default
  const firstDay = document.querySelector(".day-tab").dataset.day;
  if (firstDay) {
    showDay(firstDay);
  }

  // Auto-open first meal after a delay
  const firstMealHeader = document.querySelector(".meal-header");
  if (firstMealHeader) {
    setTimeout(() => {
      firstMealHeader.click();
    }, 500);
  }
});
