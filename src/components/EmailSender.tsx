import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailComposer from "@/components/email/EmailComposer";
import EmailListsManager from "@/components/email/EmailListsManager";
import EmailQueue from "@/components/email/EmailQueue";
import EmailConfig from "@/components/email/EmailConfig";

export default function EmailSender() {
  const [listsVersion, setListsVersion] = useState(0);
  const [tab, setTab] = useState("compose");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="compose">Disparo</TabsTrigger>
        <TabsTrigger value="lists">Listas</TabsTrigger>
        <TabsTrigger value="queue">Fila</TabsTrigger>
        <TabsTrigger value="config">Configurações</TabsTrigger>
      </TabsList>
      <TabsContent value="compose">
        <EmailComposer listsVersion={listsVersion} onQueued={() => setTab("queue")} />
      </TabsContent>
      <TabsContent value="lists">
        <EmailListsManager onChanged={() => setListsVersion((v) => v + 1)} />
      </TabsContent>
      <TabsContent value="queue"><EmailQueue /></TabsContent>
      <TabsContent value="config"><EmailConfig /></TabsContent>
    </Tabs>
  );
}
