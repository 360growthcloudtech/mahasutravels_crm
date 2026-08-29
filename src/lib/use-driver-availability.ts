"use client";

import * as React from "react";
import { fetchDriverAvailability, type DriverAvailabilityQuery } from "@/lib/drivers-api";

export function useDriverAvailability(
  query: DriverAvailabilityQuery & { enabled?: boolean }
) {
  const { enabled = true, travel_date, return_date, exclude_booking_id } = query;
  const [occupied, setOccupied] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !travel_date?.trim()) {
      setOccupied([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchDriverAvailability({ travel_date, return_date, exclude_booking_id })
      .then((names) => {
        if (!cancelled) setOccupied(names);
      })
      .catch(() => {
        if (!cancelled) setOccupied([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, travel_date, return_date, exclude_booking_id]);

  const occupiedSet = React.useMemo(() => new Set(occupied), [occupied]);

  return { occupied, occupiedSet, loading };
}
