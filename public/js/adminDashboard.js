// Get problems data from the hidden input
const problems = JSON.parse(
  document.getElementById("allProblemsData").getAttribute("value")
);

// Function to filter problems by hostel and date
function filterProblems(hostel, days) {
  let filteredProblems = problems;

  // Filter by hostel if specified
  if (hostel !== "all") {
    filteredProblems = filteredProblems.filter((p) => p.hostel === hostel);
  }

  // Filter by date if specified
  if (days !== "all") {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    filteredProblems = filteredProblems.filter((problem) => {
      const problemDate = new Date(problem.timeCreated || problem.createdAt);
      return problemDate >= cutoffDate;
    });
  }

  return filteredProblems;
}

// Function to count problems by status
function countProblems(filteredProblems) {
  return {
    pending: filteredProblems.filter((p) => p.status === "Pending").length,
    resolved: filteredProblems.filter((p) => p.status === "Resolved").length,
    rejected: filteredProblems.filter((p) => p.status === "Rejected").length,
    toBeConfirmed: filteredProblems.filter((p) => p.status === "ToBeConfirmed")
      .length,
  };
}

// Function to update the chart and statistics
function updateChart(hostel, days) {
  const filteredProblems = filterProblems(hostel, days);
  const counts = countProblems(filteredProblems);

  // Update statistics display
  document.getElementById("pendingCount").textContent = counts.pending;
  document.getElementById("resolvedCount").textContent = counts.resolved;
  document.getElementById("rejectedCount").textContent = counts.rejected;
  document.getElementById("toBeConfirmedCount").textContent =
    counts.toBeConfirmed;

  // Update chart title to include hostel info
  const chartTitle =
    hostel === "all"
      ? "All Hostels Problem Status"
      : `${hostel} Problem Status`;

  // Chart configuration
  const chartOptions = {
    series: [
      counts.pending,
      counts.resolved,
      counts.rejected,
      counts.toBeConfirmed,
    ],
    chart: {
      type: "pie",
      height: 400,
    },
    title: {
      text: chartTitle,
      align: "center",
      style: {
        fontSize: "16px",
        fontWeight: "bold",
      },
    },
    labels: ["Pending", "Resolved", "Rejected", "To Be Confirmed"],
    colors: ["#F59E0B", "#10B981", "#EF4444", "#3B82F6"],
    legend: {
      position: "bottom",
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 300,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };

  // Clear and render chart
  document.getElementById("problemsPieChart").innerHTML = "";
  const chart = new ApexCharts(
    document.getElementById("problemsPieChart"),
    chartOptions
  );
  chart.render();
}

// Function to calculate average resolution time by category
function calculateResolutionTimeByCategory(filteredProblems) {
  const categoryStats = {};

  // Filter resolved problems from the already filtered problems
  const resolvedProblems = filteredProblems.filter(
    (p) => p.status === "Resolved"
  );

  resolvedProblems.forEach((problem) => {
    const category = problem.category;
    const createdAt = new Date(problem.timeCreated || problem.createdAt);
    const resolvedAt = new Date(problem.timeResolved || problem.updatedAt);
    const resolutionTime = (resolvedAt - createdAt) / (1000 * 60 * 60);

    if (!categoryStats[category]) {
      categoryStats[category] = {
        totalTime: 0,
        count: 0,
      };
    }

    categoryStats[category].totalTime += resolutionTime;
    categoryStats[category].count++;
  });

  const categories = [];
  const avgTimes = [];

  for (const [category, stats] of Object.entries(categoryStats)) {
    categories.push(category);
    const avgTime = stats.totalTime / stats.count;
    avgTimes.push(parseFloat(avgTime.toFixed(2)));
  }

  return { categories, avgTimes };
}

// Function to render resolution time chart
function renderResolutionTimeChart(hostel, days) {
  const filteredProblems = filterProblems(hostel, days);
  const { categories, avgTimes } =
    calculateResolutionTimeByCategory(filteredProblems);

  const chartTitle =
    hostel === "all"
      ? "Average Resolution Time by Category"
      : `${hostel} - Average Resolution Time by Category`;

  const options = {
    series: [
      {
        name: "Average Resolution Time",
        data: avgTimes,
      },
    ],
    chart: {
      type: "bar",
      height: 400,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 8,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(1) + " hrs";
      },
      style: {
        fontSize: "12px",
      },
    },
    colors: [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#6366F1",
    ],
    xaxis: {
      categories: categories,
      labels: {
        rotate: -45,
        style: {
          fontSize: "12px",
        },
      },
      title: {
        text: "Problem Categories",
      },
    },
    yaxis: {
      title: {
        text: "Average Resolution Time (Hours)",
      },
      labels: {
        formatter: function (val) {
          return val.toFixed(1) + " hrs";
        },
      },
    },
    title: {
      text: chartTitle,
      align: "center",
      style: {
        fontSize: "16px",
        fontWeight: "bold",
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val.toFixed(1) + " hours";
        },
      },
    },
  };

  // Clear and render chart
  document.getElementById("resolutionTimeChart").innerHTML = "";
  const chart = new ApexCharts(
    document.getElementById("resolutionTimeChart"),
    options
  );
  chart.render();
}

