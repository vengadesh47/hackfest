const mongoose = require('mongoose');

const claimSchema = mongoose.Schema(
  {
    patientName: { type: String, required: true },
    hospitalName: { type: String, required: true },
    insuranceCompany: { type: String, required: true },
    claimType: { type: String, enum: ['preauth', 'discharge', 'final'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'partial'], default: 'pending' },
    requestedAmount: { type: Number, required: true },
    approvalAmount: { type: Number, default: 0 },
    rejectionReason: { type: String },
    aiAnalysis: { type: String },
    uploadedFilePath: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Claim', claimSchema);
