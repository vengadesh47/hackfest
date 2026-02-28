const Claim = require('../models/Claim');
const PDFDocument = require('pdfkit');

const uploadClaim = async (req, res) => {
  try {
    const { patientName, hospitalName, insuranceCompany, claimType, requestedAmount } = req.body;
    
    // AI Simulation Logic
    const rand = Math.random();
    let status, approvalAmount, rejectionReason, aiAnalysis;

    if (rand < 0.60) {
      status = 'approved';
      approvalAmount = requestedAmount;
      aiAnalysis = "Claim verified against policy terms. All documents present and valid.";
    } else if (rand < 0.85) {
      status = 'partial';
      approvalAmount = Math.floor(requestedAmount * 0.7);
      rejectionReason = "Service charges exceeded policy limits.";
      aiAnalysis = "Partial match found. Some billing items are outside the standard package rates for this hospital.";
    } else {
      status = 'rejected';
      approvalAmount = 0;
      rejectionReason = "Pre-existing condition clause (Section 4.2) applies.";
      aiAnalysis = "High risk detected. Medical history suggests symptoms prior to policy inception.";
    }

    const claim = await Claim.create({
      patientName,
      hospitalName,
      insuranceCompany,
      claimType,
      status,
      requestedAmount,
      approvalAmount,
      rejectionReason,
      aiAnalysis,
      uploadedFilePath: req.file ? req.file.path : 'uploads/mock.pdf',
      createdBy: req.user._id
    });

    res.status(201).json(claim);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getClaims = async (req, res) => {
  const claims = await Claim.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json(claims);
};

const getClaimById = async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (claim) {
    res.json(claim);
  } else {
    res.status(404).json({ message: 'Claim not found' });
  }
};

const updateClaimStatus = async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (claim) {
    claim.status = req.body.status || claim.status;
    const updatedClaim = await claim.save();
    res.json(updatedClaim);
  } else {
    res.status(404).json({ message: 'Claim not found' });
  }
};

const deleteClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    // Only allow the creator to delete their own claim
    if (claim.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this claim' });
    }
    await claim.deleteOne();
    res.json({ message: 'Claim deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateClaimReport = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    if (claim.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this claim' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ClaimReport_${claim._id}.pdf`
    );
    doc.pipe(res);

    // --- Brand Colors ---
    const TEAL = '#0F3D3E';
    const GOLD = '#D9C27A';
    const LIGHT_BG = '#F8F9F8';
    const GRAY = '#6B7280';
    const WHITE = '#FFFFFF';

    // --- Helper: draw a horizontal rule ---
    const drawHR = (y, color = '#E5E7EB') => {
      doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(1).stroke();
    };

    // ========== HEADER ==========
    doc.rect(0, 0, 595.28, 100).fill(TEAL);
    doc.fontSize(26).fillColor(WHITE).font('Helvetica-Bold').text('ClaimPilot', 50, 30);
    doc.fontSize(10).fillColor(GOLD).font('Helvetica').text('India', 210, 38);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica').text('AI-Powered TPA Claim Processing Platform', 50, 62);
    doc.fontSize(8).fillColor(GOLD).text(`Report Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 50, 78);

    // ========== STATUS BANNER ==========
    let statusLabel, statusColor;
    switch (claim.status) {
      case 'approved':
        statusLabel = 'APPROVED';
        statusColor = '#16A34A';
        break;
      case 'rejected':
        statusLabel = 'REJECTED';
        statusColor = '#DC2626';
        break;
      case 'partial':
        statusLabel = 'PARTIAL APPROVAL';
        statusColor = '#D97706';
        break;
      default:
        statusLabel = 'PENDING';
        statusColor = '#2563EB';
    }

    doc.rect(0, 100, 595.28, 40).fill(statusColor);
    doc.fontSize(14).fillColor(WHITE).font('Helvetica-Bold').text(`Claim Status: ${statusLabel}`, 50, 112);

    // ========== CLAIM ID & DATE ==========
    let y = 160;
    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(`Claim ID: ${claim._id}`, 50, y);
    const submittedDate = claim.createdAt
      ? new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    doc.text(`Submitted: ${submittedDate}`, 350, y);
    y += 25;
    drawHR(y);
    y += 15;

    // ========== CLAIM INFORMATION SECTION ==========
    doc.fontSize(14).fillColor(TEAL).font('Helvetica-Bold').text('Claim Information', 50, y);
    y += 25;

    const infoFields = [
      ['Patient Name', claim.patientName],
      ['Hospital Name', claim.hospitalName],
      ['Insurance Company', claim.insuranceCompany],
      ['Claim Type', (claim.claimType || '').toUpperCase()],
    ];

    infoFields.forEach(([label, value]) => {
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label, 50, y);
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold').text(value || 'N/A', 200, y);
      y += 20;
    });

    y += 10;
    drawHR(y);
    y += 15;

    // ========== FINANCIAL SUMMARY ==========
    doc.fontSize(14).fillColor(TEAL).font('Helvetica-Bold').text('Financial Summary', 50, y);
    y += 25;

    const requestedAmt = claim.requestedAmount || 0;
    const approvedAmt = claim.approvalAmount || 0;
    const approvalPct = requestedAmt > 0 ? Math.round((approvedAmt / requestedAmt) * 100) : 0;

    // Financial box
    doc.rect(50, y, 495, 70).fill(LIGHT_BG).strokeColor('#E5E7EB').lineWidth(1).stroke();

    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text('Requested Amount', 70, y + 12);
    doc.fontSize(16).fillColor('#1F2937').font('Helvetica-Bold').text(`Rs. ${requestedAmt.toLocaleString('en-IN')}`, 70, y + 26);

    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text('Approved Amount', 250, y + 12);
    doc.fontSize(16).fillColor(statusColor).font('Helvetica-Bold').text(`Rs. ${approvedAmt.toLocaleString('en-IN')}`, 250, y + 26);

    doc.fontSize(9).fillColor(GRAY).font('Helvetica').text('Approval Rate', 430, y + 12);
    doc.fontSize(16).fillColor(statusColor).font('Helvetica-Bold').text(`${approvalPct}%`, 430, y + 26);

    // Approval bar
    const barX = 70, barY = y + 52, barW = 455, barH = 6;
    doc.rect(barX, barY, barW, barH).fill('#E5E7EB');
    if (approvalPct > 0) {
      doc.rect(barX, barY, barW * (approvalPct / 100), barH).fill(statusColor);
    }

    y += 90;
    drawHR(y);
    y += 15;

    // ========== AI ANALYSIS ==========
    doc.fontSize(14).fillColor(TEAL).font('Helvetica-Bold').text('AI Analysis', 50, y);
    y += 5;
    doc.fontSize(8).fillColor(GOLD).font('Helvetica').text('Powered by ClaimPilot AI Engine', 50, y + 15);
    y += 30;

    doc.rect(50, y, 495, 0).fill(LIGHT_BG); // placeholder height, expand below
    const analysisText = claim.aiAnalysis || 'No AI analysis available.';
    doc.rect(50, y, 495, 50).fill(LIGHT_BG).strokeColor('#E5E7EB').lineWidth(1).stroke();
    doc.fontSize(10).fillColor('#374151').font('Helvetica').text(`"${analysisText}"`, 65, y + 12, { width: 465, lineGap: 4 });

    y += 60;

    // ========== REJECTION REASON (if applicable) ==========
    if (claim.rejectionReason) {
      y += 5;
      doc.rect(50, y, 495, 45).fill('#FEF2F2').strokeColor('#FECACA').lineWidth(1).stroke();
      doc.fontSize(10).fillColor('#DC2626').font('Helvetica-Bold').text('Rejection Reason', 65, y + 10);
      doc.fontSize(9).fillColor('#991B1B').font('Helvetica').text(claim.rejectionReason, 65, y + 26, { width: 465 });
      y += 55;
    }

    // ========== FOOTER ==========
    const footerY = 770;
    drawHR(footerY, GOLD);
    doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(
      'This is a system-generated report from ClaimPilot India. For queries, contact your TPA administrator.',
      50, footerY + 10, { width: 495, align: 'center' }
    );
    doc.fontSize(7).fillColor(GOLD).font('Helvetica').text(
      'ClaimPilot India | AI-Powered TPA Claim Processing',
      50, footerY + 25, { width: 495, align: 'center' }
    );

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadClaim, getClaims, getClaimById, updateClaimStatus, deleteClaim, generateClaimReport };
