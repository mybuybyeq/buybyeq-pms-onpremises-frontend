import { Outlet } from "react-router-dom";
import { Sidebar } from "../components";
import { Tabs } from "../components";
import { SidebarProvider } from "../context/SidebarContext";
import { useState } from "react";

const BaseLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <>
      <style>
        {`
          .tabs-mobile-margin {
            margin-top: 3rem;
          }

          @media (min-width: 768px) {
            .tabs-mobile-margin {
              margin-top: 0;
            }
          }
        `}
      </style>

      <SidebarProvider>
        <main className="page-wrapper">
          <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
          <div className={`content-wrapper ${isSidebarCollapsed ? "content-wrapper-expanded" : ""}`}>
            <div className="tabs-mobile-margin">
              <Tabs />
            </div>
            <div className="tab-content">
              <Outlet />
            </div>
          </div>
        </main>
      </SidebarProvider>
    </>
  );
};

export default BaseLayout;
