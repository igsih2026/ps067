import useVizStore from "../store/vizStore";

/**
 * Left/right panel open state plus whether the instrument profile pane
 * should be visible. Person 2 can keep writing the store directly; this
 * hook is the shared read/toggle helper for App / panel shells.
 */
export default function usePanelState() {
  const leftPanelOpen = useVizStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useVizStore((s) => s.rightPanelOpen);
  const setLeftPanelOpen = useVizStore((s) => s.setLeftPanelOpen);
  const setRightPanelOpen = useVizStore((s) => s.setRightPanelOpen);
  const selectedInstrumentId = useVizStore((s) => s.selectedInstrumentId);
  const clearSelectedInstrument = useVizStore((s) => s.clearSelectedInstrument);
  const landClickMessage = useVizStore((s) => s.landClickMessage);
  const mode = useVizStore((s) => s.mode);

  const toggleLeftPanel = () => setLeftPanelOpen(!leftPanelOpen);
  const toggleRightPanel = () => setRightPanelOpen(!rightPanelOpen);

  return {
    leftPanelOpen,
    rightPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    instrumentPanelOpen: Boolean(selectedInstrumentId),
    selectedInstrumentId,
    clearSelectedInstrument,
    landClickMessage,
    mode,
  };
}
