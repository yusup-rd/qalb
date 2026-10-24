import { createContext, useContext, type ReactNode } from "react";

export const QuranReadinessContext = createContext(false);

// Expo SDK 57's SQLiteProvider ignores children in its memo comparison.
// Context updates reach this consumer even when the provider retains its child.
export default function QuranReadinessGate({
  children,
}: {
  children: ReactNode;
}) {
  const ready = useContext(QuranReadinessContext);
  return ready ? children : null;
}
