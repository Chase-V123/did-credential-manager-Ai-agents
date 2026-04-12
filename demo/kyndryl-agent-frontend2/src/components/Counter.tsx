import { useState } from "react"


const Counter = () => {
    const [count, setCount] = useState<number>(-1)

    return (
        <>
            <h1> Count is {count}</h1>
            <button 
                onClick={() => setCount(prev => prev + 1)}>
                    Plus 1
            </button>
            <button
                onClick={() => setCount(prev => prev - 1)}>
                    Minus 1
            </button>
        </>
    )
}
export default Counter