import PDFDocument from "pdfkit";

export function generateInvoicePDF(bill, profilePicBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 36 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftX = doc.page.margins.left;
      let y = 36;

      // ---------- Header ----------
      const logoSize = 84;

      if (bill.companyLogoBuffer) {
        try {
          doc.image(bill.companyLogoBuffer, leftX, y, { width: logoSize, height: logoSize });
        } catch (e) {}
      } else {
        doc.rect(leftX, y, logoSize, logoSize).stroke();
      }

      const rightBlockX = leftX + pageWidth - 300;
      doc.font("Helvetica").fontSize(9).fillColor("#000");

      doc.text("Address: Sample Fitness Center, Chennai", rightBlockX, y, { width: 300, align: "right" });
      doc.text("Phone: +91 90000 00000", rightBlockX, y + 12, { width: 300, align: "right" });
      doc.text("Website: https://www.samplefitness.com", rightBlockX, y + 24, { width: 300, align: "right" });
      doc.text("E-Mail: samplefitness@mail.com", rightBlockX, y + 36, { width: 300, align: "right" });

      y += Math.max(logoSize, 60) + 16;

      // ---------- Section Bar Style (Yellow) ----------
      const sectionBarHeight = 14;
      const yellow = "#f5c518";

      const drawSection = (title) => {
        doc.fillColor(yellow).rect(leftX, y, pageWidth, sectionBarHeight).fill();
        doc.fillColor("black").font("Helvetica-Bold").fontSize(10).text(` ${title}`, leftX + 6, y + 3);
        y += sectionBarHeight + 8;
        doc.fillColor("black");
      };

      // ---------- Client Detail ----------
      drawSection("Client Detail");

      const colGap = 12;
      const colWidth = (pageWidth - colGap) / 2;
      const leftColX = leftX;
      const rightColX = leftX + colWidth + colGap;

      const drawLabelValue = (label, value, xPos, yPos) => {
        doc.font("Helvetica").fontSize(9).fillColor("#333").text(label, xPos, yPos);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("black").text(value ?? "-", xPos, yPos + 11);
      };

      drawLabelValue("Member ID:", bill.memberId || "", leftColX, y);
      drawLabelValue("Billing date:", bill.joiningDate ? formatDate(bill.joiningDate) : "", rightColX, y);

      y += 34;

      drawLabelValue("Name:", bill.client || "", leftColX, y);
      drawLabelValue("Phone:", bill.contactNumber || "", rightColX, y);

      y += 36;

      // ---------- Description ----------
      drawSection("Description");

      drawLabelValue("Package name:", bill.package || "", leftColX, y);
      drawLabelValue("Start date:", bill.joiningDate ? formatDate(bill.joiningDate) : "", rightColX, y);
      y += 34;

      drawLabelValue("End date:", bill.endDate ? formatDate(bill.endDate) : "", leftColX, y);
      drawLabelValue("Billed by:", bill.billedBy || "Admin", rightColX, y);
      y += 36;

      // ---------- Billing Detail ----------
      drawSection("Billing Detail");

      const labelX = leftColX;
      const valueX = leftX + pageWidth - 140;
      const lineSpacing = 18;
      let ly = y;

      const priceNum = safeNum(bill.price);
      const adm = safeNum(bill.admissionCharges);
      const discountAmt = safeNum(bill.discountAmount);
      const taxAmt = safeNum(bill.tax);
      const paidAmt = safeNum(bill.amountPaid);
      const balance = safeNum(bill.balance);

      const formatR = (v) => `Rs. ${v.toFixed(2)}`;

      const billingRows = [
        ["Package fees:", formatR(priceNum)],
        ["Other Charges:", formatR(adm)],
        ["Discount:", formatR(discountAmt)],
        ["TAX :", formatR(taxAmt)],
        ["First amount paid : Via " + (bill.paymentMethodDetail || "Cash"), formatR(paidAmt)],
      ];

      doc.font("Helvetica").fontSize(10);
      billingRows.forEach(([lbl, val]) => {
        doc.text(lbl, labelX, ly);
        doc.text(val, valueX, ly, { width: 140, align: "right" });
        ly += lineSpacing;
      });

      y = ly + 6;

      // ---------- Pending Amount Bar (Dark Yellow) ----------
      const pendingBarY = y;
      const pendingBarHeight = 24;

      doc.fillColor("#d4a017") // dark yellow
        .rect(leftX, pendingBarY, pageWidth, pendingBarHeight)
        .fill();

      doc.fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Pending Amount:", leftX + 10, pendingBarY + 6);

      doc.text(`Rs. ${balance.toFixed(2)}`, leftX + pageWidth - 120, pendingBarY + 6, {
        width: 110,
        align: "right",
      });

      doc.fillColor("black");
      y = pendingBarY + pendingBarHeight + 20;

      // ---------- Terms ----------
      doc.font("Helvetica-Bold").fontSize(11).text("Terms & Condition", leftX, y);
      y += 16;

      const terms = [
        "1. Membership is personal, no adjustment of days, no refund.",
        "2. Absentee days cannot be claimed later.",
        "3. Member is responsible for their health.",
        "4. We are not liable for valuable items.",
        "5. Management may suspend membership anytime.",
      ];

      doc.font("Helvetica").fontSize(8).fillColor("red");
      let ty = y;
      terms.forEach((t) => {
        doc.text(t, leftX + 6, ty, { width: pageWidth - 40 });
        ty += 12;
      });

      y = ty + 18;

      doc.fillColor("black")
        .font("Helvetica")
        .fontSize(11)
        .text("To accept this invoice, sign here and return ____________________", leftX, y);

      y += 28;

      doc.font("Helvetica-Bold")
        .fontSize(11)
        .text("Thank you for your business and we look forward to coaching you.", {
          align: "center",
        });

      doc.font("Helvetica").fontSize(10).text("Sample Fitness Center", leftX, doc.page.height - 72, {
        width: pageWidth,
        align: "center",
      });

      if (profilePicBuffer) {
        try {
          doc.image(profilePicBuffer, leftX + pageWidth - 84, 110, { width: 64, height: 64 });
        } catch (e) {}
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd} ${monthName(d.getMonth())} ${yyyy}`;
}

function monthName(idx) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][idx] || "";
}

function safeNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
