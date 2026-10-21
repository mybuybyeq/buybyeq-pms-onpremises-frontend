import { createContext, useContext, useMemo, useState, useEffect } from "react";

const generateTabId = (path) => path.replace(/\//g, "-") || "dashboard";
const normalizePath = (path) => {
  try {
    return new URL(path, window.location.origin).pathname;
  } catch {
    return path;
  }
};

const defaultTab = {
  id: "dashboard",
  title: "Dashboard",
  path: "/",
  component: "Dashboard",
  isPermanent: true,
};

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [tabs, setTabs] = useState(() => {
    const savedTabs = localStorage.getItem("tabs");
    return savedTabs ? JSON.parse(savedTabs) : [defaultTab];
  });

  const [activeTab, setActiveTab] = useState(() => {
    const savedActiveTab = localStorage.getItem("activeTab");
    return savedActiveTab || "dashboard";
  });

  // Sync with browser URL
  useEffect(() => {
    const handlePathChange = () => {
      const currentPath = window.location.pathname;
      const matchingTab = tabs.find((tab) => normalizePath(tab.path) === normalizePath(currentPath));

      if (matchingTab && matchingTab.id !== activeTab) {
        setActiveTab(matchingTab.id);
      }
    };

    window.addEventListener("popstate", handlePathChange);
    handlePathChange();

    return () => {
      window.removeEventListener("popstate", handlePathChange);
    };
  }, [tabs, activeTab]);

  useEffect(() => {
    localStorage.setItem("tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const openTab = (tab) => {
    const normalizedPath = normalizePath(tab.path);
    const tabId = generateTabId(normalizedPath);

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => normalizePath(t.path) === normalizedPath);
      if (existingTab) {
        setActiveTab(existingTab.id);
        return prevTabs;
      }

      const newTab = {
        id: tabId,
        title: tab.title,
        path: tab.path,
        component: tab.component,
        isPermanent: false,
      };

      return [...prevTabs, newTab];
    });

    setActiveTab(tabId);
    window.history.pushState(null, "", tab.path);
  };

  const closeTab = (id) => {
    const tabToClose = tabs.find((tab) => tab.id === id);
    if (tabToClose?.isPermanent) {
      return;
    }

    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.id !== id);
      if (newTabs.length === 0) {
        return [defaultTab];
      }

      if (activeTab === id) {
        const newActiveTab = newTabs[newTabs.length - 1].id;
        setActiveTab(newActiveTab);
        window.history.pushState(null, "", newTabs.find((t) => t.id === newActiveTab).path);
      }

      return newTabs;
    });
  };

  const closeAllTabs = () => {
    const permanentTabs = tabs.filter((tab) => tab.isPermanent);
    const newTabs = permanentTabs.length > 0 ? permanentTabs : [defaultTab];

    setTabs(newTabs);
    const newActiveTab = newTabs[newTabs.length - 1].id;
    setActiveTab(newActiveTab);
    window.history.pushState(null, "", newTabs.find((t) => t.id === newActiveTab).path);
  };

  const contextValue = useMemo(
    () => ({
      tabs,
      activeTab,
      openTab,
      closeTab,
      closeAllTabs,
      setActiveTab,
    }),
    [tabs, activeTab],
  );

  return <TabContext.Provider value={contextValue}>{children}</TabContext.Provider>;
};

export const useTabContext = () => useContext(TabContext);
