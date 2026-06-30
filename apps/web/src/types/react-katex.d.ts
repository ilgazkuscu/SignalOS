declare module "react-katex" {
  import type { CSSProperties, ReactElement } from "react";

  export function BlockMath(props: {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactElement;
    className?: string;
    style?: CSSProperties;
  }): ReactElement;

  export function InlineMath(props: {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactElement;
    className?: string;
    style?: CSSProperties;
  }): ReactElement;
}
