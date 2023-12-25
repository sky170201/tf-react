import { createRoot } from "react-dom/client";
import { useState, useReducer, useRef, forwardRef, useImperativeHandle, useEffect } from "./react";

const Child = forwardRef((props, ref) => {
const inputRef = useRef()
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus()
  }))
  
  return (
    <div>
      <input placeholder="请输入" type="text" ref={inputRef} />
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
  const [count, setCount] = useState(1);
  // const [count, dispatch] = useReducer(reducer, 2)

  const divRef = useRef('App')
  useEffect(() => {
    // divRef.current?.remove()
    console.log('create')
    divRef.current?.focus()
    return () => {
      console.log('destory')
    }
  }, [count])

  return (
    <div>
      {/* <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => dispatch({type: 'add', payload: count+3})}>div {count}</div> */}
      <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => setCount(count+1)}>div {count}</div>
      {/* <div ref={divRef}>div元素</div> */}
      <Child ref={divRef} />
    </div>
  );
};
// console.log("<App/>", <App />, App());
const root = createRoot(document.getElementById("root"));
console.log("root", root);
root.render(<App />);
