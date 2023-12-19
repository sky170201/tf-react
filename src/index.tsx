import { createRoot } from 'react-dom/client'
import { useState } from './react'

const Jsx = () => {
  const [count, setCount] = useState(1)
  console.log('count', count)
  return (
    <div style={{margin: 30}}>
      <div>{count}</div>
      <button onClick={() => {
        setCount(count+1)
      }}>add</button>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<Jsx />)