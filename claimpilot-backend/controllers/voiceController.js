const PDFDocument = require('pdfkit');

const TEMPLATES = {
  general: {
    title: 'General Medical Note',
    sections: ['Patient History', 'Symptoms', 'Diagnosis', 'Treatment Plan', 'Prescription Notes', 'Follow-up'],
  },
  discharge: {
    title: 'Discharge Summary',
    sections: ['Admission Summary', 'Hospital Course', 'Procedures Performed', 'Discharge Diagnosis', 'Medications', 'Instructions'],
  },
  preauth: {
    title: 'Pre-Authorization Note',
    sections: ['Patient Details', 'Medical Necessity', 'Proposed Treatment', 'Cost Estimate', 'Supporting Evidence'],
  },
  consultation: {
    title: 'Consultation Note',
    sections: ['Chief Complaint', 'History of Present Illness', 'Examination Findings', 'Assessment', 'Plan'],
  },
};

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
    const { text, language, template } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Transcribed text is required.' });
    }

    const tmpl = TEMPLATES[template] || TEMPLATES.general;
    const langName = LANGUAGE_NAMES[language] || language || 'English';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Split text into rough sections by sentences
    const sentences = text.split(/[.!?।]+/).map((s) => s.trim()).filter(Boolean);
    const sectionCount = tmpl.sections.length;
    const perSection = Math.max(1, Math.ceil(sentences.length / sectionCount));

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `ClaimPilot - ${tmpl.title}`,
        Author: 'ClaimPilot Enterprise',
        Subject: 'Medical Document',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ClaimPilot_Medical_Document_${Date.now()}.pdf`);
    doc.pipe(res);

    // ---- Header with teal bar + gold accent ----
    doc.rect(0, 0, 595, 100).fill('#0F3D3E');
    doc.rect(0, 90, 595, 10).fill('#D9C27A');

    // Logo text
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
      .text('ClaimPilot', 60, 25, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor('#D9C27A')
      .text('Enterprise TPA Platform', 60, 52);

    // Right side: Date & Time
    doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF')
      .text(`Generated: ${dateStr}`, 350, 30, { align: 'right', width: 185 });
    doc.text(`Time: ${timeStr}`, 350, 42, { align: 'right', width: 185 });
    doc.text(`Language: ${langName}`, 350, 54, { align: 'right', width: 185 });

    doc.moveDown(2);
    let y = 120;

    // ---- Document Title ----
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F3D3E')
      .text(tmpl.title, 60, y);
    y += 30;

    // Thin line
    doc.moveTo(60, y).lineTo(535, y).lineWidth(1).strokeColor('#E2E8F0').stroke();
    y += 15;

    // ---- Meta Info ----
    doc.font('Helvetica').fontSize(9).fillColor('#64748B')
      .text(`Document ID: CPD-${Date.now().toString(36).toUpperCase()}`, 60, y);
    y += 14;
    doc.text(`Source Language: ${langName}`, 60, y);
    y += 14;
    doc.text(`Template: ${tmpl.title}`, 60, y);
    y += 14;
    doc.text(`Word Count: ${text.split(/\s+/).filter(Boolean).length} words`, 60, y);
    y += 25;

    // Separator
    doc.moveTo(60, y).lineTo(535, y).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
    y += 20;

    // ---- Sections ----
    tmpl.sections.forEach((sectionTitle, idx) => {
      // Check for page break
      if (y > 700) {
        doc.addPage();
        y = 60;
      }

      // Section header with gold accent bar
      doc.rect(60, y, 4, 18).fill('#D9C27A');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F3D3E')
        .text(`${idx + 1}. ${sectionTitle}`, 72, y + 2);
      y += 28;

      // Section content
      const start = idx * perSection;
      const sectionSentences = sentences.slice(start, start + perSection);
      const sectionText = sectionSentences.length > 0
        ? sectionSentences.join('. ') + '.'
        : '(No content recorded for this section)';

      doc.font('Helvetica').fontSize(10).fillColor('#334155');
      const textHeight = doc.heightOfString(sectionText, { width: 415 });
      
      // Light background for content
      doc.rect(60, y - 5, 475, textHeight + 20).fill('#F8F9F8');
      doc.font('Helvetica').fontSize(10).fillColor('#334155')
        .text(sectionText, 72, y + 3, { width: 451, lineGap: 4 });
      
      y += textHeight + 30;
    });

    // ---- Full Transcription ----
    if (y > 650) {
      doc.addPage();
      y = 60;
    }

    y += 10;
    doc.moveTo(60, y).lineTo(535, y).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
    y += 20;

    doc.rect(60, y, 4, 18).fill('#0F3D3E');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F3D3E')
      .text('Full Transcription', 72, y + 2);
    y += 28;

    doc.font('Helvetica').fontSize(9).fillColor('#475569')
      .text(text, 60, y, { width: 475, lineGap: 4 });

    // ---- Footer on each page ----
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Footer line
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
