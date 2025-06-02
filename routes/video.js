const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const Router = express.Router();
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const video = require('../models/Video.model');
const mongoose = require('mongoose');

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_API_KEY, 
  api_secret: process.env.CLOUD_API_SECRET, 
});

Router.post('/upload', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = jwt.verify(token, "sagar");
    
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      console.error("[UPLOAD ERROR] Missing video or thumbnail files");
      return res.status(400).json({ error: "Video and thumbnail files are required" });
    }

    const uploadedVideo = await cloudinary.uploader.upload(req.files.video.tempFilePath, { resource_type: 'video' });
    const uploadedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath);

    const { title, description, category, tags } = req.body;

    const newVideo = new video({
      _id: new mongoose.Types.ObjectId(),
      title,
      description,
      user_id: user._id,
      videoUrl: uploadedVideo.secure_url,
      videoId: uploadedVideo.public_id,
      thumbnailUrl: uploadedThumbnail.secure_url,
      thumbnailId: uploadedThumbnail.public_id,
      category,
      tags: tags ? tags.split(",") : [],
    });

    const newUploadedVideo = await newVideo.save();

    res.status(200).json({ newVideo: newUploadedVideo });

  } catch (error) {
    console.error("[UPLOAD ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update video detail
Router.put('/:videoId', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, "sagar");

    const Video = await video.findById(req.params.videoId);
    if (!Video) {
      console.error(`[UPDATE ERROR] Video not found: ${req.params.videoId}`);
      return res.status(404).json({ error: "Video not found" });
    }
    
    if (Video.user_id.toString() !== verifiedUser._id) {
      console.warn(`[UPDATE PERMISSION DENIED] User ${verifiedUser._id} tried to update video ${req.params.videoId}`);
      return res.status(403).json({ error: "You don't have permission to update this video" });
    }

    let updatedData;

    if (req.files && req.files.thumbnail) {
      await cloudinary.uploader.destroy(Video.thumbnailId);
      const updatedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath);

      updatedData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        tags: req.body.tags ? req.body.tags.split(",") : [],
        thumbnailUrl: updatedThumbnail.secure_url,
        thumbnailId: updatedThumbnail.public_id,
      };
    } else {
      updatedData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        tags: req.body.tags ? req.body.tags.split(",") : [],
      };
    }

    const updatedVideoDetail = await video.findByIdAndUpdate(req.params.videoId, updatedData, { new: true });

    res.status(200).json({ updatedVideo: updatedVideoDetail });

  } catch (error) {
    console.error("[UPDATE VIDEO ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete video API
Router.delete("/:videoId", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, "sagar");

    const Video = await video.findById(req.params.videoId);
    if (!Video) {
      console.error(`[DELETE ERROR] Video not found: ${req.params.videoId}`);
      return res.status(404).json({ error: "Video not found" });
    }

    if (Video.user_id.toString() !== verifiedUser._id) {
      console.warn(`[DELETE PERMISSION DENIED] User ${verifiedUser._id} tried to delete video ${req.params.videoId}`);
      return res.status(403).json({ error: "You are not authorized to perform this action" });
    }

    await cloudinary.uploader.destroy(Video.videoId, { resource_type: "video" });
    await cloudinary.uploader.destroy(Video.thumbnailId);

    const deletedRes = await video.findByIdAndDelete(req.params.videoId);

    res.status(200).json({ message: "Data deleted successfully", data: deletedRes });

  } catch (error) {
    console.error("[DELETE VIDEO ERROR]:", error);
    res.status(500).json({ error: error.message });
  }
});

// Like API
Router.put("/like/:videoId", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, "sagar");

    const Video = await video.findById(req.params.videoId);
    if (!Video) {
      console.error(`[LIKE ERROR] Video not found: ${req.params.videoId}`);
      return res.status(404).json({ error: "Video not found" });
    }

    if (Video.likedBy.includes(verifiedUser._id)) {
      return res.status(400).json({ error: "Already liked" });
    }

    if (Video.dislikedBy.includes(verifiedUser._id)) {
      Video.dislike -= 1;
      Video.dislikedBy = Video.dislikedBy.filter(userId => userId.toString() !== verifiedUser._id);
    }

    Video.likes += 1;
    Video.likedBy.push(verifiedUser._id);
    await Video.save();

    res.status(200).json({ msg: 'Video liked successfully' });

  } catch (error) {
    console.error("[LIKE API ERROR]:", error);
    res.status(500).json({ error: 'Error in like API' });
  }
});

// Dislike API
Router.put("/dislike/:videoId", checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const verifiedUser = jwt.verify(token, "sagar");

    const Video = await video.findById(req.params.videoId);
    if (!Video) {
      console.error(`[DISLIKE ERROR] Video not found: ${req.params.videoId}`);
      return res.status(404).json({ error: "Video not found" });
    }

    if (Video.dislikedBy.includes(verifiedUser._id)) {
      return res.status(400).json({ error: "Already disliked" });
    }

    if (Video.likedBy.includes(verifiedUser._id)) {
      Video.likes -= 1;
      Video.likedBy = Video.likedBy.filter(userId => userId.toString() !== verifiedUser._id);
    }

    Video.dislike += 1;
    Video.dislikedBy.push(verifiedUser._id);
    await Video.save();

    res.status(200).json({ msg: 'Video disliked successfully' });

  } catch (error) {
    console.error("[DISLIKE API ERROR]:", error);
    res.status(500).json({ error: 'Error in dislike API' });
  }
});

// Views increment API
Router.put('/views/:videoId', async (req, res) => {
  try {
    const Video = await video.findById(req.params.videoId);
    if (!Video) {
      console.error(`[VIEWS ERROR] Video not found: ${req.params.videoId}`);
      return res.status(404).json({ error: "Video not found" });
    }

    Video.views += 1;
    await Video.save();

    res.status(200).json({ msg: "Views updated" });
    console.log(`[VIEWS UPDATED] VideoId: ${req.params.videoId}, total views: ${Video.views}`);

  } catch (error) {
    console.error("[VIEWS ERROR]:", error);
    res.status(500).json({ msg: 'Error in updating views' });
  }
});

module.exports = Router;
