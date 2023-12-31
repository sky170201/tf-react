import { createRoot } from "react-dom/client";
import { useState, useReducer, useRef, forwardRef, useImperativeHandle, useEffect, useLayoutEffect, useMemo, useCallback, memo } from "./react";

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
    return <div>memoChild </div>;
});
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
    useEffect(() => {
        console.log("useEffect create");
        return () => {
            console.log("useEffect destory");
        };
    }, [count]);

    useLayoutEffect(() => {
        console.log("useLayoutEffect create");
        return () => {
            console.log("useLayoutEffect destory");
        };
    }, [count]);
    // const newCount = useMemo(() => {
    //   count * 3;
    // }, [count]);

    // const getName = useCallback(() => {
    //   console.log("getName");
    // }, []);

    return (
        <div>
            <button
                onClick={() => {
                    setCount(count + 1);
                }}
            >
                add {count}
            </button>
            {/* <MemoChild getName={getName} newCount={newCount} /> */}
        </div>
    );
};
const root = createRoot(document.getElementById("root"));
// console.log("root", root);
root.render(<App />);
