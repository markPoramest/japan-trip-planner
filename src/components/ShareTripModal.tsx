"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { toBlob, toPng } from "html-to-image";
import { updateTripVisibility } from "@/lib/actions";
import {
  X,
  Share2,
  Globe,
  Lock,
  Copy,
  Check,
  Download,
  Instagram,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  Loader2,
  Coins,
  Sun,
  Moon,
  Camera,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatJPY, formatTHB } from "@/lib/utils";

interface TripShareData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  exchangeRate?: number;
  totalActivitiesCostJpy?: number;
  totalHotelThb?: number;
  totalHotelJpy?: number;
  totalPassJpy?: number;
  totalFlightThb?: number;
  isPublic: boolean;
  days: {
    id: string;
    dayNumber: number;
    title: string;
    dayCostJpy?: number;
    activities?: { id: string; location?: string; activity?: string; cost?: number }[];
  }[];
  hotels?: { id: string; name: string }[];
  passes?: { id: string; name: string }[];
  flights?: { id: string; flightNo: string; route?: string | null }[];
}

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripShareData;
  isOwner?: boolean;
}

interface StoryPhoto {
  url: string | null;
  caption: string;
}

// Artistic Default Japanese Scenery SVG 1 (Hirosaki Castle with Autumn Maple Foliage)
function CastleSceneSvg() {
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full object-cover">
      <defs>
        <linearGradient id="skyGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87CEEB" />
          <stop offset="40%" stopColor="#B0E0E6" />
          <stop offset="100%" stopColor="#FFF8DC" />
        </linearGradient>
        <linearGradient id="castleWall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="stoneBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#718096" />
          <stop offset="100%" stopColor="#4A5568" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="320" height="240" fill="url(#skyGrad1)" />
      {/* Sun glow */}
      <circle cx="250" cy="50" r="28" fill="#FFF9E6" opacity="0.8" />
      {/* Distant mountain silhouette */}
      <polygon points="20,150 90,80 160,150" fill="#CBD5E0" opacity="0.6" />
      <polygon points="120,150 190,95 260,150" fill="#A0AEC0" opacity="0.5" />
      {/* Stone Castle Foundation */}
      <polygon points="70,220 250,220 230,160 90,160" fill="url(#stoneBase)" />
      {/* Castle Base Tier */}
      <rect x="110" y="135" width="100" height="25" fill="url(#castleWall)" />
      <polygon points="100,135 220,135 205,120 115,120" fill="#2D3748" />
      {/* Castle Mid Tier */}
      <rect x="125" y="105" width="70" height="15" fill="url(#castleWall)" />
      <polygon points="115,105 205,105 195,92 125,92" fill="#2D3748" />
      {/* Castle Top Tier & Gable */}
      <rect x="135" y="80" width="50" height="12" fill="url(#castleWall)" />
      <polygon points="130,80 190,80 160,62" fill="#2D3748" />
      {/* Golden Shachihoko finials */}
      <circle cx="132" cy="78" r="2.5" fill="#D69E2E" />
      <circle cx="188" cy="78" r="2.5" fill="#D69E2E" />
      {/* Moat / Water */}
      <rect x="0" y="215" width="320" height="25" fill="#2B6CB0" opacity="0.8" />
      {/* Autumn Maple Tree Foliage (Left) */}
      <circle cx="35" cy="110" r="30" fill="#E53E3E" opacity="0.9" />
      <circle cx="55" cy="130" r="25" fill="#DD6B20" opacity="0.95" />
      <circle cx="30" cy="150" r="28" fill="#C53030" opacity="0.9" />
      <circle cx="65" cy="95" r="22" fill="#ED8936" opacity="0.85" />
      {/* Autumn Maple Tree Foliage (Right) */}
      <circle cx="280" cy="120" r="28" fill="#C53030" opacity="0.9" />
      <circle cx="260" cy="140" r="24" fill="#E53E3E" opacity="0.95" />
      <circle cx="290" cy="160" r="25" fill="#DD6B20" opacity="0.9" />
    </svg>
  );
}

