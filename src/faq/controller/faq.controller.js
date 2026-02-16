import faqModel from "../schema/faq.modal.js";

export const createFaq = async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    const newFaq = new faqModel({
      question,
      answer,
      category: category || "general",
      createdBy: userId,
    });

    const savedFaq = await newFaq.save();

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: savedFaq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
      error: error.message,
    });
  }
};

export const getAllFaqs = async (req, res) => {
  try {
    const { category, page = 1, limit = 10, search } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const faqs = await faqModel
      .find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ order: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await faqModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "FAQs retrieved successfully",
      data: {
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
        faqs,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve FAQs",
      error: error.message,
    });
  }
};

export const getFaqById = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await faqModel
      .findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ retrieved successfully",
      data: faq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve FAQ",
      error: error.message,
    });
  }
};

export const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, isActive, order } = req.body;
    const userId = req.user?.id || req.user?._id;

    const faq = await faqModel.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;
    updateData.updatedBy = userId;

    const updatedFaq = await faqModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: updatedFaq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
      error: error.message,
    });
  }
};

export const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await faqModel.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
      data: faq,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
      error: error.message,
    });
  }
};
