import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout";
import Home from "./host/Home";
import Login from "./host/Login";
import ProducerCreateOpportunity from "./host/producer/ProducerCreateOpportunity";
import ProducerCreateProject from "./host/producer/ProducerCreateProject";
import ProducerEditOpportunity from "./host/producer/ProducerEditOpportunity";
import ProducerEditProject from "./host/producer/ProducerEditProject";
import ProducerHome from "./host/producer/ProducerHome";
import ProducerOpportunities from "./host/producer/ProducerOpportunities";
import ProducerProjects from "./host/producer/ProducerProjects";
import Register from "./host/Register";
import TalentApplications from "./host/talent/TalentApplications";
import TalentAvailability from "./host/talent/TalentAvailability";
import TalentHome from "./host/talent/TalentHome";
import TalentOpportunities from "./host/talent/TalentOpportunities";
import TalentProfile from "./host/talent/TalentProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/producer" element={<ProducerHome />} />
          <Route path="/producer/projects" element={<ProducerProjects />} />
          <Route path="/producer/projects/new" element={<ProducerCreateProject />} />
          <Route path="/producer/projects/:projectId/edit" element={<ProducerEditProject />} />
          <Route path="/producer/opportunities" element={<ProducerOpportunities />} />
          <Route
            path="/producer/opportunities/new"
            element={<ProducerCreateOpportunity />}
          />
          <Route
            path="/producer/opportunities/:opportunityId/edit"
            element={<ProducerEditOpportunity />}
          />
          <Route path="/talent" element={<TalentHome />} />
          <Route path="/talent/profile" element={<TalentProfile />} />
          <Route path="/talent/availability" element={<TalentAvailability />} />
          <Route path="/talent/opportunities" element={<TalentOpportunities />} />
          <Route path="/talent/applications" element={<TalentApplications />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
