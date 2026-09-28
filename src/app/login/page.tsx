"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass, ShieldCheck, MapPin, Calendar, CreditCard, Layers, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SettingsKebab from "@/components/SettingsKebab";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const [signingIn, setSigningIn] = useState(false);

  const authError = searchParams?.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/trips");
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    setSigningIn(true);
    signIn("google", { callbackUrl: "/trips" });
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-between text-text-primary">
      {/* Top bar */}
      <header className="border-b border-border bg-bg-surface/80 backdrop-blur-md relative z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Japan Trip Planner"
              className="w-10 h-10 object-contain drop-shadow-sm"
            />
            <div>
              <span className="text-base font-bold text-text-primary">{t("appTitle")}</span>
              <span className="ml-2 text-xs text-text-muted">{t("appSubtitle")}</span>
            </div>
          </div>
          <SettingsKebab />
        </div>
      </header>

      {/* Main hero login container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col lg:flex-row items-center gap-12 flex-1 justify-center">
        {/* Left column: Value Proposition & Privacy */}
        <div className="flex-1 space-y-6 text-center lg:text-left" data-aos="fade-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("privateTripWorkspace")}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
            {t("loginHeroTitle")}
          </h1>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-xl">
            {t("loginHeroDesc")}
          </p>

          {/* Privacy highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              {
                icon: ShieldCheck,
                title: t("privateAndSecureTitle"),
                desc: t("privateAndSecureDesc"),
              },
              {
                icon: CreditCard,
                title: t("dualCurrencyTitle"),
                desc: t("dualCurrencyDesc"),
              },
              {
                icon: Calendar,
                title: t("dailyTimelinesTitle"),
                desc: t("dailyTimelinesDesc"),
              },
              {
                icon: Layers,
                title: t("excelSummaryTitle"),
                desc: t("excelSummaryDesc"),
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-bg-card border border-border/80 text-left space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-text-primary">
                    <Icon className="w-4 h-4 text-accent" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Google Sign In Card */}
        <div className="w-full lg:w-[400px] flex-shrink-0" data-aos="fade-left">
          <div className="bg-bg-card border-2 border-accent/40 rounded-3xl p-8 shadow-earth space-y-6 relative overflow-hidden">
            <div className="text-center space-y-3">
              <img
                src="/logo.png"
                alt="Japan Trip Planner Logo"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto drop-shadow-md hover:scale-105 transition-transform"
              />
              <h2 className="text-2xl font-extrabold text-text-primary">
                {t("signIn")}
              </h2>
              <p className="text-xs text-text-muted">
                {t("loginCardDesc")}
              </p>
            </div>

            {/* Error banner if needed */}
            {authError && (
              <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs text-accent space-y-1">
                <p className="font-bold">
                  {t("authErrorTitle")}
                </p>
                <p className="text-[11px] text-text-muted">
                  {t("authErrorDesc")}
                </p>
              </div>
            )}

            {/* Google Sign in button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn || status === "loading"}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer disabled:opacity-75"
            >
              {signingIn || status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <span>{t("connectingGoogle")}</span>
                </>
              ) : (
                <>
                  {/* Google SVG Logo */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t("continueWithGoogle")}</span>
                </>
              )}
            </button>

            <div className="text-center text-[11px] text-text-faint space-y-1 pt-1 border-t border-border/60">
              <p>{t("privateByDesign")}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-text-muted">
        <span>© 2026 Japan Trip Planner by Mark no Nihon Tabi. All rights reserved.</span>
      </footer>
    </div>
  );
}