// Artistic Default Japanese Scenery SVG 2 (Aomori Bay Bridge & Coastal Sea)
function BridgeSceneSvg() {
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full object-cover">
      <defs>
        <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#63B3ED" />
          <stop offset="50%" stopColor="#EBF8FF" />
          <stop offset="100%" stopColor="#FEFCBF" />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3182CE" />
          <stop offset="100%" stopColor="#2B6CB0" />
        </linearGradient>
      </defs>
      {/* Sky */}
      <rect width="320" height="240" fill="url(#skyGrad2)" />
      {/* Distant Mt. Iwaki with snow peak */}
      <polygon points="120,130 190,65 260,130" fill="#4A5568" opacity="0.75" />
      <polygon points="170,84 190,65 210,84 190,88" fill="#FFFFFF" />
      {/* Distant coastline */}
      <polygon points="0,140 140,135 320,140 320,150 0,150" fill="#2D3748" opacity="0.8" />
      {/* Ocean */}
      <rect x="0" y="145" width="320" height="95" fill="url(#seaGrad)" />
      {/* Curved Cable-stayed Bridge spanning the bay */}
      <path
        d="M 10,240 C 60,190 120,165 320,155"
        stroke="#E2E8F0"
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 10,240 C 60,190 120,165 320,155"
        stroke="#CBD5E0"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 10,240 C 60,190 120,165 320,155"
        stroke="#4A5568"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
      />
      {/* Bridge Pylon Tower */}
      <polygon points="195,120 205,120 203,165 197,165" fill="#ED8936" />
      <line x1="200" y1="120" x2="160" y2="165" stroke="#E2E8F0" strokeWidth="1" opacity="0.7" />
      <line x1="200" y1="120" x2="240" y2="160" stroke="#E2E8F0" strokeWidth="1" opacity="0.7" />
      {/* Flying seagulls */}
      <path d="M 50,55 Q 55,50 60,55 Q 65,50 70,55" stroke="#4A5568" strokeWidth="1.5" fill="none" />
      <path d="M 80,45 Q 84,41 88,45 Q 92,41 96,45" stroke="#4A5568" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// Delicate Floating Autumn Leaves SVG Component
function AutumnMapleLeaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2L13.5 6.5L17.5 4.5L16.5 9L21 9.5L18 13L21.5 16.5L16.5 17L16 21.5L12.5 18L12 22L11.5 18L8 21.5L7.5 17L2.5 16.5L6 13L3 9.5L7.5 9L6.5 4.5L10.5 6.5L12 2Z" />
    </svg>
  );
}

