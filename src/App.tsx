import { Container, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { useState } from "react";
import { FactoriesTab } from "./factories/FactoriesTab";
import { MainLayout } from "./layout/MainLayout";
import { theme } from "./theme";

export default function App() {
  const tabs = ["Factories"];
  const [currentTab, setCurrentTab] = useState(tabs[0] as string | null);
  return (
    <MantineProvider theme={theme}>
      <MainLayout tabs={["Factories"]} onChangeTab={setCurrentTab} />
      <Container size="md" mt="lg">
        {currentTab === "Factories" && <FactoriesTab />}
      </Container>
    </MantineProvider>
  );
}
