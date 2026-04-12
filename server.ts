import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API route
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { invoiceData } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are a professional business assistant. Based on the following invoice data, write a professional, formal, and concise cover note/summary for the client.
        The summary should be suitable for an email or a cover page.
        
        Invoice Data:
        Company: ${invoiceData.companyName}
        Client: ${invoiceData.clientName} (${invoiceData.clientEmail})
        Invoice #: ${invoiceData.invoiceNumber}
        Date: ${invoiceData.invoiceDate}
        Due Date: ${invoiceData.dueDate}
        Total Amount: ${invoiceData.currency}${invoiceData.total.toFixed(2)}
        
        Line Items:
        ${invoiceData.items.map((item: any) => `- ${item.description}: ${item.quantity} x ${invoiceData.currency}${item.unitPrice.toFixed(2)} = ${invoiceData.currency}${item.total.toFixed(2)}`).join("\n")}
        
        Please return ONLY the summary text in professional business language.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();
      res.json({ summary });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate summary" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
