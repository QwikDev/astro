import { component$ } from "@builder.io/qwik";
import { Counter } from "./components/counter";

const App = component$(() => {
  return (
    <div>
      <Counter />
    </div>
  );
});

export default App;
