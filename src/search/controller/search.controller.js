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

      const users = await User.find(userFilter)
        .select("name email userName role city country aboutMe image")
        .limit(limit * 1)
        .skip((page - 1) * limit);

      results.users = users;
    }

    // Search Listings
    if (searchType === "all" || searchType === "listings") {
      const listingFilter = {};

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

      const listings = await Listing.find(listingFilter)
        .populate("userId")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      results.listings = listings;
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

      const deals = await Deal.find(dealFilter)
        .populate("userId")
        .populate("title", "title location")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      results.deals = deals;
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

      const collaborations = await Collaboration.find(collaborationFilter)
        .populate("userId")
        .populate("selectInfluencerOrHost")
        .populate("selectDeal")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      results.collaborations = collaborations;
    }

    // Calculate total results
    const total =
      results.users.length +
      results.listings.length +
      results.deals.length +
      results.collaborations.length;
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
    } = req.query;

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
    const actualCollection = validCollections.includes(collection)
      ? collection
      : "all";

    // If collection is invalid, fallback to the keyword as collection if it's valid
    if (collection !== actualCollection && validCollections.includes(keyword)) {
      actualCollection = keyword;
    } else if (collection !== actualCollection) {
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
      const users = await User.find({})
        .select("name email phone role image createdAt")
        .sort({ createdAt: -1 })
        .lean();

      // Filter users in JavaScript after population
      const filteredUsers = users.filter((user) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();

        return (
          (user.name && user.name.toLowerCase().includes(searchTerm)) ||
          (user.email && user.email.toLowerCase().includes(searchTerm)) ||
          (user.phone && user.phone.toLowerCase().includes(searchTerm))
        );
      });

      results.users = filteredUsers;
    }

    // 🏠 LISTINGS - search if collection is "listings" or "all"
    if (actualCollection === "listings" || actualCollection === "all") {
      const listings = await Listing.find({})
        .populate("userId")
        .sort({ createdAt: -1 })
        .lean();

      // Filter listings in JavaScript after population
      const filteredListings = listings.filter((listing) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();

        return (
          (listing.title && listing.title.toLowerCase().includes(searchTerm)) ||
          (listing.location &&
            listing.location.toLowerCase().includes(searchTerm)) ||
          (listing.propertyType &&
            listing.propertyType.toLowerCase().includes(searchTerm)) ||
          (listing.status && listing.status.toLowerCase().includes(searchTerm))
        );
      });

      results.listings = filteredListings;
    }

    // 🤝 COLLABORATIONS - search if collection is "collaborations" or "all"
    if (actualCollection === "collaborations" || actualCollection === "all") {
      const collaborations = await Collaboration.find({})
        .populate("userId")
        .populate("selectInfluencerOrHost")
        .populate("selectDeal")
        .sort({ createdAt: -1 })
        .lean();

      // Filter collaborations in JavaScript after population
      const filteredCollaborations = collaborations.filter((collab) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();

        return (
          (collab.payment &&
            collab.payment.toLowerCase().includes(searchTerm)) ||
          (collab.status && collab.status.toLowerCase().includes(searchTerm))
        );
      });

      results.collaborations = filteredCollaborations.map((collab) => {
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
      // First get all deals, then filter in JavaScript
      const deals = await Deal.find({})
        .populate("userId")
        .populate("title")
        .sort({ createdAt: -1 })
        .lean();

      // Filter deals in JavaScript after population
      const filteredDeals = deals.filter((deal) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();

        return (
          (deal.description &&
            deal.description.toLowerCase().includes(searchTerm)) ||
          (deal.status && deal.status.toLowerCase().includes(searchTerm)) ||
          (deal.addAirbnbLink &&
            deal.addAirbnbLink.toLowerCase().includes(searchTerm)) ||
          (deal.title &&
            deal.title.title &&
            deal.title.title.toLowerCase().includes(searchTerm))
        );
      });

      results.deals = filteredDeals;
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
