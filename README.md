# ✨ InvoiceProAI

A professional, AI-powered invoice generator built with React, Firebase, and Gemini AI. Create, manage, and save professional invoices with ease.

## ✨ Features

- **🔐 Secure Authentication**: Login/Signup with Email or **Google Sign-In**.
- **🏢 Business Profiles**: Save your company details once and they'll auto-fill for every new invoice.
- **🤖 AI Cover Notes**: Generate professional, formal invoice summaries/cover notes using **Google Gemini AI**.
- **📊 Dynamic Invoicing**: 
  - Add/Remove line items with real-time calculations.
  - Custom Tax % and Currency support ($, €, Rs., etc.).
  - Automatic subtotal, tax, and grand total calculation.
- **📁 Invoice History**: Save your invoices to the cloud and access your history anytime.
- **📄 Print & PDF**: Professional print-ready layout for physical copies or PDF saving.
- **🎨 Modern UI**: Clean, responsive design built with **Tailwind CSS** and **shadcn/ui**.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion).
- **Backend**: Node.js, Express (API Proxy).
- **Database & Auth**: Firebase (Firestore & Authentication).
- **AI**: Google Gemini AI (via `@google/generative-ai`).
- **Icons**: Lucide React.

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ai-invoice-pro.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file and add your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Firebase Configuration**:
   Add your Firebase config to `src/firebase.ts` or `firebase-applet-config.json`.

5. **Run the app**:
   ```bash
   npm run dev
   ```

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by Anas Khan
