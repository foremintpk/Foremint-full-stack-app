"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  type GeoFeature,
} from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const GEO_URL = "/states-10m.json";

interface StatePricing {
  state_code: string;
  state_name: string;
  registration_fee: number;
  annual_renewal_fee: number;
  renewal_date: string;
  business_address_fee: number;
  registered_agent_fee: number;
  total_annual_cost: number;
}

interface TooltipPos {
  x: number;
  y: number;
}

// Abbreviation → name map for fast label lookup before data loads
const STATE_ABBR: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
  KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

// FIPS → state abbreviation (from us-atlas topology)
const FIPS_TO_ABBR: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN",
  "19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA",
  "26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV",
  "33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
  "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN",
  "48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI",
  "56":"WY",
};

function fmt(n: number) {
  return n === 0 ? "Free" : `$${n.toLocaleString()}`;
}

// ── Floating card ──────────────────────────────────────────────────────────────
const StateCard = React.memo(function StateCard({
  data,
  pos,
  onMouseEnter,
  onMouseLeave,
}: {
  data: StatePricing;
  pos: TooltipPos;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(pos);

  useEffect(() => {
    if (!cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    let { x, y } = pos;
    if (x + width + pad > vw) x = vw - width - pad;
    if (x < pad) x = pad;
    if (y + height + pad > vh) y = y - height - 20;
    if (y < pad) y = pad;
    setAdjusted({ x, y });
  }, [pos]);

  const rows = [
    { label: "State Registration Fee", value: fmt(data.registration_fee) },
    { label: "Annual Renewal Fee",      value: fmt(data.annual_renewal_fee) },
    { label: "Renewal Date",             value: data.renewal_date },
    { label: "Business Address",         value: fmt(data.business_address_fee) },
    { label: "Registered Agent",         value: fmt(data.registered_agent_fee) },
  ];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 6 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left: adjusted.x, top: adjusted.y }}
      className="fixed z-50 w-72 pointer-events-auto"
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(12, 6, 28, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,8,143,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a78bfa] mb-0.5 font-inter">
            LLC Formation Details
          </p>
          <h3 className="text-[18px] font-black text-white font-manrope leading-tight">
            {data.state_name}
          </h3>
        </div>

        {/* Rows */}
        <div className="px-5 py-3 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-[12px] text-white/50 font-inter">{r.label}</span>
              <span className="text-[12px] font-semibold text-white font-inter">{r.value}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div
          className="mx-5 my-1 px-0 py-3 flex items-center justify-between"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span className="text-[12px] font-bold text-white/80 font-inter uppercase tracking-wide">
            Total Annual Cost
          </span>
          <span className="text-[15px] font-black text-white font-manrope">
            ${data.total_annual_cost.toLocaleString()}
          </span>
        </div>

        {/* CTA */}
        <div className="px-5 py-4">
          <Link
            href={`/onboarding?state=${data.state_code}`}
            className="block w-full text-center py-2.5 rounded-[0.125rem] text-[13px] font-bold text-white font-inter transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #34088f 0%, #5a1de0 100%)",
              boxShadow: "0 2px 12px rgba(52,8,143,0.4)",
            }}
          >
            Form LLC in {data.state_name}
          </Link>
        </div>
      </div>
    </motion.div>
  );
});

// ── Mobile bottom sheet ────────────────────────────────────────────────────────
const MobileSheet = React.memo(function MobileSheet({
  data,
  onClose,
}: {
  data: StatePricing;
  onClose: () => void;
}) {
  const rows = [
    { label: "State Registration Fee", value: fmt(data.registration_fee) },
    { label: "Annual Renewal Fee",      value: fmt(data.annual_renewal_fee) },
    { label: "Renewal Date",             value: data.renewal_date },
    { label: "Business Address",         value: fmt(data.business_address_fee) },
    { label: "Registered Agent",         value: fmt(data.registered_agent_fee) },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
        style={{
          background: "rgba(12, 6, 28, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div
          className="px-6 pt-3 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a78bfa] mb-0.5 font-inter">
            LLC Formation Details
          </p>
          <h2 className="text-[22px] font-black text-white font-manrope">{data.state_name}</h2>
        </div>

        {/* Rows */}
        <div className="px-6 py-4 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-[13px] text-white/50 font-inter">{r.label}</span>
              <span className="text-[13px] font-semibold text-white font-inter">{r.value}</span>
            </div>
          ))}

          {/* Total */}
          <div
            className="pt-3 mt-1 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-[13px] font-bold text-white/80 font-inter uppercase tracking-wide">
              Total Annual Cost
            </span>
            <span className="text-[18px] font-black text-white font-manrope">
              ${data.total_annual_cost.toLocaleString()}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-8 pt-2">
          <Link
            href={`/onboarding?state=${data.state_code}`}
            className="block w-full text-center py-3 rounded-[0.125rem] text-[14px] font-bold text-white font-inter"
            style={{
              background: "linear-gradient(135deg, #34088f 0%, #5a1de0 100%)",
              boxShadow: "0 2px 12px rgba(52,8,143,0.4)",
            }}
            onClick={onClose}
          >
            Form LLC in {data.state_name}
          </Link>
        </div>
      </motion.div>
    </>
  );
});

