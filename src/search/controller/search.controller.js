import { Listing } from "../../listing/schema/listing.modal.js";

const globalSearch = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      limit = 10,
      propertyType,
      location,
      minPrice,
      maxPrice,
    } = req.query;

    // Build search filter
    let filter = { status: "verified" }; // Only show verified listings

    // Text search in title, description, and location
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ];
    }

    // Filter by property type
    if (propertyType) {
      filter.propertyType = propertyType;
    }

    // Filter by location
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Execute search with pagination
    const listings = await Listing.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Listing.countDocuments(filter);

    res.status(200).json({
      success: true,
      error: false,
      message: "Search completed successfully",
      data: {
        listings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error during search",
      error: error.message,
    });
  }
};

const getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(200).json({
        success: true,
        error: false,
        message: "No search query provided",
        data: { suggestions: [] },
      });
    }

    // Get unique locations, property types, and titles for suggestions
    const [locations, propertyTypes, titles] = await Promise.all([
      Listing.distinct("location", { status: "verified" }),
      Listing.distinct("propertyType", { status: "verified" }),
      Listing.distinct("title", { status: "verified" }),
    ]);

    // Generate suggestions based on query
    const suggestions = [
      ...locations
        .filter((loc) => loc.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((loc) => ({ type: "location", value: loc })),
      ...propertyTypes
        .filter((type) => type.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((type) => ({ type: "propertyType", value: type })),
      ...titles
        .filter((title) => title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .map((title) => ({ type: "title", value: title })),
    ];

    res.status(200).json({
      success: true,
      error: false,
      message: "Suggestions retrieved successfully",
      data: { suggestions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error getting suggestions",
      error: error.message,
    });
  }
};

export { globalSearch, getSearchSuggestions };
