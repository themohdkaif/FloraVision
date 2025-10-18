require("dotenv").config();
const express = require("express");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// configure multer
const upload = multer({ dest: "upload/" });
app.use(express.json({ limit: "10mb" }));

// initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(express.static("public"));

// routes
// analyze
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const imagePath = req.file.path;
    const imageData = await fsPromises.readFile(imagePath, {
      encoding: "base64",
    });

    // Use the Gemini model to analyze the image
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([
      "You are an expert botanist and plant care specialist analyzing a plant image for a comprehensive plant identification and care website. Examine the provided image carefully and provide a detailed analysis in flowing paragraph format without any markdown formatting, bullet points, or special characters. Begin by identifying the plant's common name, scientific name, and plant family, followed by a description of its key identifying features such as leaf shape, color patterns, growth habit, and any visible flowers or unique characteristics. Then assess the plant's current health condition by noting the color and vitality of the leaves, checking for any signs of disease, pest damage, nutrient deficiencies, or environmental stress like yellowing, browning, spotting, or wilting. After the health assessment, provide comprehensive care instructions including specific light requirements such as whether it needs bright indirect light, partial shade, or full sun, along with detailed watering guidelines including frequency and techniques to avoid overwatering or underwatering. Include information about ideal soil type and drainage needs, optimal temperature and humidity ranges, fertilization recommendations with timing and type of fertilizer, and any pruning or maintenance tips. Also mention the plant's growth rate, mature size, and whether it's suitable for indoor or outdoor cultivation. Conclude with interesting facts about the plant such as its origin, any air-purifying properties, toxicity warnings for pets or children, cultural or historical significance, medicinal uses if any, and propagation methods for growing new plants. Write everything in natural, flowing paragraphs that are informative yet easy to understand for both beginner and experienced plant enthusiasts, ensuring the tone is friendly, helpful, and educational while maintaining scientific accuracy throughout the response.",
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageData,
        },
      },
    ]);

    const plantInfo = result.response.text();

    // Clean up uploaded file
    await fsPromises.unlink(imagePath);

    // Respond with analysis
    res.json({
      result: plantInfo,
      image: `data:${req.file.mimetype};base64,${imageData}`,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    res
      .status(500)
      .json({ error: "An error occurred while analyzing the image" });
  }
});

// Helper function to add gradient background
function addGradientBackground(doc, startColor, endColor, x, y, width, height) {
  const gradient = doc.linearGradient(x, y, x, y + height);
  gradient.stop(0, startColor).stop(1, endColor);
  doc.rect(x, y, width, height).fill(gradient);
}

// Helper function to draw a decorative shape
function drawDecorativeShape(doc, x, y, size, color, opacity = 0.1) {
  doc.save();
  doc.opacity(opacity);
  doc.circle(x, y, size).fill(color);
  doc.restore();
}

