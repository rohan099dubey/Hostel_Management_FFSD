// Get problems data from the hidden input
const problems = JSON.parse(document.getElementById("allProblemsData").getAttribute("value"));

// Function to filter problems by date range
function filterProblemsByDate(days) {
    if (days === 'all') return problems;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return problems.filter(problem => {
        const problemDate = new Date(problem.createdAt);
        return problemDate >= cutoffDate;
    });
}

// Function to count problems by status
function countProblems(filteredProblems) {
    return {
        pending: filteredProblems.filter(p => p.status === "Pending").length,
        resolved: filteredProblems.filter(p => p.status === "Resolved").length,
        rejected: filteredProblems.filter(p => p.status === "Rejected").length
    };
}

// Function to update the chart and statistics
function updateChart(days) {
    const filteredProblems = filterProblemsByDate(days);
    const counts = countProblems(filteredProblems);

    // Update statistics display
    document.getElementById("pendingCount").textContent = counts.pending;
    document.getElementById("resolvedCount").textContent = counts.resolved;
    document.getElementById("rejectedCount").textContent = counts.rejected;

    // Chart configuration
    const chartOptions = {
        series: [counts.pending, counts.resolved, counts.rejected],
        chart: {
            type: 'pie',
            height: 400
        },
        labels: ['Pending', 'Resolved', 'Rejected'],
        colors: ['#F59E0B', '#10B981', '#EF4444'],
        legend: {
            position: 'bottom'
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 300
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    };

    // Clear existing chart
    document.getElementById('problemsPieChart').innerHTML = '';

    // Create and render new chart
    const chart = new ApexCharts(document.getElementById('problemsPieChart'), chartOptions);
    chart.render();
}

// Function to calculate average resolution time by category
function calculateResolutionTimeByCategory() {
    const categoryStats = {};

    // Filter resolved problems
    const resolvedProblems = problems.filter(p => p.status === "Resolved");

    resolvedProblems.forEach(problem => {
        const category = problem.category;
        const createdAt = new Date(problem.timeCreated || problem.createdAt);
        const resolvedAt = new Date(problem.timeResolved || problem.updatedAt);
        const resolutionTime = (resolvedAt - createdAt) / (1000 * 60 * 60); // Convert to hours

        if (!categoryStats[category]) {
            categoryStats[category] = {
                totalTime: 0,
                count: 0
            };
        }

        categoryStats[category].totalTime += resolutionTime;
        categoryStats[category].count++;
    });

    // Calculate averages
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
function renderResolutionTimeChart() {
    const { categories, avgTimes } = calculateResolutionTimeByCategory();

    const options = {
        series: [{
            name: 'Average Resolution Time',
            data: avgTimes
        }],
        chart: {
            type: 'bar',
            height: 400,
            toolbar: {
                show: false
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 8,
                distributed: true
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(1) + ' hrs';
            },
            style: {
                fontSize: '12px'
            }
        },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
        xaxis: {
            categories: categories,
            labels: {
                rotate: -45,
                style: {
                    fontSize: '12px'
                }
            },
            title: {
                text: 'Problem Categories'
            }
        },
        yaxis: {
            title: {
                text: 'Average Resolution Time (Hours)'
            },
            labels: {
                formatter: function (val) {
                    return val.toFixed(1) + ' hrs';
                }
            }
        },
        title: {
            text: 'Average Resolution Time by Category',
            align: 'center',
            style: {
                fontSize: '16px',
                fontWeight: 'bold'
            }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toFixed(1) + ' hours';
                }
            }
        }
    };

    // Clear existing chart
    document.getElementById('resolutionTimeChart').innerHTML = '';

    // Create and render new chart
    const chart = new ApexCharts(document.getElementById('resolutionTimeChart'), options);
    chart.render();
}

// Initialize both charts when the page loads
document.addEventListener('DOMContentLoaded', function () {
    updateChart('all');  // Initialize pie chart
    renderResolutionTimeChart();  // Initialize resolution time chart

    // Add smooth scrolling to problem container
    const problemContainer = document.getElementById('problem-container');
    if (problemContainer) {
        problemContainer.style.scrollBehavior = 'smooth';
    }
});

// Update both charts when date filter changes
document.getElementById('dateFilter').addEventListener('change', (e) => {
    updateChart(e.target.value);
    renderResolutionTimeChart();
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
            top: -14
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
                cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
            }
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
}

if (document.getElementById("column-chart") && typeof ApexCharts !== 'undefined') {
    const chart = new ApexCharts(document.getElementById("column-chart"), options);
    chart.render();
}
