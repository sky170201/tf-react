import { createRoot } from "react-dom/client";
import { useState } from "./react";

const Child = (props) => {
  console.log("child count");
  return (
    <div>
      <p>child</p>
    </div>
  )
}

const App = () => {
  const [count, setCount] = useState(1);
  console.log("count", count);
  return (
    <div>
      <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => setCount(count + 1)}>div {count}</div>
      <Child />
    </div>
  );
};
console.log("<App/>", <App />);
const root = createRoot(document.getElementById("root"));
console.log("root", root);
root.render(<App />);