export default function ShareTripModal({
  isOpen,
  onClose,
  trip,
  isOwner = true,
}: ShareTripModalProps) {
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isPublic, setIsPublic] = useState(trip.isPublic ?? true);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStory, setCopiedStory] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "link">("story");
  const [storyTheme, setStoryTheme] = useState<"dark" | "light">("light");

  // Story Custom Photos (Max 2)
  const [storyPhotos, setStoryPhotos] = useState<[StoryPhoto, StoryPhoto]>(() => [
    {
      url: null,
      caption: trip.days[0]?.title?.split(/ [&,/+]/)[0]?.trim() || "Hirosaki",
    },
    {
      url: null,
      caption:
        trip.days[1]?.title?.split(/ [&,/+]/)[0]?.trim() ||
        trip.days[trip.days.length - 1]?.title?.split(/ [&,/+]/)[0]?.trim() ||
        "Aomori",
    },
  ]);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      const isLight = document.documentElement.classList.contains("light");
      setStoryTheme(isLight ? "light" : "dark");
    }
  }, [isOpen]);

  useEffect(() => {
    setIsPublic(trip.isPublic ?? true);
  }, [trip.isPublic, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);


  if (!isOpen || !mounted) return null;

  const dateLocale = language === "th" ? "th-TH" : "en-GB";
  const startStr = new Date(trip.startDate).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const endStr = new Date(trip.endDate).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const durationDays =
    trip.days && trip.days.length > 0
      ? trip.days.length
      : Math.round(
          (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/trips/${trip.id}` : "";

  // Financial calculations
  const rate = trip.exchangeRate && trip.exchangeRate > 0 ? trip.exchangeRate : 0.24;
  const hotelThb = trip.totalHotelThb || 0;
  const hotelJpy = trip.totalHotelJpy || (hotelThb > 0 ? hotelThb / rate : 0);
  const passJpy = trip.totalPassJpy || 0;
  const flightThb = trip.totalFlightThb || 0;
  const activitiesJpy = trip.totalActivitiesCostJpy || 0;

  const totalTripEstimatedThb =
    hotelThb + flightThb + passJpy * rate + activitiesJpy * rate;
  const totalTripEstimatedJpy =
    activitiesJpy + hotelJpy + passJpy + (flightThb > 0 ? flightThb / rate : 0);

  // Photo handlers
  const handlePhotoSelect = (index: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setStoryPhotos((prev) => {
        const next: [StoryPhoto, StoryPhoto] = [{ ...prev[0] }, { ...prev[1] }];
        next[index].url = dataUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = (index: 0 | 1) => {
    setStoryPhotos((prev) => {
      const next: [StoryPhoto, StoryPhoto] = [{ ...prev[0] }, { ...prev[1] }];
      next[index].url = null;
      return next;
    });
  };

  const handleCaptionChange = (index: 0 | 1, caption: string) => {
    setStoryPhotos((prev) => {
      const next: [StoryPhoto, StoryPhoto] = [{ ...prev[0] }, { ...prev[1] }];
      next[index].caption = caption;
      return next;
    });
  };

  // Toggle Public / Private
  const handleToggleVisibility = async (newVal: boolean) => {
    if (!isOwner) return;
    setIsPublic(newVal);
    setUpdatingVisibility(true);
    try {
      await updateTripVisibility(trip.id, newVal);
    } catch (err) {
      console.error(err);
      setIsPublic(!newVal);
      alert("Failed to update trip privacy.");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  // Copy Public Link
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Native Web Share
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: `Explore my Japan travel itinerary: ${trip.title} (${durationDays} Days)`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Copy Formatted Text Summary
  const handleCopySummaryText = async () => {
    const textSummary = `🌸 ${trip.title.toUpperCase()} 🇯🇵
📅 ${startStr} – ${endStr} (${durationDays} ${durationDays === 1 ? t("dayUnit") : t("daysUnit")})

📍 ${t("dailyRouteTitle").toUpperCase()} (Day 1 - Day ${trip.days.length}):
${trip.days.map((d) => `• ${t("dayCountBadge", { count: d.dayNumber })}: ${d.title}`).join("\n")}

💰 ${t("estimatedCost").toUpperCase()}:
• ✈️ ${t("storyFlight")}: ${flightThb > 0 ? formatTHB(flightThb) : "—"}
• 🏨 ${t("storyHotel")}: ${hotelThb > 0 ? formatTHB(hotelThb) : hotelJpy > 0 ? formatJPY(hotelJpy) : "—"}
• 🎟️ ${t("storyPass")}: ${passJpy > 0 ? formatJPY(passJpy) : "—"}
• 🍜 ${t("storyEveryday")}: ${activitiesJpy > 0 ? formatJPY(activitiesJpy) : "—"}
• ✨ ${t("totalCost")}: ${formatTHB(totalTripEstimatedThb)} (≈ ${formatJPY(totalTripEstimatedJpy)})

🔗 Plan: ${shareUrl}`;

    try {
      await navigator.clipboard.writeText(textSummary);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate & Copy 9:16 Instagram Story Image directly to Clipboard
  const handleCopyStoryImage = async () => {
    if (!storyCardRef.current) return;
    setGenerating(true);
    try {
      const blob = await toBlob(storyCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      if (!blob) throw new Error("Could not generate image blob");

      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedStory(true);
        setTimeout(() => setCopiedStory(false), 3000);
      } else {
        handleDownloadStoryImage();
      }
    } catch (err) {
      console.error("Clipboard image copy failed, downloading instead:", err);
      handleDownloadStoryImage();
    } finally {
      setGenerating(false);
    }
  };

  // Download 9:16 Instagram Story PNG Image
  const handleDownloadStoryImage = async () => {
    if (!storyCardRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(storyCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const cleanTitle = trip.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      link.download = `${cleanTitle}-instagram-story.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to export Instagram Story image.");
    } finally {
      setGenerating(false);
    }
  };

  const isDark = storyTheme === "dark";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl my-auto animate-in zoom-in-95 duration-150 relative overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-surface/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t("shareModalTitle")}
              </h3>
              <p className="text-[11px] text-text-muted">
                {trip.title} ({durationDays} {durationDays === 1 ? t("dayUnit") : t("daysUnit")})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-border/60 bg-bg-base/40 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("story")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "story"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
              }`}
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>{t("instagramStoryTab")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "link"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t("shareLinkPrivacyTab")}</span>
            </button>
          </div>

          {/* Theme Switcher for Story Card */}
          {activeTab === "story" && (
            <button
              type="button"
              onClick={() => setStoryTheme(isDark ? "light" : "dark")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm"
              title={t("toggleStoryTheme")}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t("lightMode")}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("darkMode")}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === "story" && (
            <div className="space-y-4">
              {/* Toolbar & Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>{t("shareStoryTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {t("shareStoryDesc", { duration: durationDays })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={generating}
                    onClick={handleDownloadStoryImage}
                    className="p-2 rounded-xl bg-bg-surface hover:bg-bg-elevated border border-border text-text-muted hover:text-text-primary text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    title={t("downloadStory")}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={handleCopyStoryImage}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 ${
                      copiedStory
                        ? "bg-emerald-600 text-white"
                        : "bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:opacity-95 text-white active:scale-95"
                    }`}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t("generatingStory")}</span>
                      </>
                    ) : copiedStory ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t("storyCopied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t("copyStoryImage")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Photo Upload Controls Bar (Max 2 Photos for Left Side) */}
              <div className="bg-bg-surface/70 border border-border/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>{t("storyPhotosTitle")}</span>
                      </h5>
                      <p className="text-[10.5px] text-text-muted">
                        {t("storyPhotosDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {storyPhotos.filter((p) => p.url).length} / 2 {t("photosUnit")}
                  </span>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef1}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(0, e)}
                />
                <input
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(1, e)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Photo Slot 1 */}
                  <div className="p-2.5 rounded-xl bg-bg-card border border-border/70 flex items-center gap-3">
                    <div
                      onClick={() => fileInputRef1.current?.click()}
                      className="w-14 h-14 rounded-lg border border-border/80 overflow-hidden flex-shrink-0 bg-bg-surface flex items-center justify-center cursor-pointer relative group/preview hover:border-accent transition-colors"
                      title={t("uploadPhoto")}
                    >
                      {storyPhotos[0].url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={storyPhotos[0].url}
                          alt="Photo 1"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CastleSceneSvg />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase">
                          {t("photoSlot1")}
                        </span>
                        {storyPhotos[0].url && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(0)}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                            title={t("removePhoto")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={storyPhotos[0].caption}
                          onChange={(e) => handleCaptionChange(0, e.target.value)}
                          placeholder={t("photoCaptionPlaceholder")}
                          className="flex-1 px-2 py-1 bg-bg-base border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef1.current?.click()}
                          className="px-2 py-1 bg-bg-surface border border-border hover:border-accent rounded-lg text-[10px] font-bold text-text-secondary hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                        >
                          {storyPhotos[0].url ? t("changePhoto") : t("uploadPhoto")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photo Slot 2 */}
                  <div className="p-2.5 rounded-xl bg-bg-card border border-border/70 flex items-center gap-3">
                    <div
                      onClick={() => fileInputRef2.current?.click()}
                      className="w-14 h-14 rounded-lg border border-border/80 overflow-hidden flex-shrink-0 bg-bg-surface flex items-center justify-center cursor-pointer relative group/preview hover:border-accent transition-colors"
                      title={t("uploadPhoto")}
                    >
                      {storyPhotos[1].url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={storyPhotos[1].url}
                          alt="Photo 2"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BridgeSceneSvg />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase">
                          {t("photoSlot2")}
                        </span>
                        {storyPhotos[1].url && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(1)}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                            title={t("removePhoto")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={storyPhotos[1].caption}
                          onChange={(e) => handleCaptionChange(1, e.target.value)}
                          placeholder={t("photoCaptionPlaceholder")}
                          className="flex-1 px-2 py-1 bg-bg-base border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef2.current?.click()}
                          className="px-2 py-1 bg-bg-surface border border-border hover:border-accent rounded-lg text-[10px] font-bold text-text-secondary hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                        >
                          {storyPhotos[1].url ? t("changePhoto") : t("uploadPhoto")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instagram Story Card 9:16 Canvas with Two-Column Split Layout */}
              <div className="flex justify-center p-3 sm:p-5 bg-black/40 rounded-3xl border border-border/80 overflow-hidden">
                <div
                  ref={storyCardRef}
                  style={{ width: "360px", height: "640px" }}
                  className={`relative rounded-2xl overflow-hidden p-4 flex flex-col justify-between shadow-2xl border select-none flex-shrink-0 transition-colors duration-200 ${
                    isDark
                      ? "bg-gradient-to-b from-[#141312] via-[#1a1918] to-[#11100f] text-[#FFFCF2] border-white/10"
                      : "bg-[#FAF8F5] text-[#1E1D1B] border-black/10"
                  }`}
                >
                  {/* Decorative Background Accents */}
                  <div
                    className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                      isDark ? "bg-[#EB5E28]/20" : "bg-[#63B3ED]/25"
                    }`}
                  />
                  <div
                    className={`absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                      isDark ? "bg-rose-500/20" : "bg-[#ED8936]/15"
                    }`}
                  />

                  {/* Japanese Character Watermark in Background */}
                  <div className="absolute right-2 bottom-12 opacity-[0.035] pointer-events-none select-none text-[160px] font-serif leading-none font-bold">
                    旅
                  </div>

                  {/* 1. Header Bar: Branding with Official Logo & Duration Badge */}
                  <div className="relative z-10 flex-shrink-0 space-y-1.5 border-b border-black/[0.08] dark:border-white/10 pb-2">
                    {/* Top Row: App Brand & Subtitle (Left) + Days Duration & Autumn Maple Leaf (Right) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md overflow-hidden bg-[#EB5E28]/10 p-0.5 flex items-center justify-center flex-shrink-0 shadow-2xs border border-[#EB5E28]/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-[9.5px] font-black tracking-wider uppercase truncate ${
                              isDark ? "text-[#EB5E28]" : "text-[#1D3557]"
                            }`}
                          >
                            {t("japanTripPlanner")}
                          </div>
                          <div
                            className={`text-[7px] font-mono leading-none truncate ${
                              isDark ? "text-[#CCC5B9]" : "text-[#7A746B]"
                            }`}
                          >
                            {t("itineraryAndCostSummary")}
                          </div>
                        </div>
                      </div>

                      {/* Right: Days Pill + Autumn Maple Leaf */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div
                          className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black tracking-wider shadow-xs ${
                            isDark
                              ? "bg-[#EB5E28] text-white"
                              : "bg-[#1D3557] text-white"
                          }`}
                        >
                          {t("daysCountBadge", { count: durationDays })}
                        </div>
                        <div className="text-[#E53E3E] opacity-90 flex-shrink-0">
                          <AutumnMapleLeaf className="w-4 h-4 rotate-[18deg]" />
                        </div>
                      </div>
                    </div>

                    {/* Second Row: Trip Title & Date Range */}
                    <div className="pt-0.5 space-y-1">
                      <h2
                        className={`text-[18px] font-black tracking-tight leading-tight line-clamp-1 ${
                          isDark ? "text-[#FFFCF2]" : "text-[#1D3557]"
                        }`}
                        title={trip.title}
                      >
                        {trip.title}
                      </h2>

                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EB5E28]/15 text-[#EB5E28] text-[8px] font-extrabold uppercase tracking-wide">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>
                          {startStr} – {endStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Estimated Cost Section (4-Category Bar) */}
                  <div
                    className={`relative z-10 rounded-xl p-2 border my-1 flex-shrink-0 shadow-2xs ${
                      isDark
                        ? "bg-[#181716]/95 border-[#EB5E28]/35"
                        : "bg-white/95 border-[#E7DFD4]"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                      <span
                        className={`text-[8.5px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          isDark ? "text-[#EB5E28]" : "text-[#D44A15]"
                        }`}
                      >
                        <Coins className="w-2.5 h-2.5" />
                        <span>{t("estimatedCost")}</span>
                      </span>
                      <div className="text-right">
                        <span
                          className={`text-[11px] font-black font-mono ${
                            isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                          }`}
                        >
                          {totalTripEstimatedThb > 0
                            ? formatTHB(totalTripEstimatedThb)
                            : "—"}
                        </span>
                        {totalTripEstimatedJpy > 0 && (
                          <span
                            className={`text-[8px] font-mono ml-1 ${
                              isDark ? "text-[#CCC5B9]" : "text-[#7A746B]"
                            }`}
                          >
                            (≈ {formatJPY(totalTripEstimatedJpy)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4-Category Price Grid */}
                    <div className="grid grid-cols-4 gap-1 pt-1 text-[7.5px] font-mono">
                      <div
                        className={`px-1 py-0.5 rounded text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-[#F9F7F2] text-[#444]"
                        }`}
                      >
                        <div className="text-[7px] uppercase font-bold text-[#EB5E28] truncate">
                          ✈️ {t("storyFlight")}
                        </div>
                        <div className="font-extrabold text-[8px] mt-0.5 truncate">
                          {flightThb > 0 ? formatTHB(flightThb) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1 py-0.5 rounded text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-[#F9F7F2] text-[#444]"
                        }`}
                      >
                        <div className="text-[7px] uppercase font-bold text-[#EB5E28] truncate">
                          🏨 {t("storyHotel")}
                        </div>
                        <div className="font-extrabold text-[8px] mt-0.5 truncate">
                          {hotelThb > 0 ? formatTHB(hotelThb) : hotelJpy > 0 ? formatJPY(hotelJpy) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1 py-0.5 rounded text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-[#F9F7F2] text-[#444]"
                        }`}
                      >
                        <div className="text-[7px] uppercase font-bold text-[#EB5E28] truncate">
                          🎟️ {t("storyPass")}
                        </div>
                        <div className="font-extrabold text-[8px] mt-0.5 truncate">
                          {passJpy > 0 ? formatJPY(passJpy) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1 py-0.5 rounded text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-[#F9F7F2] text-[#444]"
                        }`}
                      >
                        <div className="text-[7px] uppercase font-bold text-[#EB5E28] truncate">
                          🍜 {t("storyEveryday")}
                        </div>
                        <div className="font-extrabold text-[8px] mt-0.5 truncate">
                          {activitiesJpy > 0 ? formatJPY(activitiesJpy) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. TWO-COLUMN MAIN BODY (Left: Max 2 Photos | Right: Daily Route Timeline) */}
                  <div className="relative z-10 flex-1 flex gap-2.5 min-h-0 my-1 overflow-hidden">
                    {/* LEFT COLUMN: Max 2 Photos & Japanese Scrapbook Aesthetic */}
                    <div className="w-[136px] flex flex-col justify-between flex-shrink-0 min-h-0 py-0.5">
                      {/* Photo 1 (Top Polaroid) */}
                      <div
                        onClick={() => fileInputRef1.current?.click()}
                        className="relative group cursor-pointer transition-transform hover:scale-[1.02]"
                        title={t("uploadPhoto")}
                      >
                        {/* Washi Tape */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-3 bg-white/75 dark:bg-white/30 backdrop-blur-xs border border-white/80 dark:border-white/40 shadow-2xs rotate-[-3deg] z-20 pointer-events-none rounded-2xs" />

                        {/* Polaroid Frame */}
                        <div
                          className={`p-1.5 pb-4 rounded-sm shadow-md border rotate-[-2deg] transition-all ${
                            isDark
                              ? "bg-[#201E1D] border-white/10"
                              : "bg-white border-black/[0.06]"
                          }`}
                        >
                          <div className="w-full aspect-[4/3] rounded-2xs overflow-hidden relative bg-slate-100 dark:bg-black/40">
                            {storyPhotos[0].url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={storyPhotos[0].url}
                                alt={storyPhotos[0].caption || "Photo 1"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CastleSceneSvg />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-bold gap-1">
                              <Camera className="w-3 h-3" />
                            </div>
                          </div>

                          <div
                            className={`text-center font-bold text-[8.5px] mt-1 tracking-wider truncate px-1 ${
                              isDark ? "text-amber-100" : "text-[#1D3557]"
                            }`}
                          >
                            ~ {storyPhotos[0].caption || "Hirosaki"} ~
                          </div>
                        </div>
                      </div>

                      {/* Photo 2 (Bottom Polaroid) */}
                      <div
                        onClick={() => fileInputRef2.current?.click()}
                        className="relative group cursor-pointer transition-transform hover:scale-[1.02]"
                        title={t("uploadPhoto")}
                      >
                        {/* Washi Tape */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-9 h-3 bg-white/75 dark:bg-white/30 backdrop-blur-xs border border-white/80 dark:border-white/40 shadow-2xs rotate-[4deg] z-20 pointer-events-none rounded-2xs" />

                        {/* Polaroid Frame */}
                        <div
                          className={`p-1.5 pb-4 rounded-sm shadow-md border rotate-[2deg] transition-all ${
                            isDark
                              ? "bg-[#201E1D] border-white/10"
                              : "bg-white border-black/[0.06]"
                          }`}
                        >
                          <div className="w-full aspect-[4/3] rounded-2xs overflow-hidden relative bg-slate-100 dark:bg-black/40">
                            {storyPhotos[1].url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={storyPhotos[1].url}
                                alt={storyPhotos[1].caption || "Photo 2"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BridgeSceneSvg />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-bold gap-1">
                              <Camera className="w-3 h-3" />
                            </div>
                          </div>

                          <div
                            className={`text-center font-bold text-[8.5px] mt-1 tracking-wider truncate px-1 ${
                              isDark ? "text-amber-100" : "text-[#1D3557]"
                            }`}
                          >
                            ~ {storyPhotos[1].caption || "Aomori"} ~
                          </div>
                        </div>
                      </div>

                      {/* Bottom Japanese Quote & Autumn Leaves Accent */}
                      <div className="pt-1 flex items-end justify-between flex-shrink-0">
                        <div>
                          <div
                            className={`font-serif font-black text-[9.5px] leading-tight tracking-widest ${
                              isDark ? "text-amber-100/90" : "text-[#1D3557]"
                            }`}
                          >
                            また、
                          </div>
                          <div
                            className={`font-serif font-black text-[9.5px] leading-tight tracking-widest pl-2 ${
                              isDark ? "text-amber-100/90" : "text-[#1D3557]"
                            }`}
                          >
                            日本の旅を。
                          </div>
                          <div
                            className={`text-[6.5px] font-mono tracking-tight mt-0.5 ${
                              isDark ? "text-[#CCC5B9]/70" : "text-[#7A746B]"
                            }`}
                          >
                            {t("memoriesOfJapan")}
                          </div>
                        </div>

                        {/* Autumn Leaves in corner */}
                        <div className="text-[#DD6B20] opacity-80 pb-0.5">
                          <AutumnMapleLeaf className="w-4 h-4 rotate-[-15deg]" />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Daily Route Vertical Timeline */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0 py-0.5">
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-[#1D3557] dark:text-[#EB5E28]">
                          <MapPin className="w-2.5 h-2.5 text-[#EB5E28]" />
                          <span>{t("dailyRouteCount", { count: trip.days.length })}</span>
                        </div>
                        <Sparkles className="w-2.5 h-2.5 text-[#EB5E28]" />
                      </div>

                      {/* Vertical Connected Timeline List */}
                      <div className="relative flex-1 flex flex-col justify-between min-h-0 py-0.5">
                        {/* Connected Timeline Line */}
                        <div className="absolute left-[6.5px] top-2 bottom-2 w-[1.5px] bg-[#EB5E28]/30 pointer-events-none" />

                        {trip.days.map((d) => {
                          const dayCost =
                            d.dayCostJpy ??
                            d.activities?.reduce((s, a) => s + (a.cost || 0), 0) ??
                            0;

                          return (
                            <div
                              key={d.id}
                              className="relative flex items-center gap-1.5 min-h-0 w-full group"
                            >
                              {/* Orange Node Dot on Timeline */}
                              <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1E1C1A] border-2 border-[#EB5E28] flex items-center justify-center flex-shrink-0 z-10 shadow-2xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#EB5E28]" />
                              </div>

                              {/* Day Card */}
                              <div
                                className={`flex-1 rounded-xl border flex flex-col justify-between min-w-0 transition-all ${
                                  trip.days.length <= 5
                                    ? "p-2"
                                    : trip.days.length <= 7
                                    ? "p-1.5"
                                    : "p-1"
                                } ${
                                  isDark
                                    ? "bg-white/[0.05] border-white/10 hover:bg-white/[0.08]"
                                    : "bg-white/95 border-black/[0.06] shadow-2xs hover:shadow-xs"
                                }`}
                              >
                                {/* Line 1: Day Badge + Cost */}
                                <div className="flex items-center justify-between gap-1 w-full flex-shrink-0">
                                  <span className="px-1.5 py-0.5 rounded-md bg-[#EB5E28]/15 text-[#EB5E28] font-black text-[7px] tracking-wide flex-shrink-0">
                                    {t("dayCountBadge", { count: d.dayNumber })}
                                  </span>
                                  <span
                                    className={`font-mono font-black text-[7.5px] tracking-tight flex-shrink-0 ${
                                      isDark ? "text-amber-200" : "text-[#D44A15]"
                                    }`}
                                  >
                                    {formatJPY(dayCost)}
                                  </span>
                                </div>

                                {/* Line 2: Destination Name / Title */}
                                <div
                                  className={`font-bold truncate mt-0.5 leading-tight ${
                                    trip.days.length <= 6
                                      ? "text-[8px]"
                                      : "text-[7.5px]"
                                  } ${
                                    isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                                  }`}
                                  title={d.title}
                                >
                                  {d.title}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Clean Footer Brand Stamp */}
                  <div
                    className={`relative z-10 pt-1.5 border-t flex items-center justify-between text-[7.5px] font-mono flex-shrink-0 ${
                      isDark
                        ? "border-white/10 text-[#A8A29E]"
                        : "border-black/10 text-[#7A746B]"
                    }`}
                  >
                    <span className="font-bold text-[#EB5E28]">🚄 日本旅行</span>
                    <div className="font-bold tracking-wider">
                      MARK NO NIHON TABI
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "link" && (
            <div className="space-y-6">
              {/* Trip Visibility Settings (Owner only) */}
              <div className="p-4 rounded-2xl bg-bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPublic ? (
                      <Globe className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs font-bold text-text-primary">
                      {t("tripVisibility")}
                    </span>
                  </div>

                  {isOwner && (
                    <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(true)}
                        disabled={updatingVisibility}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isPublic
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {t("publicTrip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(false)}
                        disabled={updatingVisibility}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          !isPublic
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {t("privateTrip")}
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-text-muted">
                  {isPublic ? t("publicDesc") : t("privateDesc")}
                </p>
              </div>

              {/* Shareable Link Box */}
              {isPublic ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-primary block">
                    {t("copyLink")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3.5 py-2.5 bg-bg-surface border border-border rounded-xl text-xs font-mono text-text-secondary select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        copiedLink
                          ? "bg-emerald-600 text-white"
                          : "bg-accent hover:bg-accent-hover text-white"
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t("linkCopied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{t("copyLink")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Native Device Share */}
                  {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                    <button
                      type="button"
                      onClick={handleWebShare}
                      className="w-full py-2.5 rounded-xl border border-border bg-bg-surface hover:bg-bg-elevated text-xs font-bold text-text-primary transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <Send className="w-3.5 h-3.5 text-accent" />
                      <span>{t("shareVia")}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-500 font-medium">
                  {t("privateDesc")}
                </div>
              )}

              {/* Copy Plain Text Summary */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className="w-full py-2.5 rounded-xl bg-bg-surface hover:bg-bg-elevated border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{t("summaryCopied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-accent" />
                      <span>{t("copySummaryText")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
