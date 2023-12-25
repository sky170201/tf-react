import { createRoot } from "react-dom/client";
import {
  useState,
  useReducer,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  memo,
} from "./react";

const Child = forwardRef((props, ref) => {
  const { count, appRef, newCount, getName } = props;
  const inputRef = useRef();
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
  }));

  useEffect(() => {
    getName();
    console.log("newCount", newCount);
    console.log("Child create", appRef.current.remove());
    return () => {
      console.log("Child destory");
    };
  }, [count]);

  return (
    <div>
      <input placeholder="请输入" type="text" ref={inputRef} />
      <p>child</p>
    </div>
  );
});

const MemoChild: any = memo(() => {
  console.log("MemoChild render");
  return <div>memoChild</div>;
});
console.log("MemoChild", MemoChild);
const reducer = (state, action) => {
  switch (action.type) {
    case "add":
      return action.payload;
      break;
    default:
      break;
  }
};

const App = () => {
  const [count, setCount] = useState(1);
  const [count2, dispatch] = useReducer(reducer, 2);

  // const appRef = useRef()
  // const divRef = useRef('App')
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setCount(count + 1)
  //   }, 1000)
  //   // divRef.current?.remove()
  //   console.log('App create')
  //   // divRef.current?.focus()
  //   return () => {
  //     clearTimeout(timer)
  //     console.log('App destory')
  //   }
  // }, [count])

  // useEffect(() => {
  //   setCount(80)
  // }, [])

  // useLayoutEffect(() => {
  //   console.log('useLayoutEffect')
  //   // setCount(80)
  // }, [])
  const newCount = useMemo(() => {
    return count * 3;
  }, [count]);

  const getName = useCallback(() => {
    console.log("getName");
  }, []);

  return (
    <div>
      {/* <div style={{width: 80, height: 80, backgroundColor: 'rebeccapurple', transform: `translateX(${count}px)`,}}></div> */}
      {/* <div>{count}</div> */}
      <div
        style={{ margin: 30, backgroundColor: "Highlight" }}
        onClick={() => dispatch({ type: "add", payload: count2 + 3 })}
      >
        div {count2}
      </div>
      {/* <div style={{margin: 30, backgroundColor: 'Highlight'}} onClick={() => setCount(count+1)}>div {count}</div>
      <div ref={appRef}>App div元素</div>
      <Child ref={divRef} appRef={appRef} count={count} /> */}
      {/* <Child getName={getName} newCount={newCount} /> */}
      <MemoChild getName={getName} newCount={newCount} />
    </div>
  );
};
// console.log("<App/>", <App />, App());
const root = createRoot(document.getElementById("root"));
console.log("root", root);
root.render(<App />);
