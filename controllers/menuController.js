const { MenuItems } = require("../models/menu.js");
const Feedback = require("../models/feedback");

exports.getMenu = async (req, res) => {
  try {
    const isLoggedIn = Boolean(req.cookies.jwt);
    const menuItems = await MenuItems.find();

    // Calculate ratings for each day-meal combination
    const dayMealRatings = {};
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const mealTypes = ["Breakfast", "Lunch", "Snacks", "Dinner"];

    // Initialize the structure
    days.forEach((day) => {
      dayMealRatings[day] = {};
      mealTypes.forEach((meal) => {
        dayMealRatings[day][meal] = {
          count: 0,
          totalRating: 0,
          averageRating: 0,
        };
      });
    });

    // Get all feedback entries
    const feedbackData = await Feedback.find();

    // Calculate totals and averages for each day-meal combo
    feedbackData.forEach((feedback) => {
      const day = feedback.day;
      const mealType = feedback.mealType;

      if (dayMealRatings[day] && dayMealRatings[day][mealType]) {
        dayMealRatings[day][mealType].count += 1;
        dayMealRatings[day][mealType].totalRating += parseInt(feedback.rating);
      }
    });

    // Calculate average for each day-meal combination
    days.forEach((day) => {
      mealTypes.forEach((meal) => {
        if (dayMealRatings[day][meal].count > 0) {
          dayMealRatings[day][meal].averageRating = (
            dayMealRatings[day][meal].totalRating /
            dayMealRatings[day][meal].count
          ).toFixed(1);
        }
      });
    });

    // For backwards compatibility, also provide meal-only ratings for the feedback dashboard
    const mealTypeRatings = {
      Breakfast: { count: 0, totalRating: 0, averageRating: 0 },
      Lunch: { count: 0, totalRating: 0, averageRating: 0 },
      Snacks: { count: 0, totalRating: 0, averageRating: 0 },
      Dinner: { count: 0, totalRating: 0, averageRating: 0 },
    };

    // Calculate totals and averages
    feedbackData.forEach((feedback) => {
      if (mealTypeRatings[feedback.mealType]) {
        mealTypeRatings[feedback.mealType].count += 1;
        mealTypeRatings[feedback.mealType].totalRating += parseInt(
          feedback.rating
        );
      }
    });

    // Calculate average for each meal type
    Object.keys(mealTypeRatings).forEach((mealType) => {
      if (mealTypeRatings[mealType].count > 0) {
        mealTypeRatings[mealType].averageRating = (
          mealTypeRatings[mealType].totalRating /
          mealTypeRatings[mealType].count
        ).toFixed(1);
      }
    });

    res.render("menu", {
      menuItems,
      dayMealRatings,
      mealTypeRatings, // Keep this for backward compatibility
      query: req.query,
      loggedIn: isLoggedIn,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment, day, mealType } = req.body;
    const sanitizedComment = comment.replace(/[\r\n]+/g, " ").trim();

    // Get user ID from cookies (will always be available due to authMiddleware)
    const userId = req.cookies.userid;

    if (!userId) {
      return res
        .status(401)
        .redirect("/login?redirect=/services/mess&message=login_required");
    }

    // Create new feedback using the Mongoose model
    const newFeedback = new Feedback({
      rating: rating || "No rating provided",
      comment: sanitizedComment || "No comment provided",
      day: day || "Sunday", // Default to Sunday if none provided
      mealType: mealType || "Breakfast", // Default to Breakfast if none provided
      user: userId, // User ID from auth middleware
    });

    // Save to MongoDB
    await newFeedback.save();

    res.redirect("/services/mess?feedback=success");
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).send(error.message);
  }
};
