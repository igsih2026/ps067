import CesiumViewer from "./components/globe/CesiumViewer";
import LeftPanel from './components/panels/leftpanel';
import RightPanel from './components/panels/rightpanel';
export default function App() {
  return (
  <>
    <CesiumViewer />
    <LeftPanel />
    <RightPanel />
  </>
);
}
