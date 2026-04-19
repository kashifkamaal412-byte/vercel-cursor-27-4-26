import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, BadgeCheck, Coins, Sparkles, AlertCircle, CreditCard, Smartphone, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Gift, freeGifts, premiumGifts, coinPackages } from "@/data/giftData";

export type { Gift } from "@/data/giftData";

type TabType = "free" | "premium" | "deposit";
type PaymentMethod = "easypaisa" | "jazzcash" | "debit" | "visa" | "mastercard" | "debitcard";

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString();
};

// Gift card component for realistic image rendering
const GiftCard = ({
  gift,
  selected,
  onClick,
  isPremiumCard,
}: {
  gift: Gift;
  selected: boolean;
  onClick: () => void;
  isPremiumCard?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.93 }}
    whileHover={{ scale: 1.03 }}
    onClick={onClick}
    className="rounded-xl overflow-hidden transition-all relative"
    style={{
      background: selected
        ? "linear-gradient(135deg, hsl(40 60% 18%) 0%, hsl(35 50% 12%) 100%)"
        : "hsl(30 15% 10%)",
      border: selected
        ? "2px solid hsl(40 80% 50%)"
        : "1px solid hsl(40 50% 25% / 0.4)",
      boxShadow: selected
        ? "0 0 18px hsl(40 80% 50% / 0.35), inset 0 0 20px hsl(40 80% 50% / 0.1)"
        : "0 2px 6px hsl(0 0% 0% / 0.4)",
    }}
  >
    {/* VIP badge for expensive premium gifts */}
    {isPremiumCard && gift.value >= 35000 && (
      <span
        className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10"
        style={{
          background: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(35 85% 45%) 100%)",
          color: "hsl(30 20% 8%)",
        }}
      >
        VIP
      </span>
    )}

    {/* Image */}
    <div className={`w-full ${isPremiumCard ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden`}>
      {gift.imageUrl ? (
        <img
          src={gift.imageUrl}
          alt={gift.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className={isPremiumCard ? "text-5xl" : "text-4xl"}>{gift.emoji}</span>
        </div>
      )}
    </div>

    {/* Info */}
    <div className="px-2 py-1.5">
      <p
        className={`truncate font-medium ${isPremiumCard ? 'text-xs' : 'text-[10px]'}`}
        style={{ color: "hsl(40 50% 80%)" }}
      >
        {gift.name}
      </p>
      {isPremiumCard ? (
        <div className="flex items-center gap-1 mt-0.5">
          <Coins className="w-3 h-3" style={{ color: "hsl(40 80% 55%)" }} />
          <span className="text-[11px] font-bold" style={{ color: "hsl(40 80% 55%)" }}>
            {formatNumber(gift.value)} <span className="text-[9px] font-normal" style={{ color: "hsl(40 40% 50%)" }}>coin</span>
          </span>
        </div>
      ) : (
        <span className="text-[10px] font-semibold" style={{ color: "hsl(40 80% 55%)" }}>Free</span>
      )}
    </div>
  </motion.button>
);

