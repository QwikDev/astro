import { type PropsOf, component$, useStylesScoped$ } from "@builder.io/qwik";
import styles from "./squiggle.css?inline";

export const Squiggle = component$((props: PropsOf<"svg">) => {
  useStylesScoped$(styles);

  return (
    <svg
      width="587"
      height="31"
      viewBox="0 0 587 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-hidden="true"
    >
      <path
        d="M2.50147 10.4772C140.69 52.2251 165.072 6.01877 246.585 19.0008C328.098 31.9828 327.794 -2.77817 421.562 7.01197C496.576 14.8441 561.181 7.78511 584.107 3.27661"
        stroke={props.stroke ?? "#867CD8"}
        stroke-width={props["stroke-width"] ?? 3}
        stroke-linecap="round"
      />
    </svg>
  );
});
