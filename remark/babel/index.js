const babel = require("@babel/core");
const sourceCode = `
<h1>
    hello<span style={{ color: "red" }}>world</span>
</h1>
`;
const result = babel.transform(sourceCode, {
  plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]],
});

// { runtime: 'classic' }
// /*#__PURE__*/React.createElement("h1", null, "hello", /*#__PURE__*/React.createElement("span", {
//   style: {
//     color: "red"
//   }
// }, "world"));

// { runtime: "automatic" }
// import { jsx as _jsx } from "react/jsx-runtime";
// import { jsxs as _jsxs } from "react/jsx-runtime";
// /*#__PURE__*/_jsxs("h1", {
//   children: ["hello", /*#__PURE__*/_jsx("span", {
//     style: {
//       color: "red"
//     },
//     children: "world"
//   })]
// });

console.log(result.code);