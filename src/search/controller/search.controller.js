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
        .populate("userId", "name email")
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
        .populate("userId", "name email")
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
        .populate("userId", "name email")
        .populate("selectInfluencerOrHost", "name email")
        .populate("selectDeal", "description")
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
      page = 1,
      limit = 10,
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
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        total: 0,
        limit: parseInt(limit),
      },
    };

    // 👤 USERS - only if collection is "users"
    if (actualCollection === "users") {
      const userFilter = keyword
        ? {
            $or: [
              { name: searchRegex },
              { email: searchRegex },
              { phone: searchRegex },
            ],
          }
        : {};

      const users = await User.find(userFilter)
        .select("name email phone role image createdAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      results.users = users.map((user) => ({
        name: user.name,
        email: user.email,
        phone: user.phone || "N/A",
        role: user.role,
        image: user.image,
        dateAdded: user.createdAt,
      }));
    }

    // 🏠 LISTINGS - only if collection is "listings"
    if (actualCollection === "listings") {
      const listingFilter = keyword
        ? {
            $or: [
              { title: searchRegex },
              { location: searchRegex },
              { propertyType: searchRegex },
              { status: searchRegex },
            ],
          }
        : {};

      const listings = await Listing.find(listingFilter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      results.listings = listings.map((listing) => ({
        propertyName: listing.title,
        dateAdded: listing.createdAt,
        propertyType: listing.propertyType,
        status: listing.status,
        location: listing.location,
        owner: listing.userId?.name || "N/A",
      }));
    }

    // 🤝 COLLABORATIONS - only if collection is "collaborations"
    if (actualCollection === "collaborations") {
      const collaborationFilter = keyword
        ? {
            $or: [{ payment: searchRegex }, { status: searchRegex }],
          }
        : {};

      const collaborations = await Collaboration.find(collaborationFilter)
        .populate("userId", "name email")
        .populate("selectInfluencerOrHost", "name email")
        .populate("selectDeal", "description")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      results.collaborations = collaborations.map((collab) => {
        const duration =
          collab.freeStay && collab.startDate && collab.endDate
            ? `${Math.ceil(
                (new Date(collab.endDate) - new Date(collab.startDate)) /
                  (1000 * 60 * 60 * 24)
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

    // 💼 DEALS - only if collection is "deals"
    if (actualCollection === "deals") {
      const dealFilter = keyword
        ? {
            $or: [
              { description: searchRegex },
              { status: searchRegex },
              { addAirbnbLink: searchRegex },
            ],
          }
        : {};

      const deals = await Deal.find(dealFilter)
        .populate("userId", "name email")
        .populate("dealTitle", "title")
        .populate("selectListing", "title propertyType")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      results.deals = deals.map((deal) => {
        let amount = "N/A";

        if (
          deal.compensation?.directPayment &&
          deal.compensation?.paymentAmount
        ) {
          amount = deal.compensation.paymentAmount;
        } else if (
          deal.compensation?.nightCredits &&
          deal.compensation?.numberOfNights
        ) {
          amount = `${deal.compensation.numberOfNights} nights`;
        }

        return {
          name: deal.dealTitle?.title || deal.selectListing?.title || "N/A",
          influencer: deal.userId?.name || "N/A",
          status: deal.status,
          amount,
          category: deal.selectListing?.propertyType || "N/A",
          description: deal.description?.substring(0, 100) + "...",
          airbnbLink: deal.addAirbnbLink,
        };
      });
    }

    const total =
      results.users.length +
      results.listings.length +
      results.collaborations.length +
      results.deals.length;

    results.pagination.total = total;
    results.pagination.totalPages = Math.ceil(total / limit);

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