// download pdf
app.post("/download", async (req, res) => {
  try {
    const { result, image } = req.body;

    // Ensure the reports directory exists
    const reportsDir = path.join(__dirname, "reports");
    await fsPromises.mkdir(reportsDir, { recursive: true });

    // Generate PDF
    const filename = `FloraVision_Report_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);

    const writeStream = fs.createWriteStream(filePath);
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 40, right: 40 },
      bufferPages: true,
    });
    doc.pipe(writeStream);

    // ==================== PAGE 1: COVER PAGE ====================

    // Gradient background
    addGradientBackground(doc, "#000000", "#001a0d", 0, 0, 595, 842);

    // Decorative circles
    drawDecorativeShape(doc, 500, 100, 150, "#10b981", 0.08);
    drawDecorativeShape(doc, 100, 700, 120, "#34d399", 0.06);
    drawDecorativeShape(doc, 450, 600, 100, "#6ee7b7", 0.05);

    // Logo/Brand section
    doc.save();
    doc
      .fontSize(48)
      .fillColor("#10b981")
      .font("Helvetica-Bold")
      .text("FloraVision AI", 70, 150, { align: "left" });
    doc.restore();

    // Main title
    doc
      .fontSize(42)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Plant Analysis", 70, 230, { align: "left" });

    doc
      .fontSize(42)
      .fillColor("#10b981")
      .text("Report", 70, 280, { align: "left" });

    // Subtitle
    doc
      .fontSize(14)
      .fillColor("#9ca3af")
      .font("Helvetica")
      .text(
        "Comprehensive AI-Powered Plant Identification & Care Guide",
        70,
        350,
        {
          width: 400,
          align: "left",
        }
      );

    // Date badge
    doc.save();
    doc.roundedRect(70, 420, 200, 40, 20).fill("#10b981");
    doc
      .fontSize(12)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        70,
        432,
        {
          width: 200,
          align: "center",
        }
      );
    doc.restore();

    // Footer info on cover
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .font("Helvetica")
      .text("Generated by FloraVision AI Technology", 70, 750, {
        align: "left",
      })
      .text("www.FloraVision-ai.com", 70, 765, { align: "left" });

    // Stats bar at bottom
    const stats = [
      { icon: "*", label: "Accuracy", value: "99.8%" },
      { icon: ">", label: "Speed", value: "1.8s" },
      { icon: "+", label: "Database", value: "15K+" },
    ];

    let statsX = 70;
    stats.forEach((stat) => {
      doc.fontSize(24).fillColor("#10b981").text(stat.icon, statsX, 650);
      doc
        .fontSize(16)
        .fillColor("#10b981")
        .font("Helvetica-Bold")
        .text(stat.value, statsX + 15, 680);
      doc
        .fontSize(9)
        .fillColor("#6b7280")
        .font("Helvetica")
        .text(stat.label, statsX, 705);
      statsX += 150;
    });

    // ==================== PAGE 2: PLANT IMAGE ====================
    doc.addPage();

    // Gradient header
    addGradientBackground(doc, "#10b981", "#059669", 0, 0, 595, 100);

    // Header text
    doc
      .fontSize(24)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Plant Image Analysis", 50, 40);

    // Decorative line
    doc
      .moveTo(50, 90)
      .lineTo(545, 90)
      .lineWidth(2)
      .strokeColor("#ffffff")
      .stroke();

    // Insert image with border
    if (image) {
      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Image shadow/border effect
        doc.save();
        doc.roundedRect(75, 135, 450, 450, 15).fill("#e5e7eb");
        doc.restore();

        doc.save();
        doc.roundedRect(80, 140, 440, 440, 12).fill("#ffffff");
        doc.restore();

        doc.image(buffer, 90, 150, {
          fit: [420, 420],
          align: "center",
          valign: "center",
        });

        // Image caption
        doc
          .fontSize(11)
          .fillColor("#6b7280")
          .font("Helvetica-Oblique")
          .text("High-resolution plant specimen image", 50, 610, {
            width: 500,
            align: "center",
          });
      } catch (error) {
        console.error("Error adding image to PDF:", error);
      }
    }

    // Timestamp
    doc
      .fontSize(9)
      .fillColor("#9ca3af")
      .font("Helvetica")
      .text(`Analysis Date: ${new Date().toLocaleString()}`, 50, 750);

    // ==================== PAGE 3+: DETAILED ANALYSIS ====================
    doc.addPage();

    // Header
    addGradientBackground(doc, "#10b981", "#059669", 0, 0, 595, 80);
    doc
      .fontSize(22)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Detailed Analysis & Care Guide", 50, 30);

    let currentY = 110;

    // Add decorative element
    doc.save();
    doc.opacity(0.1);
    doc.circle(500, 150, 80).fill("#10b981");
    doc.restore();

    // Split the content into sections for better formatting
    const analysisText = result || "No analysis data available.";

    // Introduction box
    doc.save();
    doc
      .roundedRect(40, currentY - 15, 520, 60, 10)
      .fillAndStroke("#f0fdf4", "#10b981");

    doc
      .fontSize(10)
      .fillColor("#065f46")
      .font("Helvetica-Bold")
      .text("Analysis Summary", 55, currentY);

    doc
      .fontSize(10)
      .fillColor("#047857")
      .font("Helvetica")
      .text(
        "This report contains comprehensive information about your plant specimen.",
        55,
        currentY + 20,
        {
          width: 490,
          lineGap: 3,
        }
      );
    doc.restore();

    currentY += 80;

    // Main content with better formatting
    const paragraphs = analysisText.split("\n\n");

    paragraphs.forEach((paragraph, index) => {
      if (currentY > 700) {
        doc.addPage();

        // Header on new page
        addGradientBackground(doc, "#10b981", "#059669", 0, 0, 595, 60);
        doc
          .fontSize(16)
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .text("Plant Analysis Report (Continued)", 50, 22);

        currentY = 90;
      }

      // Add alternating background for readability
      if (index % 2 === 0) {
        doc.save();
        doc.opacity(0.03);
        doc.roundedRect(40, currentY - 8, 520, 100, 8).fill("#10b981");
        doc.restore();
      }

      // Section number
      doc.save();
      doc.circle(50, currentY + 5, 12).fill("#10b981");
      doc
        .fontSize(10)
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .text((index + 1).toString(), 45, currentY + 1);
      doc.restore();

      // Paragraph text with section marker
      const sectionMarkers = [
        "Plant Info",
        "Description",
        "Care Guide",
        "Light Needs",
        "Temperature",
        "Growth Tips",
        "Health Status",
        "Interesting Facts",
        "Summary",
      ];
      const marker = sectionMarkers[index % sectionMarkers.length];

      doc
        .fontSize(10)
        .fillColor("#10b981")
        .font("Helvetica-Bold")
        .text(`${marker}: `, 70, currentY, { continued: true })
        .fontSize(11)
        .fillColor("#333333")
        .font("Helvetica")
        .text(paragraph.trim(), {
          width: 470,
          align: "justify",
          lineGap: 5,
        });

      currentY = doc.y + 25;
    });

    // ==================== FINAL PAGE: CARE TIPS ====================
    doc.addPage();

    // Gradient header
    addGradientBackground(doc, "#10b981", "#059669", 0, 0, 595, 100);

    doc
      .fontSize(24)
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .text("Quick Care Tips", 50, 35);

    // Care tips boxes
    const careTips = [
      {
        icon: "W",
        title: "Watering",
        tip: "Check soil moisture regularly and water when top inch feels dry.",
      },
      {
        icon: "L",
        title: "Lighting",
        tip: "Place in appropriate light conditions as specified in the analysis.",
      },
      {
        icon: "T",
        title: "Temperature",
        tip: "Maintain optimal temperature range for healthy growth.",
      },
      {
        icon: "P",
        title: "Pruning",
        tip: "Remove dead or yellowing leaves to promote new growth.",
      },
      {
        icon: "F",
        title: "Fertilizing",
        tip: "Feed during growing season with appropriate nutrients.",
      },
      {
        icon: "R",
        title: "Repotting",
        tip: "Repot when roots become pot-bound or soil depletes.",
      },
    ];

    let tipY = 130;
    let tipX = 50;

    careTips.forEach((tip, index) => {
      if (index === 3) {
        tipY = 130;
        tipX = 315;
      }

      // Tip box
      doc.save();
      doc
        .roundedRect(tipX, tipY, 230, 110, 12)
        .fillAndStroke("#f0fdf4", "#10b981");

      // Icon
      doc
        .fontSize(32)
        .fillColor("#10b981")
        .text(tip.icon, tipX + 15, tipY + 15);

      // Title
      doc
        .fontSize(13)
        .fillColor("#047857")
        .font("Helvetica-Bold")
        .text(tip.title, tipX + 65, tipY + 20);

      // Description
      doc
        .fontSize(9)
        .fillColor("#065f46")
        .font("Helvetica")
        .text(tip.tip, tipX + 15, tipY + 55, {
          width: 200,
          lineGap: 3,
        });

      doc.restore();

      tipY += 125;
    });

    // Footer
    doc
      .fontSize(18)
      .fillColor("#10b981")
      .font("Helvetica-Bold")
      .text("Thank you for using FloraVision AI!", 50, 700, {
        width: 500,
        align: "center",
      });

    doc
      .fontSize(11)
      .fillColor("#6b7280")
      .font("Helvetica")
      .text(
        "For more plant care tips and analysis, visit www.FloraVision-ai.com",
        50,
        730,
        {
          width: 500,
          align: "center",
        }
      );

    // Final decorative elements
    drawDecorativeShape(doc, 100, 750, 40, "#10b981", 0.15);
    drawDecorativeShape(doc, 495, 750, 35, "#34d399", 0.12);

    // Page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(9)
        .fillColor("#9ca3af")
        .text(`Page ${i + 1} of ${pages.count}`, 0, 780, { align: "center" });
    }

    doc.end();

    // Wait for PDF to finish
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Download and clean up
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Error downloading the PDF report" });
      }
      fsPromises.unlink(filePath).catch(() => {});
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the PDF report" });
  }
});

// start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:3000`);
});
