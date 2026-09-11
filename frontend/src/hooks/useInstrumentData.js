import { useEffect, useState } from "react";
import {
  DEFAULT_BBOX,
  fetchInstrumentProfile,
  fetchInstruments,
} from "../services/api";
import useVizStore from "../store/vizStore";

/**
 * Instrument markers + selected float/glider profile.
 * Person 1 reads `instruments` for globe markers; writing selectedInstrumentId
 * is enough to load `profile` for InstrumentMeta / ProfileChart.
 */
export default function useInstrumentData({ type, bbox } = {}) {
  const region = bbox ?? DEFAULT_BBOX;
  const west = region.west;
  const south = region.south;
  const east = region.east;
  const north = region.north;
  const selectedInstrumentId = useVizStore((s) => s.selectedInstrumentId);

  const [instruments, setInstruments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setError(null);

    fetchInstruments({ type, bbox: { west, south, east, north } })
      .then((data) => {
        if (cancelled) return;
        setInstruments(data.instruments ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type, west, south, east, north]);

  useEffect(() => {
    if (!selectedInstrumentId) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    let cancelled = false;
    setProfileLoading(true);
    setError(null);

    fetchInstrumentProfile(selectedInstrumentId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedInstrumentId]);

  const selectedInstrument =
    instruments.find((inst) => inst.id === selectedInstrumentId) ?? null;

  return {
    instruments,
    selectedInstrumentId,
    selectedInstrument,
    profile,
    loading: listLoading || profileLoading,
    listLoading,
    profileLoading,
    error,
  };
}
