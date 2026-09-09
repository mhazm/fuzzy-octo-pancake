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
      {isManagerRole && <ManagerBadge className={className} />}
      {hasTopManager && <TopManagerBadge month={effectiveMonth} className={className} />}
      {isBooster && <ServerBoosterBadge className={className} />}
      {isNismaraPlus && <NismaraPlusBadge startedAt={nismaraPlusStartedAt} className={className} />}
      {truckyRank === "Legendary Driver" && (
        <LegendaryBadge className={className} />
      )}
    </>
  );
}
