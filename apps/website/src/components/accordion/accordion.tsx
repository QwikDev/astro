import { component$ } from "@builder.io/qwik";
import { Accordion } from "@qwik-ui/headless";

export const SidebarAccordion = component$(({ sidebarEntry }: any) => {
  return (
    <Accordion.Root>
      <Accordion.Item>
        <Accordion.Trigger>yo</Accordion.Trigger>
        <Accordion.Content>Content</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
});
