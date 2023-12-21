import { createRoot } from "react-dom/client";
import { useState, useReducer } from "./react";

const Child = (props) => {
  console.log("child count");
  return (
    <div>
      <p>child</p>
    </div>
  )
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'add':
      return action.payload
      break;
    default:
      break;
  }
}

const App = () => {
  const [count, setCount] = useState(1);

  // const [count, dispatch] = useReducer(reducer, 2)
  console.log("App count", count);
  return (
    <div>
      {/* <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => dispatch({type: 'add', payload: count+3})}>div {count}</div> */}
      <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => setCount(count+1)}>div {count}</div>
      <Child />
    </div>
  );
};
console.log("<App/>", <App />);
const root = createRoot(document.getElementById("root"));
console.log("root", root);
root.render(<App />);
