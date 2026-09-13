"use client";

import { useState, useRef, useEffect } from "react";
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
  Ticket,
  Hotel,
  Plane,
  Coins,
  Sun,
  Moon,
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
  const [storyTheme, setStoryTheme] = useState<"dark" | "light">("dark");

  const storyCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Detect active app theme (light or dark)
    if (typeof document !== "undefined") {
      const isLight = document.documentElement.classList.contains("light");
      setStoryTheme(isLight ? "light" : "dark");
    }
  }, [isOpen]);

  useEffect(() => {
    setIsPublic(trip.isPublic ?? true);
  }, [trip.isPublic, isOpen]);

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

  const allActivitiesCount = trip.days.reduce(
    (s, d) => s + (d.activities?.length || 0),
    0
  );

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
📅 ${startStr} – ${endStr} (${durationDays} ${language === "th" ? "วัน" : "Days"})

📍 ITINERARY (Day 1 - Day ${trip.days.length}):
${trip.days.map((d) => `• Day ${d.dayNumber}: ${d.title}`).join("\n")}

💰 ESTIMATED COST:
• ✈️ Flight: ${flightThb > 0 ? formatTHB(flightThb) : "—"}
• 🏨 Hotel: ${hotelThb > 0 ? formatTHB(hotelThb) : hotelJpy > 0 ? formatJPY(hotelJpy) : "—"}
• 🎟️ Pass/Rental: ${passJpy > 0 ? formatJPY(passJpy) : "—"}
• 🍜 Cost Everyday: ${activitiesJpy > 0 ? formatJPY(activitiesJpy) : "—"}
• ✨ Total Estimated: ${formatTHB(totalTripEstimatedThb)} (≈ ${formatJPY(totalTripEstimatedJpy)})

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
        pixelRatio: 2,
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
        pixelRatio: 2,
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
                {trip.title} ({durationDays} {language === "th" ? "วัน" : "Days"})
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
              <span>{language === "th" ? "สตอรี่ Instagram (9:16)" : "Instagram Story (9:16)"}</span>
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
              <span>{language === "th" ? "ลิงก์แชร์ & สิทธิ์" : "Share Link & Privacy"}</span>
            </button>
          </div>

          {/* Theme Switcher for Story Card */}
          {activeTab === "story" && (
            <button
              type="button"
              onClick={() => setStoryTheme(isDark ? "light" : "dark")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-sm"
              title="Toggle Light / Dark mode for Instagram Story"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "story" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>{t("shareStoryTitle")}</span>
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {language === "th"
                      ? "การ์ดสรุปทริปขนาด 9:16 พร้อมงบประมาณและตาราง Day 1 - Day " + durationDays
                      : "9:16 Story card with summary cost and Day 1 - Day " + durationDays + " schedule"}
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

              {/* Instagram Story Card 9:16 Canvas with Dynamic Theme & Full-Height Balance */}
              <div className="flex justify-center p-4 bg-black/40 rounded-3xl border border-border/80 overflow-hidden">
                <div
                  ref={storyCardRef}
                  style={{ width: "360px", height: "640px" }}
                  className={`relative rounded-2xl overflow-hidden p-5 flex flex-col justify-between shadow-2xl border select-none flex-shrink-0 transition-colors duration-200 ${
                    isDark
                      ? "bg-gradient-to-b from-[#141312] via-[#1c1a18] to-[#11100f] text-[#FFFCF2] border-white/10"
                      : "bg-gradient-to-b from-[#FAF9F5] via-[#FFFFFF] to-[#F0EDE6] text-[#1E1D1B] border-black/10"
                  }`}
                >
                  {/* Decorative Background Accents */}
                  <div
                    className={`absolute -top-12 -right-12 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
                      isDark ? "bg-[#EB5E28]/25" : "bg-[#EB5E28]/15"
                    }`}
                  />
                  <div
                    className={`absolute -bottom-12 -left-12 w-52 h-52 rounded-full blur-3xl pointer-events-none ${
                      isDark ? "bg-rose-500/20" : "bg-rose-500/10"
                    }`}
                  />

                  {/* Aesthetic Japanese Crest Watermark in Background */}
                  <div className="absolute right-3 bottom-14 opacity-[0.04] pointer-events-none select-none text-[180px] font-serif leading-none font-bold">
                    旅
                  </div>

                  {/* 1. Header Bar: Branding with Official Logo & Duration */}
                  <div
                    className={`relative z-10 flex items-center justify-between border-b pb-2.5 flex-shrink-0 ${
                      isDark ? "border-white/10" : "border-black/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#EB5E28]/10 p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm border border-[#EB5E28]/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/logo.png"
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-[10.5px] font-black tracking-wider uppercase text-[#EB5E28]">
                          Japan Trip Planner
                        </div>
                        <div
                          className={`text-[8px] font-mono ${
                            isDark ? "text-[#CCC5B9]" : "text-[#7A746B]"
                          }`}
                        >
                          Itinerary & Cost Summary
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wider ${
                        isDark
                          ? "bg-white/10 text-[#FFFCF2]"
                          : "bg-black/[0.06] text-[#1E1D1B]"
                      }`}
                    >
                      {durationDays} DAYS
                    </div>
                  </div>

                  {/* 2. Main Title & Date */}
                  <div className="relative z-10 my-2 space-y-1 flex-shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EB5E28]/15 text-[#EB5E28] text-[9px] font-extrabold uppercase tracking-wide">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>
                        {startStr} – {endStr}
                      </span>
                    </div>

                    <h2
                      className={`text-xl font-black tracking-tight leading-tight line-clamp-2 ${
                        isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                      }`}
                    >
                      {trip.title}
                    </h2>
                  </div>

                  {/* 3. Estimated Cost Section (Above Daily Route with Unified Color Theme) */}
                  <div
                    className={`relative z-10 rounded-2xl p-2.5 border my-1 flex-shrink-0 ${
                      isDark
                        ? "bg-[#181716]/90 border-[#EB5E28]/35"
                        : "bg-[#F4F1EA] border-[#EB5E28]/30 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          isDark ? "text-[#EB5E28]" : "text-[#D44A15]"
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        <span>Estimated Cost</span>
                      </span>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black font-mono ${
                            isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                          }`}
                        >
                          {totalTripEstimatedThb > 0
                            ? formatTHB(totalTripEstimatedThb)
                            : "—"}
                        </span>
                        {totalTripEstimatedJpy > 0 && (
                          <span
                            className={`text-[9px] font-mono ml-1 ${
                              isDark ? "text-[#CCC5B9]" : "text-[#7A746B]"
                            }`}
                          >
                            (≈ {formatJPY(totalTripEstimatedJpy)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4-Category Price Grid with Unified Accent Color */}
                    <div className="grid grid-cols-4 gap-1 pt-1.5 text-[8px] font-mono">
                      <div
                        className={`px-1.5 py-1 rounded-lg text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-white text-[#444] shadow-xs"
                        }`}
                      >
                        <div className="text-[7.5px] uppercase font-bold text-[#EB5E28] truncate">✈️ Flight</div>
                        <div className="font-extrabold text-[8.5px] mt-0.5 truncate">
                          {flightThb > 0 ? formatTHB(flightThb) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1.5 py-1 rounded-lg text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-white text-[#444] shadow-xs"
                        }`}
                      >
                        <div className="text-[7.5px] uppercase font-bold text-[#EB5E28] truncate">🏨 Hotel</div>
                        <div className="font-extrabold text-[8.5px] mt-0.5 truncate">
                          {hotelThb > 0 ? formatTHB(hotelThb) : hotelJpy > 0 ? formatJPY(hotelJpy) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1.5 py-1 rounded-lg text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-white text-[#444] shadow-xs"
                        }`}
                      >
                        <div className="text-[7.5px] uppercase font-bold text-[#EB5E28] truncate">🎟️ Pass</div>
                        <div className="font-extrabold text-[8.5px] mt-0.5 truncate">
                          {passJpy > 0 ? formatJPY(passJpy) : "—"}
                        </div>
                      </div>

                      <div
                        className={`px-1.5 py-1 rounded-lg text-center truncate ${
                          isDark ? "bg-white/[0.04] text-[#CCC5B9]" : "bg-white text-[#444] shadow-xs"
                        }`}
                      >
                        <div className="text-[7.5px] uppercase font-bold text-[#EB5E28] truncate">🍜 Everyday</div>
                        <div className="font-extrabold text-[8.5px] mt-0.5 truncate">
                          {activitiesJpy > 0 ? formatJPY(activitiesJpy) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Day 1 - Day X Where I Go Schedule (Extended Body) */}
                  <div className="relative z-10 flex-1 my-1.5 flex flex-col justify-between min-h-0">
                    <div
                      className={`text-[9.5px] font-extrabold uppercase tracking-wider mb-1 flex items-center justify-between flex-shrink-0 ${
                        isDark ? "text-[#CCC5B9]" : "text-[#7A746B]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#EB5E28]" />
                        <span>Daily Route (Day 1 - Day {trip.days.length})</span>
                      </span>
                      <span>{trip.days.length} Days</span>
                    </div>

                    {/* Extended Day Cards Container (Dynamic Grid filling 100% height) */}
                    <div
                      className="flex-1 grid grid-cols-2 gap-1.5 min-h-0 w-full overflow-hidden"
                      style={{
                        gridTemplateRows: `repeat(${Math.max(1, Math.ceil(trip.days.length / 2))}, minmax(0, 1fr))`,
                      }}
                    >
                      {trip.days.map((d, index) => {
                        const totalDays = trip.days.length;
                        const isLastOdd = totalDays % 2 === 1 && index === totalDays - 1;
                        const dayCost =
                          d.dayCostJpy ??
                          d.activities?.reduce((s, a) => s + (a.cost || 0), 0) ??
                          0;

                        // Prioritize multi-line wrapping when space exists, only reducing font size if height is actually constrained
                        const titleLen = (d.title || "").length;
                        let titleFontSize = "text-[9.5px]";
                        if (totalDays > 10) {
                          if (titleLen > 30) titleFontSize = "text-[6.5px]";
                          else if (titleLen > 18) titleFontSize = "text-[7px]";
                          else titleFontSize = "text-[7.5px]";
                        } else if (totalDays > 8) {
                          if (titleLen > 38) titleFontSize = "text-[7.5px]";
                          else if (titleLen > 24) titleFontSize = "text-[8px]";
                          else titleFontSize = "text-[8.5px]";
                        } else if (totalDays > 6) {
                          // 7-8 days: plenty of height for 2-3 lines
                          if (titleLen > 50) titleFontSize = "text-[8px]";
                          else titleFontSize = "text-[9px]";
                        } else {
                          // <= 6 days: lots of card space, wrap to new lines at full readable size
                          if (titleLen > 65) titleFontSize = "text-[8.5px]";
                          else titleFontSize = "text-[9.5px]";
                        }

                        return (
                          <div
                            key={d.id}
                            className={`h-full rounded-xl border flex flex-col justify-between text-left min-h-0 overflow-hidden transition-all ${
                              isLastOdd ? "col-span-2" : ""
                            } ${
                              totalDays <= 4
                                ? "p-2.5"
                                : totalDays <= 8
                                ? "p-2"
                                : "p-1.5"
                            } ${
                              isDark
                                ? "bg-white/[0.04] border-white/5 hover:bg-white/[0.07]"
                                : "bg-white border-black/[0.06] shadow-xs hover:shadow"
                            }`}
                          >
                            {/* Top Section: Day Badge & Full Title (Wraps naturally to new lines) */}
                            <div className="flex flex-col items-start gap-1 w-full min-h-0">
                              <span className="px-1.5 py-0.5 rounded-md bg-[#EB5E28]/15 text-[#EB5E28] font-black text-[9px] flex-shrink-0 tracking-wide">
                                Day {d.dayNumber}
                              </span>
                              <span
                                className={`font-bold break-words whitespace-normal w-full text-left leading-snug ${titleFontSize} ${
                                  isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                                }`}
                              >
                                {d.title}
                              </span>
                            </div>

                            {/* Bottom Section: Cost anchored at Bottom Right */}
                            <div className="w-full flex justify-end mt-auto pt-0.5 flex-shrink-0">
                              <span
                                className={`font-mono font-black tracking-tight leading-none ${
                                  isDark ? "text-[#FFFCF2]" : "text-[#1E1D1B]"
                                } ${
                                  totalDays <= 6
                                    ? "text-[10.5px]"
                                    : totalDays <= 10
                                    ? "text-[8.5px]"
                                    : "text-[7px]"
                                }`}
                              >
                                {formatJPY(dayCost)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Clean Footer Brand Stamp */}
                  <div
                    className={`relative z-10 pt-1.5 border-t flex items-center justify-between text-[8px] font-mono flex-shrink-0 ${
                      isDark
                        ? "border-white/10 text-[#A8A29E]"
                        : "border-black/10 text-[#7A746B]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#EB5E28]">🇯🇵 日本旅行</span>
                      <span>•</span>
                      <span>{durationDays} Days Itinerary</span>
                    </div>
                    <div className="font-semibold tracking-wider uppercase">
                      Mark no Nihon Tabi
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions & Quick Copy Summary Text */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    copiedText
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-bg-surface hover:bg-bg-elevated border border-border text-text-primary"
                  }`}
                >
                  {copiedText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{t("summaryCopied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-accent" />
                      <span>{t("copySummaryText")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "link" && (
            <div className="space-y-5">
              {/* Privacy & Visibility Toggle */}
              {isOwner && (
                <div className="p-4 rounded-2xl bg-bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <Globe className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-sand-subtle text-sand border border-sand-muted">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <span>{isPublic ? t("publicTrip") : t("privateTrip")}</span>
                          {updatingVisibility && (
                            <Loader2 className="w-3 h-3 animate-spin text-accent" />
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted">
                          {isPublic ? t("publicDesc") : t("privateDesc")}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      disabled={updatingVisibility}
                      onClick={() => handleToggleVisibility(!isPublic)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                        isPublic ? "bg-accent" : "bg-bg-base border border-border"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isPublic ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {!isPublic && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
                      ⚠️ {language === "th"
                        ? "ทริปนี้เป็นแบบส่วนตัว หากส่งลิงก์ให้ผู้อื่น พวกเขาจะไม่สามารถดูทริปได้จนกว่าคุณจะเปลี่ยนเป็นสาธารณะ"
                        : "This trip is private. Others opening the share link will not be able to view it until you switch visibility to Public."}
                    </div>
                  )}
                </div>
              )}

              {/* Share URL Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                  {language === "th" ? "ลิงก์สำหรับแชร์ให้เพื่อน" : "Public Share Link"}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2.5 bg-bg-base border border-border rounded-xl text-xs font-mono text-text-primary truncate select-all">
                    {shareUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                      copiedLink
                        ? "bg-emerald-600 text-white"
                        : "bg-accent hover:bg-accent-light text-white shadow-sm active:scale-95"
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
              </div>

              {/* Web Share API */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleWebShare}
                  className="w-full px-4 py-3 rounded-2xl bg-bg-surface hover:bg-bg-elevated border border-border text-xs font-bold text-text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-accent" />
                  <span>{t("shareVia")}</span>
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