// Add this function to create hostel-specific charts
function createHostelCharts() {
  const hostels = ["BH-1", "BH-2", "BH-3", "BH-4"];

  hostels.forEach((hostel) => {
    const hostelProblems = problems.filter((p) => p.hostel === hostel);
    const resolvedProblems = hostelProblems.filter(
      (p) => p.status === "Resolved"
    );

    // Calculate category-wise stats for this hostel
    const categoryStats = {};

    resolvedProblems.forEach((problem) => {
      const category = problem.category;
      const createdAt = new Date(problem.timeCreated || problem.createdAt);
      const resolvedAt = new Date(problem.timeResolved || problem.updatedAt);
      const resolutionTime = (resolvedAt - createdAt) / (1000 * 60 * 60);

      if (!categoryStats[category]) {
        categoryStats[category] = {
          totalTime: 0,
          count: 0,
        };
      }

      categoryStats[category].totalTime += resolutionTime;
      categoryStats[category].count++;
    });

    // Prepare data for chart
    const categories = [];
    const avgTimes = [];

    for (const [category, stats] of Object.entries(categoryStats)) {
      categories.push(category);
      const avgTime = stats.totalTime / stats.count;
      avgTimes.push(parseFloat(avgTime.toFixed(2)));
    }

    // Create chart options
    const options = {
      series: [
        {
          name: "Average Resolution Time",
          data: avgTimes,
        },
      ],
      chart: {
        type: "bar",
        height: 300,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 6,
          distributed: true,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          return val.toFixed(1) + " hrs";
        },
        style: {
          fontSize: "10px",
        },
      },
      colors: [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#EF4444",
        "#8B5CF6",
        "#EC4899",
      ],
      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          style: {
            fontSize: "10px",
          },
        },
      },
      yaxis: {
        title: {
          text: "Hours",
          style: {
            fontSize: "12px",
          },
        },
      },
      title: {
        text: `Resolution Times by Category`,
        align: "center",
        style: {
          fontSize: "14px",
          fontWeight: "bold",
        },
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val.toFixed(1) + " hours";
          },
        },
      },
    };

    // Render chart
    const chartElement = document.getElementById(`${hostel}-chart`);
    if (chartElement) {
      chartElement.innerHTML = "";
      const chart = new ApexCharts(chartElement, options);
      chart.render();
    }
  });
}

// Update the DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function () {
  const hostelFilter = document.getElementById("hostelFilter");
  const dateFilter = document.getElementById("dateFilter");

  // Initialize main charts
  updateChart("all", "all");
  renderResolutionTimeChart("all", "all");

  // Initialize hostel-specific charts
  createHostelCharts();

  // Update event listeners
  hostelFilter.addEventListener("change", (e) => {
    const selectedHostel = e.target.value;
    const selectedDays = dateFilter.value;
    updateChart(selectedHostel, selectedDays);
    renderResolutionTimeChart(selectedHostel, selectedDays);
  });

  dateFilter.addEventListener("change", (e) => {
    const selectedDays = e.target.value;
    const selectedHostel = hostelFilter.value;
    updateChart(selectedHostel, selectedDays);
    renderResolutionTimeChart(selectedHostel, selectedDays);
  });

  // Add smooth scrolling to problem container
  const problemContainer = document.getElementById("problem-container");
  if (problemContainer) {
    problemContainer.style.scrollBehavior = "smooth";
  }
});

//here onwards in js for graph

const options = {
  colors: ["#1A56DB", "#FDBA8C"],
  series: [
    {
      name: "Organic",
      color: "#1A56DB",
      data: [
        { x: "Mon", y: 231 },
        { x: "Tue", y: 122 },
        { x: "Wed", y: 63 },
        { x: "Thu", y: 421 },
        { x: "Fri", y: 122 },
        { x: "Sat", y: 323 },
        { x: "Sun", y: 111 },
      ],
    },
    {
      name: "Social media",
      color: "#FDBA8C",
      data: [
        { x: "Mon", y: 232 },
        { x: "Tue", y: 113 },
        { x: "Wed", y: 341 },
        { x: "Thu", y: 224 },
        { x: "Fri", y: 522 },
        { x: "Sat", y: 411 },
        { x: "Sun", y: 243 },
      ],
    },
  ],
  chart: {
    type: "bar",
    height: "320px",
    fontFamily: "Inter, sans-serif",
    toolbar: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "70%",
      borderRadiusApplication: "end",
      borderRadius: 8,
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    style: {
      fontFamily: "Inter, sans-serif",
    },
  },
  states: {
    hover: {
      filter: {
        type: "darken",
        value: 1,
      },
    },
  },
  stroke: {
    show: true,
    width: 0,
    colors: ["transparent"],
  },
  grid: {
    show: false,
    strokeDashArray: 4,
    padding: {
      left: 2,
      right: 2,
      top: -14,
    },
  },
  dataLabels: {
    enabled: false,
  },
  legend: {
    show: false,
  },
  xaxis: {
    floating: false,
    labels: {
      show: true,
      style: {
        fontFamily: "Inter, sans-serif",
        cssClass: "text-xs font-normal fill-gray-500 dark:fill-gray-400",
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    show: false,
  },
  fill: {
    opacity: 1,
  },
};

if (
  document.getElementById("column-chart") &&
  typeof ApexCharts !== "undefined"
) {
  const chart = new ApexCharts(
    document.getElementById("column-chart"),
    options
  );
  chart.render();
}
