import React from "react";
import ManagerBadge from "./ManagerBadge";
import ServerBoosterBadge from "./ServerBoosterBadge";
import NismaraPlusBadge from "./NismaraPlusBadge";
import LegendaryBadge from "./LegendaryBadge";

interface UserBadgesProps {
  role?: string;
  isManager?: boolean;
  isBooster?: boolean;
  isNismaraPlus?: boolean;
  nismaraPlusStartedAt?: string | Date | null;
  truckyRank?: string;
  className?: string;
}

export default function UserBadges({
  role,
  isManager,
  isBooster,
  isNismaraPlus,
  nismaraPlusStartedAt,
  truckyRank,
  className,
}: UserBadgesProps) {
  const isManagerRole = isManager || role === "manager" || role === "admin";
  return (
    <>
      {isManagerRole && <ManagerBadge className={className} />}
      {isBooster && <ServerBoosterBadge className={className} />}
      {isNismaraPlus && <NismaraPlusBadge startedAt={nismaraPlusStartedAt} className={className} />}
      {truckyRank === "Legendary Driver" && (
        <LegendaryBadge className={className} />
      )}
    </>
  );
}
