import { useTabContext } from "../../context/TabContext";
import { MdClose } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import "./Tabs.scss";

const Tabs = () => {
  const { tabs, activeTab, closeTab, setActiveTab } = useTabContext();
  const navigate = useNavigate();

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const handleCloseTab = (e, tabToClose) => {
    e.stopPropagation();
    const tabIndex = tabs.findIndex((tab) => tab.id === tabToClose.id);
    let tabToNavigate;
    if (tabs.length === 1) {
      tabToNavigate = { path: "/" };
    } else if (activeTab === tabToClose.id) {
      if (tabIndex > 0) {
        tabToNavigate = tabs[tabIndex - 1];
      } else {
        tabToNavigate = tabs[tabIndex + 1];
      }
    } else {
      tabToNavigate = tabs.find((tab) => tab.id === activeTab);
    }

    closeTab(tabToClose.id);

    if (tabToNavigate) {
      navigate(tabToNavigate.path);
    }
  };

  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return 0;
  });

  return (
    <div className="tabs-container">
      <div className="tabs">
        {sortedTabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleTabClick(tab)}
          >
            <span className="tab-title">{tab.title}</span>
            {tab.path !== "/" && (
              <button className="tab-close-btn" onClick={(e) => handleCloseTab(e, tab)}>
                <MdClose size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
