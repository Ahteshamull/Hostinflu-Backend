import legalDocModel from "../schema/legalDoc.modal.js";

export const createDoc = async (req, res) => {
  try {
    const { content } = req.params;
    const { description } = req.body;

    // Validate required fields
    if (!content || !description) {
      return res.status(400).json({
        success: false,
        message: "Content parameter and description are required",
      });
    }

    // Find existing document by content
    const existingDoc = await legalDocModel.findOne({ content });

    if (existingDoc) {
      // Update existing document
      existingDoc.description = description;
      const updatedDoc = await existingDoc.save();

      return res.status(200).json({
        success: true,
        message: "Legal document updated successfully",
        data: updatedDoc,
      });
    } else {
      // Create new document
      const newDoc = new legalDocModel({
        content,
        description,
      });

      const savedDoc = await newDoc.save();

      return res.status(201).json({
        success: true,
        message: "Legal document created successfully",
        data: savedDoc,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process legal document",
      error: error.message,
    });
  }
};

export const getDoc = async (req, res) => {
  try {
    const { content } = req.params;

    // If content is specified, filter by content type
    let query = {};
    if (content) {
      query.content = content;
    }

    // Find documents
    const documents = await legalDocModel.find(query);

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No legal documents found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Legal documents retrieved successfully",
      data: documents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve legal documents",
      error: error.message,
    });
  }
};
