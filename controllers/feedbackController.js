const Feedback = require("../models/feedback");

exports.viewFeedbackData = async (req, res) => {
  try {
    const { role } = req.cookies;
    const isLoggedIn = Boolean(req.cookies.jwt);

    // Only admin and warden can access feedback data
    if (role !== "admin" && role !== "warden") {
      return res
        .status(403)
        .send("Access denied. Only admin and warden can view feedback data.");
    }

    // Get query parameters for filtering
    const { day, mealType, startDate, endDate } = req.query;

    // Build query based on filters
    const query = {};
    if (day) query.day = day;
    if (mealType) query.mealType = mealType;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }

    // Fetch feedback data with filters
    const feedbackData = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    // Group feedback by day and meal type for statistics
    const statistics = {};
    const totalRatings = feedbackData.reduce((acc, feedback) => {
      const key = `${feedback.day}-${feedback.mealType}`;
      if (!statistics[key]) {
        statistics[key] = {
          day: feedback.day,
          mealType: feedback.mealType,
          count: 0,
          totalRating: 0,
          averageRating: 0,
        };
      }
      statistics[key].count += 1;
      statistics[key].totalRating += parseInt(feedback.rating);
      statistics[key].averageRating = (
        statistics[key].totalRating / statistics[key].count
      ).toFixed(1);
      return acc + parseInt(feedback.rating);
    }, 0);

    const averageRating =
      feedbackData.length > 0
        ? (totalRatings / feedbackData.length).toFixed(1)
        : 0;

    // Calculate average ratings by meal type across all days
    const mealTypeStats = {
      Breakfast: { count: 0, totalRating: 0, averageRating: 0 },
      Lunch: { count: 0, totalRating: 0, averageRating: 0 },
      Snacks: { count: 0, totalRating: 0, averageRating: 0 },
      Dinner: { count: 0, totalRating: 0, averageRating: 0 },
    };

    feedbackData.forEach((feedback) => {
      if (mealTypeStats[feedback.mealType]) {
        mealTypeStats[feedback.mealType].count += 1;
        mealTypeStats[feedback.mealType].totalRating += parseInt(
          feedback.rating
        );
      }
    });

    // Calculate average for each meal type
    Object.keys(mealTypeStats).forEach((mealType) => {
      if (mealTypeStats[mealType].count > 0) {
        mealTypeStats[mealType].averageRating = (
          mealTypeStats[mealType].totalRating / mealTypeStats[mealType].count
        ).toFixed(1);
      }
    });

    res.render("feedbackData", {
      feedbackData,
      statistics: Object.values(statistics),
      mealTypeStats,
      averageRating,
      filters: { day, mealType, startDate, endDate },
      loggedIn: isLoggedIn,
      role,
    });
  } catch (error) {
    console.error("Error fetching feedback data:", error);
    res.status(500).send("Error fetching feedback data");
  }
};
