import { Listing } from "../../listing/schema/listing.modal.js";
import Deal from "../../deals/schema/deal.modal.js";
import Collaboration from "../../collaboration/schema/collaboration.modal.js";
import User from "../../auth/schema/auth.modal.js";

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
      searchType = "all", // all, users, listings, deals, collaborations
    } = req.query;

    const searchRegex = query ? { $regex: query, $options: "i" } : null;
    const results = {
      users: [],
      listings: [],
      deals: [],
      collaborations: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        total: 0,
        limit: parseInt(limit),
      },
    };

    let userCount = 0;
    let listingCount = 0;
    let dealCount = 0;
    let collaborationCount = 0;

    // Search Users
    if (searchType === "all" || searchType === "users") {
      const userFilter = {};
      if (query) {
        userFilter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { userName: searchRegex },
          { aboutMe: searchRegex },
          { city: searchRegex },
          { country: searchRegex },
        ];
      }

      const [users, count] = await Promise.all([
        User.find(userFilter)
          .select("name email userName role city country aboutMe image")
          .limit(limit * 1)
          .skip((page - 1) * limit),
        User.countDocuments(userFilter)
      ]);

      results.users = users;
      userCount = count;
    }

    // Search Listings
    if (searchType === "all" || searchType === "listings") {
      const listingFilter = { status: "verified" };

      if (query) {
        listingFilter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
          { propertyType: searchRegex },
          { customAmenities: searchRegex },
        ];
      }

      if (propertyType) {
        listingFilter.propertyType = propertyType;
      }

      if (location) {
        listingFilter.location = { $regex: location, $options: "i" };
      }

      if (minPrice || maxPrice) {
        listingFilter.price = {};
        if (minPrice) listingFilter.price.$gte = parseFloat(minPrice);
        if (maxPrice) listingFilter.price.$lte = parseFloat(maxPrice);
      }

      const [listings, count] = await Promise.all([
        Listing.find(listingFilter)
          .populate("userId")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit),
        Listing.countDocuments(listingFilter)
      ]);

      results.listings = listings;
      listingCount = count;
    }

    // Search Deals
    if (searchType === "all" || searchType === "deals") {
      const dealFilter = {};
      if (query) {
        dealFilter.$or = [
          { description: searchRegex },
          { addAirbnbLink: searchRegex },
        ];
      }

      const [deals, count] = await Promise.all([
        Deal.find(dealFilter)
          .populate("userId")
          .populate("title", "title location")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit),
        Deal.countDocuments(dealFilter)
      ]);

      results.deals = deals;
      dealCount = count;
    }

    // Search Collaborations
    if (searchType === "all" || searchType === "collaborations") {
      const collaborationFilter = {};
      if (query) {
        collaborationFilter.$or = [
          { payment: searchRegex },
          { "socialMediaLinks.instagram": searchRegex },
          { "socialMediaLinks.facebook": searchRegex },
          { "socialMediaLinks.twitter": searchRegex },
          { "socialMediaLinks.youtube": searchRegex },
          { "socialMediaLinks.tiktok": searchRegex },
        ];
      }

      const [collaborations, count] = await Promise.all([
        Collaboration.find(collaborationFilter)
          .populate("userId")
          .populate("selectInfluencerOrHost")
          .populate("selectDeal")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit),
        Collaboration.countDocuments(collaborationFilter)
      ]);

      results.collaborations = collaborations;
      collaborationCount = count;
    }

    // Calculate total results from database matching count
    const total = userCount + listingCount + dealCount + collaborationCount;
    results.pagination.total = total;
    results.pagination.totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      error: false,
      message: "Search completed successfully",
      data: results,
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

const specificSearch = async (req, res) => {
  try {
    const {
      query: collection = "all", // users | listings | collaborations | deals | all
      searchType: keyword = "", // actual search text
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    // ✅ validate collection
    const validCollections = [
      "all",
      "users",
      "user", // singular form
      "listings",
      "listing", // singular form
      "collaborations",
      "collaboration", // singular form
      "deals",
      "deal", // singular form
    ];
    let actualCollection = validCollections.includes(collection)
      ? collection
      : "all";

    // If collection is invalid, fallback to the keyword as collection if it's valid
    if (collection !== actualCollection && validCollections.includes(keyword)) {
      actualCollection = keyword;
    }

    const searchRegex = keyword ? { $regex: keyword, $options: "i" } : null;

    const results = {
      users: [],
      listings: [],
      collaborations: [],
      deals: [],
    };

    // 👤 USERS - search if collection is "users" or "all"
    if (actualCollection === "users" || actualCollection === "all") {
      const userFilter = {};
      if (keyword) {
        userFilter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      results.users = await User.find(userFilter)
        .select("name email phone role image createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();
    }

    // 🏠 LISTINGS - search if collection is "listings" or "all"
    if (actualCollection === "listings" || actualCollection === "all") {
      const listingFilter = { status: "verified" };
      if (keyword) {
        listingFilter.$or = [
          { title: searchRegex },
          { location: searchRegex },
          { propertyType: searchRegex },
          { status: searchRegex },
        ];
      }

      results.listings = await Listing.find(listingFilter)
        .populate("userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();
    }

    // 🤝 COLLABORATIONS - search if collection is "collaborations" or "all"
    if (actualCollection === "collaborations" || actualCollection === "all") {
      const collaborationFilter = {};
      if (keyword) {
        collaborationFilter.$or = [
          { payment: searchRegex },
          { status: searchRegex },
        ];
      }

      const collaborations = await Collaboration.find(collaborationFilter)
        .populate("userId")
        .populate("selectInfluencerOrHost")
        .populate("selectDeal")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      results.collaborations = collaborations.map((collab) => {
        const duration =
          collab.freeStay && collab.startDate && collab.endDate
            ? `${Math.ceil(
                (new Date(collab.endDate) - new Date(collab.startDate)) /
                  (1000 * 60 * 60 * 24),
              )} nights`
            : "N/A";

        return {
          influencer:
            collab.selectInfluencerOrHost?.name || collab.userId?.name || "N/A",
          dealName:
            collab.selectDeal?.description?.substring(0, 50) + "..." || "N/A",
          duration,
          payment: collab.payment,
          status: collab.status,
          startDate: collab.startDate,
          endDate: collab.endDate,
        };
      });
    }

    // DEALS - search if collection is "deals" or "all"
    if (actualCollection === "deals" || actualCollection === "all") {
      const dealFilter = {};
      if (keyword) {
        dealFilter.$or = [
          { description: searchRegex },
          { status: searchRegex },
          { addAirbnbLink: searchRegex },
        ];
      }

      const deals = await Deal.find(dealFilter)
        .populate("userId")
        .populate("title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      // For deals, we also need to match search regex on populated title fields if keyword exists
      if (keyword) {
        // Find if the populated title contains the keyword
        results.deals = deals.filter((deal) => {
          return (
            (deal.description &&
              deal.description.toLowerCase().includes(keyword.toLowerCase())) ||
            (deal.status &&
              deal.status.toLowerCase().includes(keyword.toLowerCase())) ||
            (deal.addAirbnbLink &&
              deal.addAirbnbLink.toLowerCase().includes(keyword.toLowerCase())) ||
            (deal.title &&
              deal.title.title &&
              deal.title.title.toLowerCase().includes(keyword.toLowerCase()))
          );
        });
      } else {
        results.deals = deals;
      }
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Specific search completed successfully",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error during specific search",
      error: error.message,
    });
  }
};

export { globalSearch, specificSearch };
