import { useCallback, useEffect, useRef, useState } from "react";
import { aiApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";

const fresh = (incidentId) => ({
  incidentId,
  description: null, // null = "use the incident's own description"
  logs: "",
  indicators: "",
  result: null,
  error: "",
  loading: false,
  startedAt: null,
});

// Holds the AI analyzer's inputs, result and request state for ONE incident visit.
//
// It lives in the incident page (not in the tab) so switching tabs no longer throws
// the analysis away, and an in-flight request still lands when you come back. Nothing
// is stored anywhere else: leaving the page unmounts the hook, and a different
// incident id resets it, so an assessment can never appear on another incident or
// come back after you revisit one.
export function useIncidentAnalyzer(incidentId) {
  const [state, setState] = useState(() => fresh(incidentId));
  const generation = useRef(0);
  const busy = useRef(false);

  // A new incident discards everything, including the response of any request still
  // in flight (its generation no longer matches, so it is ignored).
  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    setState((prev) => (prev.incidentId === incidentId ? prev : fresh(incidentId)));
  }, [incidentId]);

  // Never expose state recorded for another incident, not even for the render
  // before the effect above runs.
  const view = state.incidentId === incidentId ? state : fresh(incidentId);

  const setField = useCallback(
    (field, value) => setState((prev) => ({ ...(prev.incidentId === incidentId ? prev : fresh(incidentId)), [field]: value })),
    [incidentId]
  );

  const run = useCallback(
    async ({ description, logs, indicators }) => {
      if (busy.current) return; // one request at a time: no duplicate analysis
      busy.current = true;
      const mine = ++generation.current;
      setState((prev) => ({
        ...(prev.incidentId === incidentId ? prev : fresh(incidentId)),
        loading: true,
        error: "",
        result: null,
        startedAt: Date.now(),
      }));
      try {
        const res = await aiApi.analyzeIncident({
          incident_id: incidentId,
          description,
          logs: logs || undefined,
          indicators: indicators || undefined,
        });
        if (generation.current !== mine) return;
        setState((prev) => ({ ...prev, result: res.data, loading: false }));
      } catch (err) {
        if (generation.current !== mine) return;
        setState((prev) => ({
          ...prev,
          error: getApiErrorMessage(err, "The AI Incident Analyzer could not be reached."),
          loading: false,
        }));
      } finally {
        if (generation.current === mine) busy.current = false;
      }
    },
    [incidentId]
  );

  return { ...view, setField, run };
}
