import express from "express";
import {
  globalSearch,
  getSearchSuggestions,
} from "../controller/search.controller.js";

const router = express.Router();

// localhost:3000/api/v1/search/global - Global search with filters
router.get("/global", globalSearch);

// localhost:3000/api/v1/search/suggestions - Get search suggestions
router.get("/suggestions", getSearchSuggestions);

export default router;
