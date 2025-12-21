import { useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Header } from "@components/navigation/Header";
import { MenuModal } from "@components/navigation/MenuModal";

/**
 * Main app tabs layout with custom header
 * Matches web app design with global header bar
 */
export default function TabsLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  const handleNewPost = () => {
    router.push("/modals/compose");
  };

  return (
    <>
      <Tabs
        screenOptions={{
          header: () => (
            <Header
              showUserInfo
              onMenuPress={() => setMenuVisible(true)}
              onNewPostPress={handleNewPost}
            />
          ),
          headerShown: true,
          tabBarStyle: {
            display: "none", // Hide bottom tabs - navigation is now in header
          },
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: "Feed",
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
          }}
        />
      </Tabs>

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}
