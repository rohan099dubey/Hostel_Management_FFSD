// Dashboard Charts for Hostel and Mess Visualization

// Global chart objects to allow destruction and recreation
let problemCategoryChart = null;
let problemStatusChart = null;
let problemResponseChart = null;
let hostelDistributionChart = null;
let mealRatingChart = null;
let dayRatingChart = null;
let messComparisonChart = null;

// Color scheme
const chartColors = {
  primary: "#004aad",
  secondary: "#cb6ce6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  blue: "#60a5fa",
  indigo: "#818cf8",
  purple: "#a78bfa",
  pink: "#f472b6",
  gradient: ["#004aad", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#cb6ce6"],
};

// ===== HOSTEL PROBLEM CHARTS =====

// Create problem category distribution pie chart
function createProblemCategoryChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (problemCategoryChart) {
    problemCategoryChart.destroy();
  }

  problemCategoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: data.categories,
      datasets: [
        {
          data: data.counts,
          backgroundColor: chartColors.gradient,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            padding: 20,
            boxWidth: 10,
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Problem Categories Distribution",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.formattedValue;
              const dataset = context.dataset;
              const total = dataset.data.reduce((acc, data) => acc + data, 0);
              const percentage = Math.round((context.raw / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Create problem status distribution chart
function createProblemStatusChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (problemStatusChart) {
    problemStatusChart.destroy();
  }

  const colors = {
    Pending: chartColors.warning,
    "In Progress": chartColors.info,
    ToBeConfirmed: chartColors.purple,
    Resolved: chartColors.success,
    Rejected: chartColors.danger,
  };

  const backgroundColor = data.statuses.map(
    (status) => colors[status] || chartColors.primary
  );

  problemStatusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.statuses,
      datasets: [
        {
          data: data.counts,
          backgroundColor: backgroundColor,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            padding: 20,
            boxWidth: 10,
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Problem Status Distribution",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.formattedValue;
              const dataset = context.dataset;
              const total = dataset.data.reduce((acc, data) => acc + data, 0);
              const percentage = Math.round((context.raw / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Create response time analysis chart
function createResponseTimeChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (problemResponseChart) {
    problemResponseChart.destroy();
  }

  problemResponseChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.categories,
      datasets: [
        {
          label: "Average Resolution Time (hours)",
          data: data.times,
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primary,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Average Resolution Time by Category",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Hours",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "Problem Category",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
    },
  });
}

// Create hostel problem distribution chart
function createHostelDistributionChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (hostelDistributionChart) {
    hostelDistributionChart.destroy();
  }

  hostelDistributionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.hostels,
      datasets: [
        {
          label: "Total Problems",
          data: data.counts,
          backgroundColor: chartColors.gradient,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Problems by Hostel",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Problems",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "Hostel",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
    },
  });
}

// ===== MESS FEEDBACK CHARTS =====

// Create meal rating chart (overall or by day)
function createMealRatingChart(
  elementId,
  data,
  title = "Average Meal Ratings"
) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (mealRatingChart) {
    mealRatingChart.destroy();
  }

  mealRatingChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: data.mealTypes,
      datasets: [
        {
          label: "Average Rating",
          data: data.ratings,
          backgroundColor: "rgba(203, 108, 230, 0.2)",
          borderColor: chartColors.secondary,
          borderWidth: 2,
          pointBackgroundColor: chartColors.secondary,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: chartColors.secondary,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      elements: {
        line: {
          tension: 0.1,
        },
      },
      scales: {
        r: {
          angleLines: {
            display: true,
          },
          suggestedMin: 0,
          suggestedMax: 5,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: title,
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
      },
    },
  });
}

// Create day ratings chart
function createDayRatingChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (dayRatingChart) {
    dayRatingChart.destroy();
  }

  dayRatingChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.days,
      datasets: data.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Ratings by Day and Meal Type",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: "Average Rating",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "Day of Week",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
    },
  });
}

// Create mess comparison chart
function createMessComparisonChart(elementId, data) {
  const ctx = document.getElementById(elementId).getContext("2d");

  // If chart exists, destroy it first
  if (messComparisonChart) {
    messComparisonChart.destroy();
  }

  messComparisonChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.messes,
      datasets: [
        {
          label: "Average Rating",
          data: data.ratings,
          backgroundColor: chartColors.gradient,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: {
              family: "'Poppins', sans-serif",
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: "Mess Comparison by Average Rating",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: "Average Rating",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
        x: {
          title: {
            display: true,
            text: "Mess",
            font: {
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
    },
  });
}

// Toggle between hostel and mess views
function toggleDashboardView(view) {
  const hostelSection = document.getElementById("hostel-analytics");
  const messSection = document.getElementById("mess-analytics");

  if (view === "hostel") {
    hostelSection.classList.remove("hidden");
    messSection.classList.add("hidden");
    document.getElementById("toggle-hostel").classList.add("active-toggle");
    document.getElementById("toggle-mess").classList.remove("active-toggle");
  } else {
    hostelSection.classList.add("hidden");
    messSection.classList.remove("hidden");
    document.getElementById("toggle-hostel").classList.remove("active-toggle");
    document.getElementById("toggle-mess").classList.add("active-toggle");
  }
}

// Update charts when filter changes
function applyMessFilter() {
  const messFilter = document.getElementById("mess-filter").value;
  const dayFilter = document.getElementById("day-filter").value;

  // Make an API call to get new data based on filters
  fetch(`/api/feedback/stats?mess=${messFilter}&day=${dayFilter}`)
    .then((response) => response.json())
    .then((data) => {
      if (dayFilter && dayFilter !== "all") {
        createMealRatingChart(
          "meal-rating-chart",
          data.mealStats,
          `Average Meal Ratings for ${dayFilter}`
        );
      } else {
        createMealRatingChart("meal-rating-chart", data.mealStats);
      }

      createDayRatingChart("day-rating-chart", data.dayStats);

      if (messFilter && messFilter !== "all") {
        document
          .getElementById("mess-comparison-container")
          .classList.add("hidden");
      } else {
        document
          .getElementById("mess-comparison-container")
          .classList.remove("hidden");
        createMessComparisonChart("mess-comparison-chart", data.messComparison);
      }
    })
    .catch((error) => console.error("Error fetching filtered data:", error));
}

// Reset filters
function resetMessFilters() {
  document.getElementById("mess-filter").value = "all";
  document.getElementById("day-filter").value = "all";
  applyMessFilter();
}

// Initialize all charts when the page loads
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on a page with the toggle
  const dashboardToggle = document.getElementById("dashboard-toggle");
  if (dashboardToggle) {
    // Set initial view (default to hostel)
    toggleDashboardView("hostel");

    // Set up event listeners for toggle buttons
    document
      .getElementById("toggle-hostel")
      .addEventListener("click", () => toggleDashboardView("hostel"));
    document
      .getElementById("toggle-mess")
      .addEventListener("click", () => toggleDashboardView("mess"));

    // Set up event listeners for mess filters
    const messFilterBtn = document.getElementById("apply-mess-filter");
    if (messFilterBtn) {
      messFilterBtn.addEventListener("click", applyMessFilter);
    }

    const resetFilterBtn = document.getElementById("reset-mess-filter");
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener("click", resetMessFilters);
    }
  }
});
