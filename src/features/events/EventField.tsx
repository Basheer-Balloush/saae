import { Children, cloneElement, isValidElement, useId, type ReactNode } from "react";
import { Field as ConsoleField } from "@/components/console/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Connect labels to the first input, including input groups and upload previews. */
export function EventField({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  let assigned = false;
  const decorate = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (node) => {
      if (!isValidElement<{ id?: string; children?: ReactNode }>(node)) return node;
      if (!assigned && (node.type === Input || node.type === Textarea || node.type === "select")) {
        assigned = true;
        return cloneElement(node, { id });
      }
      return node.props.children
        ? cloneElement(node, { children: decorate(node.props.children) })
        : node;
    });
  return (
    <ConsoleField label={label} htmlFor={id}>
      {decorate(children)}
    </ConsoleField>
  );
}
