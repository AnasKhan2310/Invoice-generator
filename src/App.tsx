import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Printer, Sparkles, Loader2, Save, History, FilePlus, Building, User, Info, Phone, Mail, MapPin, LogOut, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  id?: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  companyName: string;
  senderEmail: string;
  senderPhone: string;
  senderAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  notes: string;
  items: LineItem[];
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const [data, setData] = useState<InvoiceData>({
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    companyName: "",
    senderEmail: "",
    senderPhone: "",
    senderAddress: "",
    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "$",
    taxRate: 10,
    notes: "Thank you for your business. Please make payment within 7 days.",
    items: [
      { id: "1", description: "Service Description", quantity: 1, unitPrice: 0, total: 0 },
    ],
  });

  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<InvoiceData[]>([]);

  const [activeTab, setActiveTab] = useState<"info" | "business" | "client" | "items">("info");
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        // Load user profile if exists
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setData(prev => ({
            ...prev,
            companyName: userData.companyName || prev.companyName,
            senderEmail: userData.email || prev.senderEmail,
            senderPhone: userData.senderPhone || prev.senderPhone,
            senderAddress: userData.senderAddress || prev.senderAddress,
          }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);
    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email,
          username: username,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain") {
        setAuthError(`Domain not authorized: ${window.location.hostname}. Please add this exact domain to Firebase Console.`);
      } else {
        setAuthError(error.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          username: user.displayName || user.email?.split('@')[0] || "User",
          createdAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain") {
        setAuthError(`Domain not authorized: ${window.location.hostname}. Please add this exact domain to Firebase Console.`);
      } else {
        setAuthError(error.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveProfile = async () => {
    if (!user) return;
    setIsProfileSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        companyName: data.companyName,
        senderEmail: data.senderEmail,
        senderPhone: data.senderPhone,
        senderAddress: data.senderAddress,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert("Business profile saved successfully!");
    } catch (error: any) {
      console.error(error);
      alert("Error saving profile: " + error.message);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const subtotal = useMemo(() => {
    return data.items.reduce((acc, item) => acc + item.total, 0);
  }, [data.items]);

  const taxAmount = useMemo(() => {
    return (subtotal * data.taxRate) / 100;
  }, [subtotal, data.taxRate]);

  const total = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setData({ ...data, items: [...data.items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (data.items.length === 1) return;
    setData({ ...data, items: data.items.filter((item) => item.id !== id) });
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    const updatedItems = data.items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
        }
        return updatedItem;
      }
      return item;
    });
    setData({ ...data, items: updatedItems });
  };

  const saveInvoice = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "invoices"), {
        ...data,
        userId: user.uid,
        subtotal,
        taxAmount,
        total,
        createdAt: serverTimestamp(),
      });
      alert("Invoice saved successfully!");
    } catch (error: any) {
      console.error(error);
      alert("Error saving invoice: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    setShowHistory(true);
    try {
      const q = query(
        collection(db, "invoices"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceData));
      setHistory(docs);
    } catch (error: any) {
      console.error(error);
    }
  };

  const generateAiSummary = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceData: { ...data, subtotal, taxAmount, total } }),
      });
      const result = await response.json();
      if (result.summary) {
        setAiSummary(result.summary);
      } else {
        throw new Error(result.error || "Failed to generate summary");
      }
    } catch (error) {
      console.error(error);
      setAiSummary("Error generating summary. Please check your API key configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 flex items-center justify-center mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" className="w-12 h-12">
                <path d="M8 6C8 4.89543 8.89543 4 10 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V10C4 7.79086 5.79086 6 8 6Z" />
                <path d="M8 6C8 7.10457 7.10457 8 6 8C4.89543 8 4 7.10457 4 6C4 4.89543 4.89543 4 6 4C7.10457 4 8 4.89543 8 6Z" />
                <rect x="8" y="12" width="8" height="4" />
                <line x1="13" y1="12" x2="13" y2="16" />
                <line x1="14" y1="19" x2="16" y2="19" strokeLinecap="round" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <p className="text-slate-500 text-sm">
              {authMode === "login" ? "Login to manage your invoices" : "Sign up to start creating invoices"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "signup" && (
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    placeholder="johndoe" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              {authError && <p className="text-red-500 text-xs">{authError}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11">
                {authMode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                type="button" 
                className="w-full mt-4 h-11 gap-2" 
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </div>
            <div className="mt-6 text-center">
              <button 
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" className="w-7 h-7 sm:w-8 sm:h-8">
              <path d="M8 6C8 4.89543 8.89543 4 10 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V10C4 7.79086 5.79086 6 8 6Z" />
              <path d="M8 6C8 7.10457 7.10457 8 6 8C4.89543 8 4 7.10457 4 6C4 4.89543 4.89543 4 6 4C7.10457 4 8 4.89543 8 6Z" />
              <rect x="8" y="12" width="8" height="4" />
              <line x1="13" y1="12" x2="13" y2="16" />
              <line x1="14" y1="19" x2="16" y2="19" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-blue-700 hidden xs:block">InvoiceProAI</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="outline" size="sm" onClick={() => {
            if (confirm("Reset current invoice? Unsaved changes will be lost.")) {
              setData({
                ...data,
                id: undefined,
                invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
                items: [{ id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }]
              });
            }
          }} className="h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 border-slate-200">
            <Plus className="w-4 h-4" /> <span className="hidden lg:inline font-bold">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadHistory} className="h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 border-slate-200">
            <History className="w-4 h-4" /> <span className="hidden lg:inline font-bold">History</span>
          </Button>
          <Button variant="outline" size="sm" onClick={saveInvoice} disabled={isSaving} className="h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 border-slate-200">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline font-bold">Save</span>
          </Button>
          <Button onClick={handlePrint} size="sm" className="h-8 sm:h-9 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 gap-1 sm:gap-2 text-white shadow-sm font-bold">
            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Download / PDF</span>
          </Button>
          <Separator orientation="vertical" className="h-5 sm:h-6 mx-0.5 sm:mx-1 bg-slate-200" />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 sm:h-9 sm:w-9 text-slate-400 hover:text-red-500 hover:bg-red-50">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative">
        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 overflow-y-auto"
              onClick={() => setShowHistory(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-slate-50">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Invoice History
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>Close</Button>
                </div>
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No saved invoices found.</div>
                  ) : (
                    history.map(inv => (
                      <div 
                        key={inv.id} 
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setData(inv);
                          setShowHistory(false);
                        }}
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="font-bold text-slate-900 truncate">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-500 truncate">{inv.clientName} • {inv.invoiceDate}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-blue-600">{inv.currency}{inv.total?.toLocaleString()}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-400">View</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Side: Form Area */}
        <div className={`flex-none lg:flex-1 lg:overflow-y-auto p-4 sm:p-6 space-y-6 no-print bg-slate-50 lg:max-w-xl border-r ${showPreviewMobile ? 'hidden' : 'block'}`}>
          {/* Form Navigation Tabs */}
          <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1 mb-6 relative">
            {(["info", "business", "client", "items"] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors relative z-10 ${activeTab === tab ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white shadow-sm rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {/* Invoice Info */}
                <Card className="shadow-sm border-none bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">General Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Invoice Number</Label>
                      <Input 
                        value={data.invoiceNumber} 
                        onChange={(e) => setData({...data, invoiceNumber: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Date</Label>
                      <Input 
                        type="date"
                        value={data.invoiceDate} 
                        onChange={(e) => setData({...data, invoiceDate: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Due Date</Label>
                      <Input 
                        type="date"
                        value={data.dueDate} 
                        onChange={(e) => setData({...data, dueDate: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Currency</Label>
                      <Input 
                        value={data.currency} 
                        onChange={(e) => setData({...data, currency: e.target.value})}
                        placeholder="$"
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-none bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FilePlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Financials & Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Tax Rate (%)</Label>
                      <Input 
                        type="number"
                        value={data.taxRate} 
                        onChange={(e) => setData({...data, taxRate: Number(e.target.value)})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all w-32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Additional Notes</Label>
                      <Textarea 
                        value={data.notes} 
                        onChange={(e) => setData({...data, notes: e.target.value})}
                        placeholder="Additional notes or payment terms..."
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all min-h-[120px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "business" && (
              <motion.div
                key="business"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <Card className="shadow-sm border-none bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building className="w-4 h-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Your Business Profile</CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={saveProfile} 
                      disabled={isProfileSaving}
                      className="text-blue-600 bg-blue-50/50 border-blue-100 hover:bg-blue-100 h-8 text-xs font-bold"
                    >
                      {isProfileSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Update Profile
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Business Name</Label>
                      <Input 
                        value={data.companyName} 
                        onChange={(e) => setData({...data, companyName: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                        placeholder="Legal Entity Name"
                      />
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600 px-1">Support Email</Label>
                        <Input 
                          value={data.senderEmail} 
                          onChange={(e) => setData({...data, senderEmail: e.target.value})}
                          className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                          placeholder="billing@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600 px-1">Phone Number</Label>
                        <Input 
                          value={data.senderPhone} 
                          onChange={(e) => setData({...data, senderPhone: e.target.value})}
                          className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Business Address</Label>
                      <Textarea 
                        value={data.senderAddress} 
                        onChange={(e) => setData({...data, senderAddress: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all min-h-[100px]"
                        placeholder="Street Address, City, State, ZIP"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "client" && (
              <motion.div
                key="client"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <Card className="shadow-sm border-none bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Client Name / Company</Label>
                      <Input 
                        value={data.clientName} 
                        onChange={(e) => setData({...data, clientName: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                        placeholder="Full name or company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Contact Email</Label>
                      <Input 
                        value={data.clientEmail} 
                        onChange={(e) => setData({...data, clientEmail: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all"
                        placeholder="client@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 px-1">Billing Address</Label>
                      <Textarea 
                        value={data.clientAddress} 
                        onChange={(e) => setData({...data, clientAddress: e.target.value})}
                        className="bg-slate-50/50 border-slate-200 focus:border-blue-500 transition-all min-h-[100px]"
                        placeholder="Street Address, City, State, ZIP"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "items" && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <Card className="shadow-sm border-none bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Plus className="w-4 h-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Invoice Line Items</CardTitle>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddItem} 
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 font-bold"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Line
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.items.map((item) => (
                      <div key={item.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3 relative group transition-all hover:bg-white hover:shadow-md hover:border-slate-200">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Description</Label>
                          <Input 
                            value={item.description} 
                            onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                            className="bg-white border-slate-200 focus:border-blue-500 h-10 text-sm"
                            placeholder="Identify service or product"
                          />
                        </div>
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Qty</Label>
                            <Input 
                              type="number"
                              value={item.quantity} 
                              onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                              className="bg-white border-slate-200 h-10 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Rate</Label>
                            <Input 
                              type="number"
                              value={item.unitPrice} 
                              onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                              className="bg-white border-slate-200 h-10 text-sm"
                            />
                          </div>
                          <div className="space-y-1 col-span-2 xs:col-span-1">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Amount</Label>
                            <div className="h-10 flex items-center px-4 bg-slate-100/80 rounded-lg text-sm font-bold text-slate-700">
                              {data.currency}{item.total.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI Summary Button */}
                <div className="pt-2 space-y-3">
                  <Button 
                    onClick={generateAiSummary} 
                    disabled={isGenerating} 
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-12 text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all hover:scale-[1.01] active:scale-95"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Generate AI Cover Note
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3 lg:hidden">
                    <Button 
                      variant="outline"
                      onClick={saveInvoice} 
                      disabled={isSaving}
                      className="gap-2 h-11 border-slate-200 font-bold"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </Button>
                    <Button 
                      onClick={handlePrint} 
                      className="bg-slate-900 hover:bg-slate-800 gap-2 h-11 font-bold text-white shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Preview Area */}
        <div className={`flex-none lg:flex-1 bg-slate-200/50 p-4 sm:p-8 lg:overflow-y-auto flex justify-center ${showPreviewMobile ? 'block' : 'hidden lg:flex'}`}>
          <div className="invoice-preview w-full max-w-[800px] min-h-[600px] sm:min-h-[1000px] p-6 sm:p-12 flex flex-col bg-white shadow-2xl rounded-none sm:rounded-sm">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-0 mb-8 sm:mb-12">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black text-blue-600 tracking-tighter mb-2">INVOICE</h2>
                <p className="text-slate-900 font-bold text-lg sm:text-xl">{data.companyName || "Your Company"}</p>
              </div>
              <div className="text-left sm:text-right space-y-1">
                <p className="text-xs sm:text-sm"><span className="font-bold">Invoice #:</span> {data.invoiceNumber}</p>
                <p className="text-xs sm:text-sm"><span className="font-bold">Date:</span> {data.invoiceDate}</p>
                <p className="text-xs sm:text-sm"><span className="font-bold">Due Date:</span> {data.dueDate}</p>
              </div>
            </div>

            {/* From / Bill To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 mb-8 sm:mb-12">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b pb-1">From</h3>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{data.companyName || "Your Company"}</p>
                  <p className="text-xs sm:text-sm text-slate-600">{data.senderAddress || "Address"}</p>
                  <p className="text-xs sm:text-sm text-slate-600">{data.senderEmail || "Email"}</p>
                  <p className="text-xs sm:text-sm text-slate-600">{data.senderPhone || "Phone"}</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b pb-1">Bill To</h3>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{data.clientName || "Client Name"}</p>
                  <p className="text-xs sm:text-sm text-slate-600">{data.clientAddress || "Address"}</p>
                  <p className="text-xs sm:text-sm text-slate-600">{data.clientEmail || "Email"}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[500px] px-2 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-slate-900 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase font-black text-slate-900 px-0">Description</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-slate-900 text-center">Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-slate-900 text-right">Rate</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-slate-900 text-right pr-0">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id} className="border-b border-slate-100 hover:bg-transparent">
                        <TableCell className="py-3 sm:py-4 px-0 font-medium text-slate-700">{item.description || "—"}</TableCell>
                        <TableCell className="py-3 sm:py-4 text-center text-slate-700">{item.quantity}</TableCell>
                        <TableCell className="py-3 sm:py-4 text-right text-slate-700">{data.currency}{item.unitPrice.toLocaleString()}</TableCell>
                        <TableCell className="py-3 sm:py-4 text-right font-bold text-slate-900 pr-0">{data.currency}{item.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="mt-8 sm:mt-12 space-y-4">
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Subtotal</span>
                    <span className="font-bold text-slate-900">{data.currency}{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-bold">Tax ({data.taxRate}%)</span>
                    <span className="font-bold text-slate-900">{data.currency}{taxAmount.toLocaleString()}</span>
                  </div>
                  <Separator className="bg-slate-900 h-0.5" />
                  <div className="flex justify-between items-end">
                    <span className="text-xl sm:text-2xl font-black text-blue-600 tracking-tighter">Total</span>
                    <span className="text-2xl sm:text-3xl font-black text-blue-600">{data.currency}{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {aiSummary && (
              <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2 text-blue-700">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-black tracking-widest">AI Cover Note</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            )}

            {/* Notes Section in Preview */}
            {data.notes && (
              <div className="mt-8">
                <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b pb-1 mb-2">Notes & Terms</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-12 text-center">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-300">Thank you for your business</p>
            </div>
          </div>
        </div>
      </main>
      {/* Floating Mobile Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[40] flex flex-col gap-3 no-print">
        <Button 
          onClick={() => setShowPreviewMobile(!showPreviewMobile)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl flex items-center justify-center p-0"
        >
          {showPreviewMobile ? (
            <div className="flex flex-col items-center">
              <FilePlus className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1">Form</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Printer className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1">View</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
