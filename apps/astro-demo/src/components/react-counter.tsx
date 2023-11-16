/** @jsxImportSource react */
import { useState } from "react";

export const ReactCounter = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