// ── Main component ─────────────────────────────────────────────────────────────
export default function UsaInteractiveMap() {
  const [pricingMap, setPricingMap] = useState<Record<string, StatePricing>>({});
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ x: 0, y: 0 });
  const [selectedState, setSelectedState] = useState<string | null>(null); // mobile sheet
  const [isOnCard, setIsOnCard] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useRef(false);

  // Detect mobile on mount
  useEffect(() => {
    isMobile.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  // Fetch pricing data once
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("state_pricing" as never)
      .select("*")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, StatePricing> = {};
        (data as StatePricing[]).forEach((row) => {
          map[row.state_code] = row;
        });
        setPricingMap(map);
      });
  }, []);

  const handleMouseEnterState = useCallback(
    (evt: React.MouseEvent<SVGPathElement>, stateCode: string) => {
      if (isMobile.current) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setTooltipPos({ x: evt.clientX + 16, y: evt.clientY + 16 });
      setHoveredState(stateCode);
    },
    []
  );

  const handleMouseMoveState = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      if (isMobile.current || !hoveredState) return;
      setTooltipPos({ x: evt.clientX + 16, y: evt.clientY + 16 });
    },
    [hoveredState]
  );

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      if (!isOnCard) setHoveredState(null);
    }, 120);
  }, [isOnCard]);

  const handleMouseLeaveState = useCallback(() => {
    if (isMobile.current) return;
    scheduleHide();
  }, [scheduleHide]);

  const handleCardMouseEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setIsOnCard(true);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setIsOnCard(false);
    setHoveredState(null);
  }, []);

  const handleStateClick = useCallback(
    (stateCode: string) => {
      if (!isMobile.current) return;
      setSelectedState(stateCode);
    },
    []
  );

  const activeData = hoveredState ? pricingMap[hoveredState] : null;
  const mobileData = selectedState ? pricingMap[selectedState] : null;

  // State color based on cost tiers
  const getStateFill = useCallback(
    (stateCode: string, isHovered: boolean) => {
      if (isHovered) return "#5a1de0";
      const d = pricingMap[stateCode];
      if (!d) return "#e8e0f8";
      const total = d.total_annual_cost;
      if (total < 300) return "#ddd6fe";
      if (total < 500) return "#c4b5fd";
      if (total < 700) return "#a78bfa";
      return "#7c3aed";
    },
    [pricingMap]
  );

  return (
    <section className="py-24 px-4 bg-white overflow-hidden">
      {/* Header */}
      <div className="text-center mb-14 max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#34088f] mb-3 font-inter">
          Interactive State Explorer
        </p>
        <h2
          className="text-4xl md:text-5xl font-black text-black mb-4 tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Form Your LLC in Any{" "}
          <span className="text-[#34088f]">US State</span>
        </h2>
        <p className="text-[16px] text-gray-500 font-inter leading-relaxed">
          Compare formation costs, annual fees, and compliance requirements.
          Hover a state to explore pricing instantly.
        </p>
      </div>

      {/* Map */}
      <div className="max-w-5xl mx-auto w-full select-none">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 900 }}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo: GeoFeature) => {
                const fips = geo.id as string;
                const stateCode = FIPS_TO_ABBR[fips];
                if (!stateCode) return null;
                const isHovered = hoveredState === stateCode;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={(evt: React.MouseEvent<SVGPathElement>) =>
                      handleMouseEnterState(evt, stateCode)
                    }
                    onMouseMove={handleMouseMoveState}
                    onMouseLeave={handleMouseLeaveState}
                    onClick={() => handleStateClick(stateCode)}
                    style={{
                      default: {
                        fill: getStateFill(stateCode, false),
                        stroke: "#ffffff",
                        strokeWidth: 0.8,
                        outline: "none",
                        cursor: "pointer",
                        transition: "fill 0.2s ease",
                      },
                      hover: {
                        fill: "#5a1de0",
                        stroke: "#ffffff",
                        strokeWidth: 1.2,
                        outline: "none",
                        cursor: "pointer",
                        filter: "drop-shadow(0 0 8px rgba(90,29,224,0.5))",
                        transform: "scale(1.02)",
                      },
                      pressed: {
                        fill: "#34088f",
                        stroke: "#ffffff",
                        strokeWidth: 1.2,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Cost legend */}
      <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
        <span className="text-[11px] text-gray-400 font-inter font-medium">Annual cost:</span>
        {[
          { color: "#ddd6fe", label: "< $300" },
          { color: "#c4b5fd", label: "$300–500" },
          { color: "#a78bfa", label: "$500–700" },
          { color: "#7c3aed", label: "$700+" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: t.color, border: "1px solid rgba(0,0,0,0.08)" }}
            />
            <span className="text-[11px] text-gray-400 font-inter">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Desktop floating card */}
      <AnimatePresence>
        {activeData && (
          <StateCard
            key={activeData.state_code}
            data={activeData}
            pos={tooltipPos}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileData && (
          <MobileSheet
            key={mobileData.state_code}
            data={mobileData}
            onClose={() => setSelectedState(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