export const GiftSheet = ({
  open,
  onOpenChange,
  onSendGift,
  creatorName,
  creatorAvatar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendGift: (gift: Gift, quantity: number) => void;
  creatorName?: string;
  creatorAvatar?: string;
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("free");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [coins, setCoins] = useState(2250);
  const [showAd, setShowAd] = useState(false);
  const [insufficientModal, setInsufficientModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ pkg: typeof coinPackages[0]; method: PaymentMethod } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<typeof coinPackages[0] | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [customCoins, setCustomCoins] = useState("");

  const totalPrice = selectedGift ? selectedGift.value * quantity : 0;

  const showRewardAd = () => {
    setShowAd(false);
    if (selectedGift) {
      onSendGift(selectedGift, quantity);
      setSelectedGift(null);
      setQuantity(1);
      onOpenChange(false);
    }
  };

  const handlePayment = (method: PaymentMethod) => {
    if (!selectedPkg) return;
    setPaymentModal({ pkg: selectedPkg, method });
  };

  const confirmPayment = () => {
    if (!paymentModal) return;
    setCoins((prev) => prev + paymentModal.pkg.coins + paymentModal.pkg.bonus);
    setPaymentModal(null);
    setSelectedPkg(null);
    setMobileNumber("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handleSendGift = () => {
    if (!selectedGift) return;
    if (selectedGift.isPremium) {
      if (coins < totalPrice) {
        setInsufficientModal(true);
        return;
      }
      setCoins((prev) => prev - totalPrice);
    } else {
      setShowAd(true);
      return;
    }
    onSendGift(selectedGift, quantity);
    setSelectedGift(null);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-3xl p-0 overflow-hidden border-t-2"
        style={{
          background: "linear-gradient(180deg, hsl(30 20% 8%) 0%, hsl(25 30% 5%) 100%)",
          borderColor: "hsl(40 80% 40% / 0.4)",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border-2"
              style={{
                borderColor: "hsl(40 80% 50% / 0.6)",
                background: "linear-gradient(135deg, hsl(40 70% 30%) 0%, hsl(35 60% 20%) 100%)",
              }}
            >
              {creatorAvatar ? (
                <img src={creatorAvatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-lg">🎁</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm" style={{ color: "hsl(40 60% 85%)" }}>
                  {creatorName || "Creator"}
                </span>
                <BadgeCheck className="w-4 h-4" style={{ color: "hsl(40 80% 55%)" }} />
              </div>
              <span className="text-[11px]" style={{ color: "hsl(40 20% 50%)" }}>Gift Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setActiveTab("deposit")}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 shadow-lg"
              style={{
                background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 40%) 100%)",
                boxShadow: "0 0 15px hsl(40 80% 50% / 0.3)",
              }}
            >
              <Coins className="w-4 h-4" style={{ color: "hsl(30 20% 10%)" }} />
              <span className="font-bold text-sm" style={{ color: "hsl(30 20% 10%)" }}>{formatNumber(coins)}</span>
            </motion.button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "hsl(30 15% 15%)" }}
            >
              <X className="w-4 h-4" style={{ color: "hsl(40 20% 60%)" }} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-4 py-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(30 15% 12%)" }}>
            {(["free", "premium", "deposit"] as const).map((tab) => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedGift(null);
                  setSelectedPkg(null);
                }}
                className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all"
                style={
                  activeTab === tab
                    ? {
                        background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 40%) 100%)",
                        color: "hsl(30 20% 8%)",
                        boxShadow: "0 0 12px hsl(40 80% 50% / 0.3)",
                      }
                    : { color: "hsl(40 20% 50%)" }
                }
              >
                {tab === "free" ? "Free" : tab === "premium" ? "Premium" : "Deposit"}
              </motion.button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-200px)]">
          {/* ─── FREE GIFTS TAB ─── */}
          {activeTab === "free" && (
            <div className="px-4 pb-32">
              <div className="flex items-center gap-2 mb-3">
                <h3
                  className="text-lg font-bold tracking-wide"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 80% 60%) 0%, hsl(35 90% 45%) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  FREE GIFTS
                </h3>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(40 80% 50% / 0.15)", color: "hsl(40 70% 60%)" }}
                >
                  Watch Ad to Unlock
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {freeGifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    selected={selectedGift?.id === gift.id}
                    onClick={() => setSelectedGift(gift)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── PREMIUM GIFTS TAB ─── */}
          {activeTab === "premium" && (
            <div className="px-4 pb-32">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: "hsl(40 80% 55%)" }} />
                <h3
                  className="text-lg font-bold tracking-wide"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 80% 60%) 0%, hsl(35 90% 45%) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  LUXURY COLLECTION
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {premiumGifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    selected={selectedGift?.id === gift.id}
                    onClick={() => setSelectedGift(gift)}
                    isPremiumCard
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── DEPOSIT COINS TAB ─── */}
          {activeTab === "deposit" && (
            <div className="px-4 pb-32">
              {/* Coins header */}
              <div
                className="rounded-xl p-3 mb-4 flex items-center justify-between"
                style={{ background: "hsl(30 15% 12%)", border: "1px solid hsl(40 50% 25% / 0.3)" }}
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5" style={{ color: "hsl(40 80% 55%)" }} />
                  <span className="font-semibold" style={{ color: "hsl(40 50% 80%)" }}>Coins</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{
                    border: "1px solid hsl(40 50% 25% / 0.5)",
                    color: "hsl(40 80% 55%)",
                    background: "hsl(40 80% 50% / 0.1)",
                  }}
                >
                  🎁 Invite +500
                </motion.button>
              </div>

              {/* Coin packages grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {coinPackages.map((pkg, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setSelectedPkg(pkg)}
                    className="rounded-xl p-3 transition-all relative overflow-hidden"
                    style={{
                      background: selectedPkg === pkg
                        ? "linear-gradient(135deg, hsl(40 60% 18%) 0%, hsl(35 50% 12%) 100%)"
                        : "hsl(30 15% 12%)",
                      border: selectedPkg === pkg
                        ? "2px solid hsl(40 80% 50%)"
                        : "1px solid hsl(40 50% 25% / 0.3)",
                      boxShadow: selectedPkg === pkg ? "0 0 15px hsl(40 80% 50% / 0.2)" : "none",
                    }}
                  >
                    {pkg.label && (
                      <span
                        className="absolute top-1 right-1 text-[8px] font-bold px-1 py-0.5 rounded"
                        style={{
                          background: pkg.label === "Best Value"
                            ? "linear-gradient(135deg, hsl(120 60% 40%) 0%, hsl(150 50% 35%) 100%)"
                            : "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 40%) 100%)",
                          color: "hsl(0 0% 100%)",
                        }}
                      >
                        {pkg.label}
                      </span>
                    )}
                    <div className="text-lg font-bold" style={{ color: "hsl(40 80% 55%)" }}>
                      {formatNumber(pkg.coins)}
                    </div>
                    <div className="text-[10px]" style={{ color: "hsl(40 50% 75%)" }}>Coins</div>
                    {pkg.bonus > 0 && (
                      <div className="text-[9px] mt-0.5 font-medium" style={{ color: "hsl(120 60% 50%)" }}>
                        +{formatNumber(pkg.bonus)} BONUS
                      </div>
                    )}
                    <div className="text-xs mt-1 font-semibold" style={{ color: "hsl(40 30% 60%)" }}>
                      coin {pkg.price}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Custom coins */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold mb-2" style={{ color: "hsl(40 50% 80%)" }}>Custom Coins</h4>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "hsl(30 15% 12%)", border: "1px solid hsl(40 50% 25% / 0.3)" }}
                >
                  <Coins className="w-5 h-5" style={{ color: "hsl(40 80% 55%)" }} />
                  <input
                    type="number"
                    placeholder="000"
                    value={customCoins}
                    onChange={(e) => setCustomCoins(e.target.value)}
                    className="flex-1 bg-transparent text-lg font-bold outline-none"
                    style={{ color: "hsl(40 80% 55%)" }}
                  />
                  <span className="text-sm" style={{ color: "hsl(40 30% 60%)" }}>Coins</span>
                </div>
                {customCoins && (
                  <p className="text-xs mt-1" style={{ color: "hsl(40 30% 60%)" }}>
                    You will pay coin {Math.ceil(Number(customCoins) / 10)}
                  </p>
                )}
              </div>

              {/* Payment Methods with real brand colors */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: "hsl(40 50% 80%)" }}>Payment Methods:</h4>
                <div className="flex gap-2 flex-wrap">
                  {/* Easypaisa - Green brand */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04, boxShadow: "0 0 12px hsl(140 70% 40% / 0.3)" }}
                    onClick={() => handlePayment("easypaisa")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, hsl(145 75% 35%) 0%, hsl(150 65% 28%) 100%)",
                      border: "1px solid hsl(145 60% 45% / 0.5)",
                      color: "hsl(0 0% 100%)",
                    }}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "hsl(0 0% 100%)", color: "hsl(145 75% 35%)" }}>e</span>
                    Easypaisa
                  </motion.button>

                  {/* JazzCash - Red/Yellow brand */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04, boxShadow: "0 0 12px hsl(0 70% 45% / 0.3)" }}
                    onClick={() => handlePayment("jazzcash")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, hsl(0 75% 45%) 0%, hsl(15 80% 40%) 100%)",
                      border: "1px solid hsl(0 60% 55% / 0.5)",
                      color: "hsl(50 100% 60%)",
                    }}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "hsl(50 100% 55%)", color: "hsl(0 75% 40%)" }}>J</span>
                    JazzCash
                  </motion.button>

                  {/* Debit Card */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => handlePayment("debit")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: "hsl(30 15% 12%)",
                      border: "1px solid hsl(40 50% 25% / 0.4)",
                      color: "hsl(40 50% 80%)",
                    }}
                  >
                    <CreditCard className="w-4 h-4" style={{ color: "hsl(40 80% 55%)" }} />
                    Debit Card
                  </motion.button>
                </div>
              </div>

              <div className="mb-5">
                <h4 className="text-sm font-semibold mb-2" style={{ color: "hsl(40 50% 80%)" }}>Cards:</h4>
                <div className="flex gap-2 flex-wrap">
                  {/* VISA */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => handlePayment("visa")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, hsl(220 80% 35%) 0%, hsl(230 70% 25%) 100%)",
                      border: "1px solid hsl(220 60% 45% / 0.5)",
                      color: "hsl(0 0% 100%)",
                    }}
                  >
                    💳 VISA
                  </motion.button>

                  {/* Mastercard */}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => handlePayment("mastercard")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, hsl(25 85% 50%) 0%, hsl(35 80% 40%) 100%)",
                      border: "1px solid hsl(25 70% 50% / 0.5)",
                      color: "hsl(0 0% 100%)",
                    }}
                  >
                    🟠 Mastercard
                  </motion.button>
                </div>
              </div>

              {/* Deposit Now + Invite buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    if (selectedPkg) handlePayment("debit");
                  }}
                  disabled={!selectedPkg && !customCoins}
                  className="flex-1 py-3.5 rounded-xl text-lg font-bold transition-all disabled:opacity-40 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 35%) 100%)",
                    color: "hsl(30 20% 8%)",
                    boxShadow: "0 0 20px hsl(40 80% 50% / 0.3)",
                  }}
                >
                  {/* Shimmer animation */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.2) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="relative z-10">Deposit Now</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  className="px-4 py-3.5 rounded-xl font-medium flex items-center gap-1.5"
                  style={{
                    background: "hsl(30 15% 15%)",
                    border: "1px solid hsl(40 50% 25% / 0.3)",
                    color: "hsl(40 80% 55%)",
                  }}
                >
                  🎁 Invite
                </motion.button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Bottom send bar */}
        {activeTab !== "deposit" && (
          <div
            className="absolute bottom-0 left-0 right-0 p-4"
            style={{
              background: "linear-gradient(180deg, hsl(30 20% 8% / 0) 0%, hsl(25 30% 5%) 20%)",
              borderTop: "1px solid hsl(40 50% 25% / 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-full px-3 py-2"
                style={{ background: "hsl(30 15% 12%)", border: "1px solid hsl(40 50% 25% / 0.3)" }}
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(30 15% 18%)", color: "hsl(40 50% 75%)" }}
                >
                  <Minus className="w-3.5 h-3.5" />
                </motion.button>
                <span className="w-8 text-center font-bold" style={{ color: "hsl(40 50% 85%)" }}>{quantity}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(30 15% 18%)", color: "hsl(40 50% 75%)" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </motion.button>
              </div>
              <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                <Button
                  onClick={handleSendGift}
                  disabled={!selectedGift}
                  className="w-full h-12 text-base font-bold rounded-full transition-all border-0"
                  style={
                    selectedGift
                      ? {
                          background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 35%) 100%)",
                          color: "hsl(30 20% 8%)",
                          boxShadow: "0 0 20px hsl(40 80% 50% / 0.3)",
                        }
                      : { background: "hsl(30 15% 15%)", color: "hsl(40 20% 40%)" }
                  }
                >
                  <span className="flex items-center gap-2">
                    Send Gift
                    {selectedGift && totalPrice > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "hsl(30 20% 8% / 0.2)" }}>
                        {formatNumber(totalPrice)} coin
                      </span>
                    )}
                  </span>
                </Button>
              </motion.div>
            </div>
          </div>
        )}

        {/* ─── AD MODAL ─── */}
        <AnimatePresence>
          {showAd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: "hsl(0 0% 0% / 0.85)" }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="p-6 rounded-2xl text-center max-w-sm mx-4"
                style={{
                  background: "linear-gradient(135deg, hsl(30 15% 12%) 0%, hsl(25 12% 8%) 100%)",
                  border: "1px solid hsl(40 50% 25% / 0.4)",
                }}
              >
                {selectedGift?.imageUrl && (
                  <img src={selectedGift.imageUrl} alt="" className="w-20 h-20 rounded-xl mx-auto mb-3 object-cover" />
                )}
                <h3 className="font-bold text-lg" style={{ color: "hsl(40 50% 85%)" }}>Watch Ad to Unlock Gift</h3>
                <p className="text-sm mt-1" style={{ color: "hsl(40 20% 50%)" }}>
                  Watch a short video to send <strong style={{ color: "hsl(40 80% 55%)" }}>{selectedGift?.name}</strong> to {creatorName || "the creator"} for free!
                </p>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={showRewardAd}
                    className="mt-4 w-full font-bold rounded-xl h-11 border-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 35%) 100%)",
                      color: "hsl(30 20% 8%)",
                    }}
                  >
                    Watch Ad & Send
                  </Button>
                </motion.div>
                <button onClick={() => setShowAd(false)} className="mt-2 text-sm" style={{ color: "hsl(40 20% 50%)" }}>
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── INSUFFICIENT COINS MODAL ─── */}
        <AnimatePresence>
          {insufficientModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: "hsl(0 0% 0% / 0.85)" }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="p-6 rounded-2xl text-center max-w-sm mx-4"
                style={{
                  background: "linear-gradient(135deg, hsl(30 15% 12%) 0%, hsl(25 12% 8%) 100%)",
                  border: "1px solid hsl(40 50% 25% / 0.4)",
                }}
              >
                <AlertCircle className="mx-auto mb-3 w-14 h-14" style={{ color: "hsl(40 80% 55%)" }} />
                <h3 className="font-bold text-lg" style={{ color: "hsl(40 50% 85%)" }}>Insufficient Balance</h3>
                <p className="text-sm mt-1" style={{ color: "hsl(40 20% 50%)" }}>
                  Please Deposit Coins first to send this gift.
                </p>
                <p className="text-xs mt-2" style={{ color: "hsl(0 60% 55%)" }}>
                  Need: {formatNumber(totalPrice)} coin — You have: {formatNumber(coins)}
                </p>
                <div className="flex gap-3 mt-4">
                  <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                    <Button
                      onClick={() => { setInsufficientModal(false); setActiveTab("deposit"); }}
                      className="w-full font-bold rounded-xl h-11 border-0"
                      style={{
                        background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 35%) 100%)",
                        color: "hsl(30 20% 8%)",
                      }}
                    >
                      Deposit Coins
                    </Button>
                  </motion.div>
                  <button
                    onClick={() => setInsufficientModal(false)}
                    className="flex-1 py-2 rounded-xl font-medium"
                    style={{ background: "hsl(30 15% 18%)", color: "hsl(40 50% 75%)" }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PAYMENT MODAL ─── */}
        <AnimatePresence>
          {paymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: "hsl(0 0% 0% / 0.85)" }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="p-5 rounded-2xl max-w-sm mx-4 w-full"
                style={{
                  background: "linear-gradient(135deg, hsl(30 15% 12%) 0%, hsl(25 12% 8%) 100%)",
                  border: "1px solid hsl(40 50% 25% / 0.4)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setPaymentModal(null)}>
                    <ChevronLeft className="w-5 h-5" style={{ color: "hsl(40 50% 75%)" }} />
                  </button>
                  <h3 className="font-bold text-base" style={{ color: "hsl(40 50% 85%)" }}>
                    {paymentModal.method === "easypaisa" || paymentModal.method === "jazzcash"
                      ? `Pay via ${paymentModal.method === "easypaisa" ? "Easypaisa" : "JazzCash"}`
                      : "Card Payment"}
                  </h3>
                </div>

                <div
                  className="rounded-lg p-3 mb-4 text-center"
                  style={{ background: "hsl(40 80% 50% / 0.1)", border: "1px solid hsl(40 50% 25% / 0.3)" }}
                >
                  <span className="text-2xl font-bold" style={{ color: "hsl(40 80% 55%)" }}>
                    {formatNumber(paymentModal.pkg.coins + paymentModal.pkg.bonus)} Coins
                  </span>
                  <p className="text-sm mt-1" style={{ color: "hsl(40 30% 60%)" }}>
                    coin {paymentModal.pkg.price}
                  </p>
                </div>

                {/* Mobile Number Form (Easypaisa / JazzCash) */}
                {(paymentModal.method === "easypaisa" || paymentModal.method === "jazzcash") && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "hsl(40 30% 60%)" }}>
                        <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        placeholder="03XX-XXXXXXX"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{
                          background: "hsl(30 15% 15%)",
                          border: "1px solid hsl(40 50% 25% / 0.3)",
                          color: "hsl(40 50% 85%)",
                        }}
                      />
                    </div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={confirmPayment}
                        disabled={mobileNumber.length < 10}
                        className="w-full h-11 font-bold rounded-xl border-0 disabled:opacity-40"
                        style={{
                          background: paymentModal.method === "easypaisa"
                            ? "linear-gradient(135deg, hsl(145 75% 35%) 0%, hsl(150 65% 28%) 100%)"
                            : "linear-gradient(135deg, hsl(0 75% 45%) 0%, hsl(15 80% 40%) 100%)",
                          color: paymentModal.method === "easypaisa" ? "white" : "hsl(50 100% 60%)",
                        }}
                      >
                        Pay coin {paymentModal.pkg.price}
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* Card Form */}
                {paymentModal.method !== "easypaisa" && paymentModal.method !== "jazzcash" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "hsl(40 30% 60%)" }}>
                        <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={19}
                        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                        style={{
                          background: "hsl(30 15% 15%)",
                          border: "1px solid hsl(40 50% 25% / 0.3)",
                          color: "hsl(40 50% 85%)",
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium block mb-1" style={{ color: "hsl(40 30% 60%)" }}>Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength={5}
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                          style={{
                            background: "hsl(30 15% 15%)",
                            border: "1px solid hsl(40 50% 25% / 0.3)",
                            color: "hsl(40 50% 85%)",
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium block mb-1" style={{ color: "hsl(40 30% 60%)" }}>CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={4}
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                          style={{
                            background: "hsl(30 15% 15%)",
                            border: "1px solid hsl(40 50% 25% / 0.3)",
                            color: "hsl(40 50% 85%)",
                          }}
                        />
                      </div>
                    </div>
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={confirmPayment}
                        disabled={cardNumber.length < 16 || cardExpiry.length < 4 || cardCvv.length < 3}
                        className="w-full h-11 font-bold rounded-xl border-0 disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg, hsl(40 80% 50%) 0%, hsl(35 90% 35%) 100%)",
                          color: "hsl(30 20% 8%)",
                        }}
                      >
                        Pay coin {paymentModal.pkg.price}
                      </Button>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};
