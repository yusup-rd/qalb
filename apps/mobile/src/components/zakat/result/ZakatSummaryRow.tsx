import { Text, View } from "react-native";

interface SummaryRowProps {
  label: string;
  value: string;
  emphasized?: boolean;
  color?: "default" | "success" | "destructive";
}

const ZakatSummaryRow = ({
  label,
  value,
  emphasized = false,
  color = "default",
}: SummaryRowProps) => {
  const labelClassName =
    color === "success"
      ? "text-success"
      : color === "destructive"
        ? "text-destructive"
        : emphasized
          ? "text-foreground"
          : "text-muted-foreground";

  const valueClassName =
    color === "success"
      ? "text-success"
      : color === "destructive"
        ? "text-destructive"
        : "text-foreground";

  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text
        className={
          `${emphasized ? "font-sans-semibold" : "font-sans-regular"} ` +
          `${labelClassName} text-base`
        }
      >
        {label}
      </Text>

      <Text
        className={
          `${emphasized ? "font-sans-bold" : "font-sans-medium"} ` +
          `${valueClassName} text-base`
        }
      >
        {value}
      </Text>
    </View>
  );
};

export default ZakatSummaryRow;
