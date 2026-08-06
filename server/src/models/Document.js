const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      required: true,
    },
    pages: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Pending',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ owner: 1, uploadDate: -1 });

module.exports = mongoose.model('Document', documentSchema);
