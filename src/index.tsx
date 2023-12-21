import { createRoot } from "react-dom/client";
import { useState, useReducer, useRef, forwardRef } from "./react";
import { useImperativeHandle } from "react";

const Child = forwardRef((props, ref) => {

  useImperativeHandle(ref, () => ({
    getName: () => 'candy'
  }))
  
  console.log("child count", props, ref);
  return (
    <div>
      <p>child</p>
    </div>
  )
})

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
  // const [count, setCount] = useState(1);
  // const [count, dispatch] = useReducer(reducer, 2)

  const divRef = useRef('App')
  setTimeout(() => {
    // divRef.current?.remove()
    console.log('divRef', divRef)
  }, 500)

  return (
    <div>
      {/* <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => dispatch({type: 'add', payload: count+3})}>div {count}</div> */}
      {/* <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => setCount(count+1)}>div {count}</div> */}
      {/* <div ref={divRef}>div元素</div> */}
      <Child ref={divRef} />
    </div>
  );
};
// console.log("<App/>", <App />, App());
const root = createRoot(document.getElementById("root"));
console.log("root", root);
root.render(<App />);
