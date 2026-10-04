import React from "react";

export type JapanSeason = "winter" | "spring" | "summer" | "autumn";

/**
 * Determines the Japanese travel season from a given Date or ISO date string.
 * - Winter: Dec, Jan, Feb (Months 12, 1, 2)
 * - Spring: Mar, Apr, May (Months 3, 4, 5)
 * - Summer (Hot): Jun, Jul, Aug (Months 6, 7, 8)
 * - Autumn: Sep, Oct, Nov (Months 9, 10, 11)
 */
export function getSeasonFromDate(dateInput?: string | Date | null): JapanSeason {
  if (!dateInput) return "autumn";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "autumn";
  const month = date.getMonth() + 1; // 1-indexed (1 = Jan, 12 = Dec)

  if (month === 12 || month === 1 || month === 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "autumn";
}

interface JapanHeroArtworkProps {
  className?: string;
  idPrefix?: string;
  season?: JapanSeason;
  date?: string | Date | null;
}

export default function JapanHeroArtwork({
  className = "",
  idPrefix = "hero",
  season,
  date,
}: JapanHeroArtworkProps) {
  const activeSeason: JapanSeason = season || (date ? getSeasonFromDate(date) : "autumn");

  const sunGradId = `${idPrefix}-sunGrad`;
  const fujiGradId = `${idPrefix}-fujiGrad`;
  const snowGradId = `${idPrefix}-snowGrad`;
  const hillGradId = `${idPrefix}-hillGrad`;
  const trainGradId = `${idPrefix}-trainGrad`;

  return (
    <svg
      viewBox="0 0 380 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ============================================================
            1. SUN / SKY GLOW GRADIENTS
        ============================================================ */}
        {/* Winter: Silvery Pale Winter Solstice Moon / Sun */}
        <radialGradient id={sunGradId} cx="50%" cy="50%" r="50%">
          {activeSeason === "winter" && (
            <>
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.25" />
            </>
          )}
          {/* Spring: Soft Sakura Pink / Rose Sunrise */}
          {activeSeason === "spring" && (
            <>
              <stop offset="0%" stopColor="#FFF1F2" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#FDA4AF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FB7185" stopOpacity="0.3" />
            </>
          )}
          {/* Summer: Scorching Radiant Golden-Orange Sun with Heat Flare */}
          {activeSeason === "summer" && (
            <>
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="1" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.4" />
            </>
          )}
          {/* Autumn: Classic Crimson Red Momiji Harvest Sun */}
          {activeSeason === "autumn" && (
            <>
              <stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#E11D48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FEB47B" stopOpacity="0.3" />
            </>
          )}
        </radialGradient>

        {/* ============================================================
            2. MOUNT FUJI GRADIENT (Deep seasonal character)
        ============================================================ */}
        <linearGradient id={fujiGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          {activeSeason === "winter" && (
            <>
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="45%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </>
          )}
          {activeSeason === "spring" && (
            <>
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#4338CA" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </>
          )}
          {activeSeason === "summer" && (
            <>
              <stop offset="0%" stopColor="#047857" />
              <stop offset="40%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#064E3B" />
            </>
          )}
          {activeSeason === "autumn" && (
            <>
              <stop offset="0%" stopColor="#4A6572" />
              <stop offset="40%" stopColor="#344955" />
              <stop offset="100%" stopColor="#232F34" />
            </>
          )}
        </linearGradient>

        {/* ============================================================
            3. MOUNT FUJI SNOW GRADIENT
        ============================================================ */}
        <linearGradient id={snowGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="85%" stopColor={activeSeason === "winter" ? "#F0F9FF" : activeSeason === "spring" ? "#FFF1F2" : "#F0F4F8"} />
          <stop offset="100%" stopColor={activeSeason === "winter" ? "#BAE6FD" : activeSeason === "spring" ? "#FECDD3" : "#D9E2EC"} />
        </linearGradient>

        {/* ============================================================
            4. FOOTHILL GRADIENT
        ============================================================ */}
        <linearGradient id={hillGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          {activeSeason === "winter" && (
            <>
              <stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#CBD5E1" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="1" />
            </>
          )}
          {activeSeason === "spring" && (
            <>
              <stop offset="0%" stopColor="#F472B6" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#EC4899" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9D174D" stopOpacity="1" />
            </>
          )}
          {activeSeason === "summer" && (
            <>
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#15803D" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#14532D" stopOpacity="1" />
            </>
          )}
          {activeSeason === "autumn" && (
            <>
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#D97706" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#9A3412" stopOpacity="1" />
            </>
          )}
        </linearGradient>

        {/* Train Gradient */}
        <linearGradient id={trainGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      {/* ============================================================
          SECTION 1: THE SUN & SKY PHENOMENA
      ============================================================ */}
      {/* Sun Body */}
      <circle
        cx="230"
        cy={activeSeason === "winter" ? 110 : 95}
        r={activeSeason === "summer" ? 74 : 66}
        fill={`url(#${sunGradId})`}
        opacity={activeSeason === "summer" ? 0.95 : 0.85}
      />

      {/* Summer: Radiant Sunbeams Flaring across sky */}
      {activeSeason === "summer" && (
        <g opacity="0.55" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round">
          <line x1="230" y1="12" x2="230" y2="0" />
          <line x1="290" y1="36" x2="304" y2="24" />
          <line x1="308" y1="95" x2="322" y2="95" />
          <line x1="170" y1="36" x2="156" y2="24" />
          <line x1="152" y1="95" x2="138" y2="95" />
        </g>
      )}

      {/* Floating Japanese Clouds / Mist Bands */}
      <g opacity={activeSeason === "winter" ? 0.3 : activeSeason === "spring" ? 0.55 : 0.45}>
        <path
          d="M60 85 C80 82, 100 88, 120 85 C135 83, 145 78, 160 80 C180 82, 195 90, 215 87"
          stroke={activeSeason === "spring" ? "#FCE7F3" : "#FFFFFF"}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M260 65 C280 62, 295 68, 315 65 C330 63, 345 58, 360 62"
          stroke={activeSeason === "spring" ? "#FCE7F3" : "#FFFFFF"}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M20 145 C50 142, 80 148, 110 145 C135 142, 160 148, 190 144"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* ============================================================
          SECTION 2: MOUNT FUJI (Silhouette & Seasonal Snowline)
      ============================================================ */}
      {/* Fuji Body */}
      <path
        d="M90 220 L185 82 C195 72, 215 72, 225 82 L320 220 Z"
        fill={`url(#${fujiGradId})`}
        opacity="0.88"
      />

      {/* Fuji Snow Cap: Highly distinct per season */}
      {activeSeason === "winter" && (
        // WINTER: Deep heavy snowpack stretching more than halfway down the mountain slope
        <path
          d="M185 82 C195 72, 215 72, 225 82 L254 135 L242 142 L228 132 L212 146 L198 134 L184 144 L170 133 L152 134 Z"
          fill={`url(#${snowGradId})`}
        />
      )}

      {activeSeason === "spring" && (
        // SPRING: Traditional snowy mantle reflecting soft sakura pink morning glow
        <path
          d="M185 82 C195 72, 215 72, 225 82 L244 112 L234 118 L223 111 L212 120 L201 112 L190 118 L180 110 L166 110 Z"
          fill={`url(#${snowGradId})`}
        />
      )}

      {activeSeason === "summer" && (
        // SUMMER: Thawed mountain - jagged, minimal high-altitude snow crevasses
        <path
          d="M185 82 C195 72, 215 72, 225 82 L232 94 L226 98 L220 93 L214 100 L206 94 L198 99 L192 93 L180 93 Z"
          fill={`url(#${snowGradId})`}
        />
      )}

      {activeSeason === "autumn" && (
        // AUTUMN: Fresh first snowfall ("Hatsuyukikesho") crisp crown atop golden ridge
        <path
          d="M185 82 C195 72, 215 72, 225 82 L240 106 L231 112 L221 106 L212 114 L203 107 L194 113 L184 106 L170 106 Z"
          fill={`url(#${snowGradId})`}
        />
      )}

      {/* Mountain Crease & Depth */}
      <path
        d="M205 76 L202 109 L212 116 L205 76"
        fill={activeSeason === "winter" ? "#93C5FD" : "#CBD5E1"}
        opacity="0.6"
      />

      {/* ============================================================
          SECTION 3: FOOTHILLS & FOREGROUND LANDSCAPE
      ============================================================ */}
      <path
        d="M40 220 C100 185, 170 190, 250 200 C300 206, 340 195, 380 205 L380 220 L40 220 Z"
        fill={`url(#${hillGradId})`}
        opacity="0.85"
      />

      {/* Spring: Extra Blooming Sakura Hillock on Far Left */}
      {activeSeason === "spring" && (
        <path
          d="M10 220 C40 180, 80 185, 130 210 L130 220 Z"
          fill="#FBCFE8"
          opacity="0.75"
        />
      )}

      {/* Winter: Snowbank Drifts across Foothill */}
      {activeSeason === "winter" && (
        <path
          d="M60 220 C120 195, 190 205, 270 212 C320 215, 350 210, 380 218 L380 220 Z"
          fill="#FFFFFF"
          opacity="0.75"
        />
      )}

      {/* ============================================================
          SECTION 4: TRADITIONAL TORII GATE (Left Foreground)
      ============================================================ */}
      <g transform="translate(65, 142) scale(0.72)">
        {/* Kasagi main beam */}
        <path
          d="M0 6 C15 2, 35 2, 50 6 L48 10 C35 7, 15 7, 2 10 Z"
          fill="#D90429"
        />
        {/* Nuki secondary beam */}
        <rect x="5" y="16" width="40" height="3" rx="1" fill="#D90429" />
        {/* Central tablet (Gakuzuka) */}
        <rect x="23" y="9" width="4" height="8" rx="0.5" fill="#1E293B" />
        {/* Pillars */}
        <path d="M11 10 L8 50 L12 50 L14 10 Z" fill="#D90429" />
        <path d="M36 10 L38 50 L34 50 L32 10 Z" fill="#D90429" />
        {/* Pillar stone bases */}
        <rect x="6" y="48" width="8" height="3" rx="1" fill="#1E293B" />
        <rect x="32" y="48" width="8" height="3" rx="1" fill="#1E293B" />

        {/* WINTER: Thick blanket of pristine snow resting on Torii Roof */}
        {activeSeason === "winter" && (
          <path
            d="M0 6 C15 1, 35 1, 50 6 L47 8 C35 4, 15 4, 3 8 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
        )}
      </g>

      {/* ============================================================
          SECTION 5: 5-STORY PAGODA (Right Ridge)
      ============================================================ */}
      <g transform="translate(305, 110) scale(0.68)" opacity="0.9">
        {/* Sorin Spire */}
        <line x1="25" y1="2" x2="25" y2="22" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
        <circle
          cx="25"
          cy="5"
          r="2"
          fill={activeSeason === "spring" ? "#F472B6" : activeSeason === "summer" ? "#10B981" : "#D97706"}
        />
        <circle
          cx="25"
          cy="10"
          r="2.5"
          fill={activeSeason === "spring" ? "#F472B6" : activeSeason === "summer" ? "#10B981" : "#D97706"}
        />

        {/* Roof 5 */}
        <path d="M13 22 C20 19, 30 19, 37 22 L35 25 L15 25 Z" fill="#1E293B" />
        <rect x="21" y="25" width="8" height="5" fill="#B45309" />

        {/* Roof 4 */}
        <path d="M10 30 C19 26, 31 26, 40 30 L38 33 L12 33 Z" fill="#1E293B" />
        <rect x="20" y="33" width="10" height="5" fill="#B45309" />

        {/* Roof 3 */}
        <path d="M7 38 C18 33, 32 33, 43 38 L41 42 L9 42 Z" fill="#1E293B" />
        <rect x="19" y="42" width="12" height="6" fill="#B45309" />

        {/* Roof 2 */}
        <path d="M4 48 C17 42, 33 42, 46 48 L44 52 L6 52 Z" fill="#1E293B" />
        <rect x="18" y="52" width="14" height="6" fill="#B45309" />

        {/* Roof 1 (Base) */}
        <path d="M1 58 C16 51, 34 51, 49 58 L46 63 L4 63 Z" fill="#1E293B" />
        <rect x="16" y="63" width="18" height="12" fill="#1E293B" />

        {/* WINTER: Snow accumulating on all 5 pagoda eaves */}
        {activeSeason === "winter" && (
          <g fill="#FFFFFF" opacity="0.95">
            <path d="M14 22 C20 20, 30 20, 36 22 L35 23.5 L15 23.5 Z" />
            <path d="M11 30 C19 27, 31 27, 39 30 L38 31.5 L12 31.5 Z" />
            <path d="M8 38 C18 34, 32 34, 42 38 L41 39.5 L9 39.5 Z" />
            <path d="M5 48 C17 43, 33 43, 45 48 L44 49.5 L6 49.5 Z" />
            <path d="M2 58 C16 52, 34 52, 48 58 L46 60 L4 60 Z" />
          </g>
        )}
      </g>

      {/* ============================================================
          SECTION 6: SHINKANSEN BULLET TRAIN ON SCENIC VIADUCT
      ============================================================ */}
      <g transform="translate(130, 185) scale(0.85)">
        <line x1="-30" y1="28" x2="210" y2="28" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="6 3" />
        <line x1="-30" y1="31" x2="210" y2="31" stroke="#64748B" strokeWidth="1.5" />

        {/* Train Lead Car */}
        <path
          d="M140 16 C165 17, 185 24, 195 28 L140 28 Z"
          fill={`url(#${trainGradId})`}
        />
        <path d="M155 18 C168 20, 175 24, 178 25 L155 25 Z" fill="#0F172A" />

        {/* Train Carriage */}
        <rect x="30" y="14" width="112" height="14" rx="2" fill={`url(#${trainGradId})`} />

        {/* Seasonal Shinkansen Livery Stripe */}
        {/* Spring: Akita/Tohoku Komachi Cherry Pink | Summer: Hayabusa Emerald | Autumn: E7 Hokuriku Gold | Winter: Tokaido Classic Blue */}
        <rect
          x="30"
          y="22"
          width="145"
          height="2.2"
          fill={
            activeSeason === "spring"
              ? "#EC4899"
              : activeSeason === "summer"
              ? "#10B981"
              : activeSeason === "autumn"
              ? "#D97706"
              : "#0284C7"
          }
        />
        <path
          d="M175 24.2 C182 25.5, 188 27, 192 28 L175 28 Z"
          fill={
            activeSeason === "spring"
              ? "#EC4899"
              : activeSeason === "summer"
              ? "#10B981"
              : activeSeason === "autumn"
              ? "#D97706"
              : "#0284C7"
          }
        />

        {/* Windows */}
        <g fill="#1E293B">
          <rect x="38" y="16.5" width="8" height="4" rx="1" />
          <rect x="52" y="16.5" width="8" height="4" rx="1" />
          <rect x="66" y="16.5" width="8" height="4" rx="1" />
          <rect x="80" y="16.5" width="8" height="4" rx="1" />
          <rect x="94" y="16.5" width="8" height="4" rx="1" />
          <rect x="108" y="16.5" width="8" height="4" rx="1" />
          <rect x="122" y="16.5" width="8" height="4" rx="1" />
        </g>
      </g>

      {/* ============================================================
          SECTION 7: UNIQUE SEASONAL MOTIFS & BOTANICALS
      ============================================================ */}

      {/* ────────────────────────────────────────────────────────────
          ❄️ 1. WINTER: Snowfall, Heavy Snow Crystals & Evergreens
      ──────────────────────────────────────────────────────────── */}
      {activeSeason === "winter" && (
        <g>
          {/* Winter Pine Trees (Matsu) dusted in snow on left ridge */}
          <g transform="translate(32, 160) scale(0.65)">
            <polygon points="15,0 5,20 25,20" fill="#1E293B" />
            <polygon points="15,10 2,32 28,32" fill="#1E293B" />
            <polygon points="15,22 0,46 30,46" fill="#1E293B" />
            <rect x="13" y="46" width="4" height="8" fill="#78350F" />
            {/* Snow on Pine */}
            <polygon points="15,0 10,12 20,12" fill="#FFFFFF" opacity="0.9" />
            <polygon points="15,10 6,24 24,24" fill="#FFFFFF" opacity="0.9" />
            <polygon points="15,22 4,36 26,36" fill="#FFFFFF" opacity="0.9" />
          </g>

          {/* Intricate Floating Snowflakes (Yuki no Kessho) */}
          <g opacity="0.95">
            {/* Snowflake 1 */}
            <g transform="translate(50, 42) scale(1)">
              <line x1="0" y1="-9" x2="0" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-8" y1="-4.5" x2="8" y2="4.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-8" y1="4.5" x2="8" y2="-4.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="0" cy="0" r="2" fill="#BAE6FD" />
            </g>
            {/* Snowflake 2 */}
            <g transform="translate(118, 28) scale(0.8)">
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="-7" y1="-4" x2="7" y2="4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="-7" y1="4" x2="7" y2="-4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
            </g>
            {/* Snowflake 3 */}
            <g transform="translate(305, 45) scale(0.9)">
              <line x1="0" y1="-9" x2="0" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-8" y1="-4.5" x2="8" y2="4.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-8" y1="4.5" x2="8" y2="-4.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="0" cy="0" r="1.8" fill="#BAE6FD" />
            </g>
            {/* Snowflake 4 */}
            <g transform="translate(350, 75) scale(0.7)">
              <line x1="0" y1="-7" x2="0" y2="7" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="-6" y1="-3" x2="6" y2="3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="-6" y1="3" x2="6" y2="-3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
            </g>
            {/* Gently floating snow specks */}
            <circle cx="85" cy="65" r="2.5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="160" cy="38" r="3" fill="#FFFFFF" opacity="0.9" />
            <circle cx="270" cy="70" r="2.5" fill="#FFFFFF" opacity="0.85" />
            <circle cx="140" cy="85" r="2" fill="#FFFFFF" opacity="0.8" />
          </g>
        </g>
      )}

      {/* ────────────────────────────────────────────────────────────
          🌸 2. SPRING: Cherry Blossom Branch (Sakura) & Drifting Petals
      ──────────────────────────────────────────────────────────── */}
      {activeSeason === "spring" && (
        <g>
          {/* Elegant Arching Sakura Branch in upper-left corner */}
          <g transform="translate(-10, -5) scale(0.95)" opacity="0.95">
            {/* Main wooden bough */}
            <path
              d="M0 20 Q40 35, 75 25 T130 38"
              fill="none"
              stroke="#5C3D2E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Secondary twig */}
            <path
              d="M45 28 Q65 15, 85 10"
              fill="none"
              stroke="#5C3D2E"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Blossom 1 (5 Petals) */}
            <g transform="translate(75, 25)">
              <circle cx="0" cy="-6" r="5" fill="#F472B6" />
              <circle cx="6" cy="-2" r="5" fill="#F472B6" />
              <circle cx="4" cy="5" r="5" fill="#F472B6" />
              <circle cx="-4" cy="5" r="5" fill="#F472B6" />
              <circle cx="-6" cy="-2" r="5" fill="#F472B6" />
              <circle cx="0" cy="0" r="2.5" fill="#FDF2F8" />
              <circle cx="0" cy="0" r="1.2" fill="#E11D48" />
            </g>

            {/* Blossom 2 */}
            <g transform="translate(125, 36) scale(0.85)">
              <circle cx="0" cy="-6" r="5" fill="#FDA4AF" />
              <circle cx="6" cy="-2" r="5" fill="#FDA4AF" />
              <circle cx="4" cy="5" r="5" fill="#FDA4AF" />
              <circle cx="-4" cy="5" r="5" fill="#FDA4AF" />
              <circle cx="-6" cy="-2" r="5" fill="#FDA4AF" />
              <circle cx="0" cy="0" r="2.5" fill="#FFF1F2" />
              <circle cx="0" cy="0" r="1.2" fill="#BE123C" />
            </g>

            {/* Blossom 3 (on twig) */}
            <g transform="translate(85, 10) scale(0.75)">
              <circle cx="0" cy="-6" r="5" fill="#FB7185" />
              <circle cx="6" cy="-2" r="5" fill="#FB7185" />
              <circle cx="4" cy="5" r="5" fill="#FB7185" />
              <circle cx="-4" cy="5" r="5" fill="#FB7185" />
              <circle cx="-6" cy="-2" r="5" fill="#FB7185" />
              <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
            </g>
          </g>

          {/* Drifting Sakura Petals dancing on wind */}
          <g opacity="0.9">
            <path
              d="M170 45 C165 38, 172 33, 176 37 C180 33, 187 38, 182 45 C179 50, 173 50, 170 45 Z"
              fill="#F472B6"
              transform="rotate(25 176 41)"
            />
            <path
              d="M210 30 C206 24, 212 20, 215 23 C218 20, 224 24, 220 30 C218 34, 213 34, 210 30 Z"
              fill="#FDA4AF"
              transform="rotate(-15 215 26)"
            />
            <path
              d="M295 44 C291 38, 297 34, 300 37 C303 34, 309 38, 305 44 C303 48, 298 48, 295 44 Z"
              fill="#FB7185"
              transform="rotate(40 300 40)"
            />
            <path
              d="M340 72 C336 66, 342 62, 345 65 C348 62, 354 66, 350 72 C348 76, 343 76, 340 72 Z"
              fill="#F43F5E"
              transform="rotate(-25 345 68)"
            />
            <path
              d="M315 20 C311 15, 316 11, 319 14 C322 11, 327 15, 324 20 C322 23, 318 23, 315 20 Z"
              fill="#FBCFE8"
              transform="rotate(10 319 17)"
            />
          </g>
        </g>
      )}

      {/* ────────────────────────────────────────────────────────────
          ☀️ 3. SUMMER: Lush Bamboo Grove (Take) & Fresh Summer Greenery
      ──────────────────────────────────────────────────────────── */}
      {activeSeason === "summer" && (
        <g>
          {/* Elegant Japanese Bamboo Stalks on Left Border */}
          <g transform="translate(18, 55)" opacity="0.95">
            {/* Bamboo Stalk 1 */}
            <line x1="12" y1="0" x2="12" y2="40" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <line x1="12" y1="42" x2="12" y2="85" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <line x1="12" y1="87" x2="12" y2="130" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            {/* Joints */}
            <circle cx="12" cy="41" r="2" fill="#047857" />
            <circle cx="12" cy="86" r="2" fill="#047857" />

            {/* Bamboo Leaves */}
            <path d="M12 41 Q28 35, 35 48 C28 46, 18 45, 12 41 Z" fill="#10B981" />
            <path d="M12 41 Q-4 32, -10 44 C-4 43, 6 43, 12 41 Z" fill="#34D399" />
            <path d="M12 86 Q30 78, 38 92 C28 90, 18 89, 12 86 Z" fill="#059669" />
            <path d="M12 86 Q-6 76, -14 90 C-6 88, 5 88, 12 86 Z" fill="#10B981" />
          </g>

          {/* Bamboo Stalk 2 (Behind) */}
          <g transform="translate(36, 80) scale(0.85)" opacity="0.8">
            <line x1="12" y1="0" x2="12" y2="50" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="12" y1="52" x2="12" y2="110" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="51" r="1.8" fill="#065F46" />
            <path d="M12 51 Q28 42, 34 56 C26 54, 18 53, 12 51 Z" fill="#10B981" />
          </g>

          {/* Summer Fireflies / Sunlight Sparkles */}
          <g opacity="0.9">
            <circle cx="95" cy="48" r="2.5" fill="#FEF08A" />
            <circle cx="95" cy="48" r="5" fill="#FEF08A" opacity="0.3" />

            <circle cx="280" cy="38" r="3" fill="#FDE047" />
            <circle cx="280" cy="38" r="6" fill="#FDE047" opacity="0.35" />

            <circle cx="345" cy="60" r="2.5" fill="#FEF08A" />
            <circle cx="160" cy="35" r="2" fill="#FDE047" />
          </g>
        </g>
      )}

      {/* ────────────────────────────────────────────────────────────
          🍁 4. AUTUMN: Crimson Momiji Foliage Branch & Dancing Maple Leaves
      ──────────────────────────────────────────────────────────── */}
      {activeSeason === "autumn" && (
        <g>
          {/* Overhanging Autumn Maple Branch in upper-right */}
          <g transform="translate(240, -10) scale(0.9)" opacity="0.95">
            <path
              d="M120 0 Q70 25, 40 45 T-10 60"
              fill="none"
              stroke="#78350F"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Cluster of rich red momiji leaves on branch */}
            <g transform="translate(40, 45) scale(1.1)">
              <path
                d="M0 -10 C3 -7, 7 -8, 8 -4 C11 -4, 13 -1, 10 3 C12 6, 9 9, 5 8 C4 11, 0 11, -2 8 C-6 9, -9 6, -7 3 C-10 -1, -8 -4, -5 -4 C-4 -8, 0 -7, 0 -10 Z"
                fill="#DC2626"
              />
            </g>
            <g transform="translate(85, 22) scale(0.9)">
              <path
                d="M0 -10 C3 -7, 7 -8, 8 -4 C11 -4, 13 -1, 10 3 C12 6, 9 9, 5 8 C4 11, 0 11, -2 8 C-6 9, -9 6, -7 3 C-10 -1, -8 -4, -5 -4 C-4 -8, 0 -7, 0 -10 Z"
                fill="#EA580C"
              />
            </g>
          </g>

          {/* Floating Japanese Autumn Maple Leaves (Momiji) drifting across sky */}
          <g opacity="0.9">
            {/* Momiji Leaf 1 */}
            <path
              d="M45 42 C48 38, 52 40, 53 43 C55 39, 58 41, 57 45 C60 45, 61 48, 57 50 C55 52, 51 51, 49 53 L47 50 C44 50, 42 47, 45 42 Z"
              fill="#EF4444"
              transform="rotate(15 45 42)"
            />
            {/* Momiji Leaf 2 */}
            <path
              d="M110 30 C112 27, 115 28, 116 30 C118 28, 120 29, 119 32 C121 32, 122 34, 119 36 C117 37, 114 36, 113 38 L111 36 C109 36, 108 34, 110 30 Z"
              fill="#F97316"
              transform="rotate(-20 110 30)"
            />
            {/* Momiji Leaf 3 */}
            <path
              d="M175 48 C177 45, 180 46, 181 48 C183 46, 185 47, 184 50 C186 50, 187 52, 184 54 C182 55, 179 54, 178 56 L176 54 C174 54, 173 52, 175 48 Z"
              fill="#DC2626"
              transform="rotate(35 178 51)"
            />
            {/* Momiji Leaf 4 */}
            <path
              d="M340 75 C342 72, 345 73, 346 75 C348 73, 350 74, 349 77 C351 77, 352 79, 349 81 C347 82, 344 81, 343 83 L341 81 C339 81, 338 79, 340 75 Z"
              fill="#B91C1C"
              transform="rotate(-10 340 75)"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
