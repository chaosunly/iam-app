/**
 * Ory Flow Utilities
 * Helpers for parsing Kratos flow UI nodes into strongly-typed field objects.
 */

import type { UiNode, UiNodeInputAttributes, UiText } from "@ory/client-fetch";

export interface FlowField {
  name: string;
  type: string;
  value: string;
  required: boolean;
  disabled: boolean;
  label?: string;
  messages: string[];
  node: UiNode;
}

function isInputNode(
  node: UiNode,
): node is UiNode & { attributes: UiNodeInputAttributes } {
  return node.type === "input";
}

function getNodeLabel(node: UiNode): string | undefined {
  return node.meta?.label?.text;
}

function getNodeMessages(node: UiNode): string[] {
  return (node.messages ?? []).map((m: UiText) => m.text);
}

/** Get all input nodes from ui.nodes */
export function getInputNodes(nodes: UiNode[]): FlowField[] {
  return nodes
    .filter(isInputNode)
    .map((node) => {
      const attrs = node.attributes as UiNodeInputAttributes;
      return {
        name: attrs.name,
        type: attrs.type ?? "text",
        value: String(attrs.value ?? ""),
        required: attrs.required ?? false,
        disabled: attrs.disabled ?? false,
        label: getNodeLabel(node),
        messages: getNodeMessages(node),
        node,
      };
    });
}

/** Get a specific input node by attribute name */
export function getNodeByName(
  nodes: UiNode[],
  name: string,
): FlowField | undefined {
  return getInputNodes(nodes).find((f) => f.name === name);
}

/** Get all hidden input nodes (csrf_token, method, etc.) */
export function getHiddenFields(nodes: UiNode[]): FlowField[] {
  return getInputNodes(nodes).filter((f) => f.type === "hidden");
}

/** Get all submit button nodes */
export function getSubmitNodes(nodes: UiNode[]): FlowField[] {
  return getInputNodes(nodes).filter((f) => f.type === "submit");
}

/** Get all non-hidden, non-submit input nodes (the visible fields) */
export function getVisibleFields(nodes: UiNode[]): FlowField[] {
  return getInputNodes(nodes).filter(
    (f) => f.type !== "hidden" && f.type !== "submit",
  );
}

/** Get global flow messages (errors, info, success) */
export function getFlowMessages(messages?: UiText[]): UiText[] {
  return messages ?? [];
}
