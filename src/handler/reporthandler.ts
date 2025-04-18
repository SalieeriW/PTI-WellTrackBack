import { Context } from "hono";
import { PDFDocument } from "pdf-lib";

export const get_report_handler = async (c: Context) => {
  // const { userId, Id } = c.req.query(); // Assuming you have a way to get userId and Id from the request
  try {
    // const result = await db`SELECT * FROM report WHERE user_id = ${userId} AND id = ${Id}`;
    // if (result.length === 0) {
    // return c.json({ message: "Report not found" }, 404);
    // }
    // const report = result[0];
    // Crate a PDF document
    const pdfDoc = await PDFDocument.create();
    // Add a page to the document
    // const page = pdfDoc.addPage([600, 400]);
    //page.drawText(report.content, { x: 50, y: 350 });
    const pdfBytes = await pdfDoc.save();
    return c.body(pdfBytes, 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=report_.pdf`,
    });
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred";
    return c.json({ message: errorMessage }, 500);
  }
};
