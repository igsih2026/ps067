import CesiumViewer from "./components/globe/CesiumViewer";
import LeftPanel from "./components/panels/leftpanel";
import RightPanel from "./components/panels/rightpanel";
import InstrumentMeta from "./components/panels/instrument-profile/InstrumentMeta";
import ProfileChart from "./components/panels/instrument-profile/ProfileChart";
import TimeseriesChart from "./components/panels/instrument-profile/TimeseriesChart";
import usePanelState from "./hooks/usePanelState";

export default function App() {
  const { instrumentPanelOpen } = usePanelState();

  return (
    <>
      <CesiumViewer />
      <LeftPanel />
      <RightPanel />
      {instrumentPanelOpen ? (
        <div className="instrument-profile-dock">
          <InstrumentMeta />
          <ProfileChart />
          <TimeseriesChart />
        </div>
      ) : null}
    </>
  );
}
