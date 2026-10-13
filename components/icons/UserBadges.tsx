import React from "react";
import ManagerBadge from "./ManagerBadge";
import ServerBoosterBadge from "./ServerBoosterBadge";
import NismaraPlusBadge from "./NismaraPlusBadge";
import LegendaryBadge from "./LegendaryBadge";
import TopManagerBadge from "./TopManagerBadge";

interface UserBadgesProps {
  role?: string;
  isManager?: boolean;
  isTopManager?: boolean;
  topManagerMonth?: string | null;
  topManager?: {
    status?: boolean;
    month?: string | null;
    expiredAt?: Date | string | null;
  } | null;
  isBooster?: boolean;
  isNismaraPlus?: boolean;
  nismaraPlusStartedAt?: string | Date | null;
  truckyRank?: string;
  className?: string;
  tooltipPlacement?: "top" | "bottom";
}

export default function UserBadges({
  role,
  isManager,
  isTopManager,
  topManagerMonth,
  topManager,
  isBooster,
  isNismaraPlus,
  nismaraPlusStartedAt,
  truckyRank,
  className,
  tooltipPlacement = "bottom",
}: UserBadgesProps) {
  const isManagerRole = isManager || role === "manager" || role === "admin";
  const hasTopManager =
    typeof isTopManager === "boolean"
      ? isTopManager
      : topManager?.status === true &&
        (!topManager?.expiredAt || new Date(topManager.expiredAt) > new Date());
  const effectiveMonth = topManagerMonth ?? topManager?.month;

  return (
    <>
      {isManagerRole && (
        <ManagerBadge className={className} placement={tooltipPlacement} />
      )}
      {hasTopManager && (
        <TopManagerBadge
          month={effectiveMonth}
          className={className}
          placement={tooltipPlacement}
        />
      )}
      {isBooster && (
        <ServerBoosterBadge className={className} placement={tooltipPlacement} />
      )}
      {isNismaraPlus && (
        <NismaraPlusBadge
          startedAt={nismaraPlusStartedAt}
          className={className}
          placement={tooltipPlacement}
        />
      )}
      {truckyRank === "Legendary Driver" && (
        <LegendaryBadge className={className} placement={tooltipPlacement} />
      )}
    </>
  );
}
