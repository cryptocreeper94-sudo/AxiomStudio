import { Route, Switch, Redirect } from "wouter";
import IDELayout from "./components/IDELayout";
import AgentPanel from "./pages/AgentPanel";
import LandingPage from "./pages/LandingPage";
import ProfileDashboard from "./pages/ProfileDashboard";
import AxiomDepot from "./pages/AxiomDepot";
import AxiomDepotRepo from "./pages/AxiomDepotRepo";
import SharedBuildPage from "./pages/SharedBuildPage";
import "./ide.css";
import { EcosystemAccountHub } from "./components/EcosystemAccountHub";

export default function App() {
  const isElectron = navigator.userAgent.toLowerCase().includes("electron");

  return (
    <>
      <Switch>
        <Route path="/" component={IDELayout} />
        <Route path="/ide" component={IDELayout} />
        <Route path="/profile" component={ProfileDashboard} />
        <Route path="/chat" component={AgentPanel} />
        <Route path="/agent" component={AgentPanel} />
        <Route path="/share/:id" component={SharedBuildPage} />
        <Route path="/depot/repo/:slug" component={AxiomDepotRepo} />
        <Route path="/depot" component={AxiomDepot} />
        <Route>
          <Redirect to={isElectron ? "/ide" : "/"} />
        </Route>
      </Switch>
      {isElectron && <EcosystemAccountHub />}
    </>
  );
}

