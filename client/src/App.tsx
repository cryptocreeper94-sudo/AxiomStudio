import { Route, Switch, Redirect } from "wouter";
import IDELayout from "./components/IDELayout";
import AgentPanel from "./pages/AgentPanel";
import "./ide.css";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={IDELayout} />
      <Route path="/chat" component={AgentPanel} />
      <Route path="/agent" component={AgentPanel} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
