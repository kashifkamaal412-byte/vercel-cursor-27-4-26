import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Shield, FileText, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AboutSettingsProps {
  onBack: () => void;
}

const AboutSettings = ({ onBack }: AboutSettingsProps) => {
  const [activePage, setActivePage] = useState<string | null>(null);

  const items = [
    { icon: FileText, label: "Terms of Service", key: "terms" },
    { icon: Shield, label: "Privacy Policy", key: "privacy" },
    { icon: Globe, label: "Community Guidelines", key: "community" },
    { icon: Mail, label: "Contact Us", key: "contact" },
  ];

  const PageWrapper = ({ title, children }: any) => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon-sm" onClick={() => setActivePage(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <Separator className="mb-4" />
      <div className="space-y-4 text-sm leading-relaxed">{children}</div>
    </motion.div>
  );

  /* ================= PRIVACY POLICY ================= */

  if (activePage === "privacy") {
    return (
      <PageWrapper title="Privacy Policy">
        <p>
          This Privacy Policy describes how our application collects, uses, and protects user information. By using this
          application, you agree to the practices described below.
        </p>

        <h3 className="font-semibold">1. Application Overview</h3>
        <p>
          This app allows users to create accounts using email, upload short videos, interact with content, and send
          messages to other users.
        </p>

        <h3 className="font-semibold">2. Information We Collect</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Email address for registration and login</li>
          <li>Username and optional profile details</li>
          <li>User-uploaded videos and media content</li>
          <li>Messages sent between users</li>
          <li>Comments, likes, and engagement activity</li>
          <li>Device information (model, OS version, IP address)</li>
          <li>App usage data for performance improvement</li>
        </ul>

        <h3 className="font-semibold">3. Permissions Used</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Camera – to record video content</li>
          <li>Microphone – to capture audio in videos</li>
          <li>Storage – to upload media files</li>
          <li>Internet – to connect with our servers</li>
        </ul>

        <h3 className="font-semibold">4. How We Use Information</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>To create and manage user accounts</li>
          <li>To allow uploading and sharing of videos</li>
          <li>To enable messaging between users</li>
          <li>To improve app performance and user experience</li>
          <li>To maintain safety and prevent abuse</li>
          <li>To provide customer support</li>
        </ul>

        <h3 className="font-semibold">5. Data Sharing</h3>
        <p>
          We do not sell personal information. User data may be processed by trusted third-party service providers such
          as cloud hosting or analytics tools strictly for operating and improving the app.
        </p>

        <h3 className="font-semibold">6. Data Security</h3>
        <p>
          We apply reasonable technical and organizational safeguards to protect user data from unauthorized access,
          misuse, or loss.
        </p>

        <h3 className="font-semibold">7. User Rights</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Users may update their profile information</li>
          <li>Users may delete their account at any time</li>
          <li>Users may request data deletion by contacting support</li>
        </ul>

        <h3 className="font-semibold">8. Children’s Privacy</h3>
        <p>
          This application is not intended for children under the age of 13. We do not knowingly collect personal
          information from children.
        </p>

        <h3 className="font-semibold">9. Contact Information</h3>
        <p>
          For privacy-related questions or data deletion requests:
          <br />
          📧 support@yourapp.com
        </p>

        <p className="text-xs text-muted-foreground pt-4">Last Updated: January 2026</p>
      </PageWrapper>
    );
  }

  /* ================= OTHER BUTTONS ================= */

  if (activePage === "terms") {
    return (
      <PageWrapper title="Terms of Service">
        <p>By using this application, you agree to follow all platform rules and applicable laws.</p>
        <ul className="list-disc pl-6">
          <li>No illegal or harmful content</li>
          <li>No harassment or abusive behavior</li>
          <li>Users are responsible for their uploaded content</li>
          <li>Accounts violating rules may be suspended</li>
        </ul>
      </PageWrapper>
    );
  }

  if (activePage === "community") {
    return (
      <PageWrapper title="Community Guidelines">
        <ul className="list-disc pl-6">
          <li>Respect all users</li>
          <li>No hate speech</li>
          <li>No explicit or violent content</li>
          <li>No spam or fake engagement</li>
        </ul>
      </PageWrapper>
    );
  }

if (activePage === "contact") {
  return (
    <PageWrapper title="Contact Us">
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        {/* خوبصورت اینیمیٹڈ آئیکون */}
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Mail className="w-10 h-10 text-primary" />
          </motion.div>
        </div>

        <div className="text-center space-y-2 px-4">
          <h2 className="text-xl font-bold">ہم سے رابطہ کریں</h2>
          <p className="text-muted-foreground text-sm">
            آپ کا ہر پیغام ہمارے لیے اہم ہے۔ ہم آپ کی مدد کے لیے ہمیشہ تیار ہیں۔
          </p>
        </div>

        {/* ای میل بٹن جس پر کلک کرنے سے جی میل کھلے گا */}
        <a 
          href="mailto:kashifkamaal412@gmail.com" 
          className="w-full max-w-xs flex items-center justify-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
        >
          <Mail className="w-5 h-5" />
          ای میل کریں
        </a>

        {/* معلومات */}
        <div className="bg-muted/30 p-4 rounded-xl w-full max-w-xs border border-dashed border-muted-foreground/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>جواب کا وقت:</span>
            <span className="font-medium text-foreground">24 سے 48 گھنٹے</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground px-6 text-center italic">
          ہماری ٹیم جلد از جلد آپ سے رابطہ کرنے کی کوشش کرے گی۔ شکریہ!
        </p>
      </div>
    </PageWrapper>
  );
}

  /* ================= MAIN MENU ================= */

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">About</h1>
      </div>
      <Separator className="mb-4" />

      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Info className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-bold text-lg">Shortly</h2>
        <p className="text-xs text-muted-foreground">Version 1.0.0</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActivePage(item.key)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <item.icon className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default AboutSettings;