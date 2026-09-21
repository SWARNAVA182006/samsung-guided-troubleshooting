export interface BaseDeeplink {
  deeplink: string;
}

export interface Deeplink extends BaseDeeplink {
  description: string;
  message?: string;
  classes?: Record<string, string>;
  originalType?: string;
}

export interface ValidationDeepLink extends BaseDeeplink {
  key: string;
  resultType?: "boolean" | "integer" | "str" | "float";
  condition?: "greater" | "equal" | "less";
  value?: string;
}

export interface StepGroup {
  steps: string[];
  validationDeeplink?: ValidationDeepLink | null;
  actionableDeeplink?: Deeplink | null;
}

export interface Action {
  actionName: string;
  description: string;
  stepGroups: StepGroup[];
  category?: "auto" | "manual" | "critical";
}

export interface Goal {
  goal: string;
  title: string;
  actions: Action[];
  score: number;
}

export interface ContextDeeplinkResponse {
  contexts: Goal[];
}

export interface SIISPayload {
  title: string;
  content: string;
}

export interface TroubleshootRequest {
  query: string;
  siis_response: SIISPayload;
}

export type NavigationTab = "home" | "troubleshoot" | "history" | "how-it-works" | "settings";

export type ThemeMode = "dark" | "light" | "system";

export interface HistoryItem {
  id: string;
  timestamp: number;
  query: string;
  title: string;
  actionsCount: number;
  stepsCount: number;
  deeplinksCount: number;
  score: number;
  response: ContextDeeplinkResponse;
}

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "error";
  message: string;
}

export interface PresetCase {
  id: string;
  label: string;
  category: string;
  query: string;
  siis_response: SIISPayload;
}
