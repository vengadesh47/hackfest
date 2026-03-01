const PDFDocument = require('pdfkit');

const LANGUAGE_NAMES = {
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'bn-IN': 'Bengali',
  'mr-IN': 'Marathi',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
  'or-IN': 'Odia',
  'ur-IN': 'Urdu',
  'en-US': 'English (US)',
};

exports.generateDocument = async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Transcribed text is required.' });
    }

    const langName = LANGUAGE_NAMES[language] || language || 'English';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: 'ClaimPilot - Transcription',
        Author: 'ClaimPilot Enterprise',
        Subject: 'Transcription Document',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ClaimPilot_Transcription_${Date.now()}.pdf`);
    doc.pipe(res);

    // ---- Header: Teal bar + gold accent ----
    doc.rect(0, 0, 595, 100).fill('#0F3D3E');
    doc.rect(0, 90, 595, 10).fill('#D9C27A');

    // Logo
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
      .text('ClaimPilot', 60, 25);
    doc.font('Helvetica').fontSize(9).fillColor('#D9C27A')
      .text('Enterprise TPA Platform', 60, 52);

    // Right side: Date & Time
    doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF')
      .text(`Generated: ${dateStr}`, 350, 30, { align: 'right', width: 185 });
    doc.text(`Time: ${timeStr}`, 350, 42, { align: 'right', width: 185 });
    doc.text(`Language: ${langName}`, 350, 54, { align: 'right', width: 185 });

    let y = 120;

    // ---- Title ----
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F3D3E')
      .text('Transcription', 60, y);
    y += 28;

    // Thin separator
    doc.moveTo(60, y).lineTo(535, y).lineWidth(1).strokeColor('#E2E8F0').stroke();
    y += 20;

    // ---- Transcription Content ----
    doc.font('Helvetica').fontSize(11).fillColor('#334155')
      .text(text, 60, y, { width: 475, lineGap: 5 });

    // ---- Footer on each page ----
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc.moveTo(60, 780).lineTo(535, 780).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
        .text('ClaimPilot Enterprise TPA Platform | Confidential Medical Document', 60, 788, { width: 375 });
      doc.text(`Page ${i + 1} of ${pages.count}`, 400, 788, { align: 'right', width: 135 });
    }

    doc.end();
  } catch (error) {
    console.error('Voice document generation error:', error);
    res.status(500).json({ message: 'Failed to generate document.' });
  }
};
